import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import {
  Highlight,
  HighlightDocument,
  HighlightVisibility,
} from './schemas/highlight.schema';
import { Video, VideoDocument } from '../video/schema/video.schema';

export type HighlightSelectionMode = 'top_k' | 'threshold' | 'all';

export interface HighlightGenerationOptions {
  visibility?: HighlightVisibility;
  selectionMode?: HighlightSelectionMode;
  topK?: number;
  minScore?: number;
  minGapSec?: number;
  clipDurationSec?: number;
  maxTotalSec?: number;
  fullScan?: boolean;
}

interface HighlightCandidate {
  start: number;
  duration: number;
  score: number;
  components: {
    scene: number;
    audio: number;
    motion: number;
  };
}

interface HighlightSelectionDebugItem extends HighlightCandidate {
  end: number;
  selected: boolean;
  reason: string;
}

export interface HighlightAnalysisResult {
  selected: HighlightCandidate[];
  debug: {
    videoDurationSec: number;
    candidateCount: number;
    selectedCount: number;
    selectionMode: HighlightSelectionMode;
    topK: number;
    minScore: number;
    minGapSec: number;
    clipDurationSec: number;
    fullScan: boolean;
    dropReasons: Record<string, number>;
    items: HighlightSelectionDebugItem[];
  };
}

@Injectable()
export class HighlightsService {
  constructor(
    @InjectModel(Highlight.name)
    private readonly highlightModel: Model<HighlightDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
  ) {}

  /**
   * Multer stores URLs like `/uploads/videos/file.mp4`. On Unix, that string is
   * `path.isAbsolute` true, but it is NOT a filesystem root path — FFmpeg must
   * read under `process.cwd()/uploads/...`.
   */
  private resolveVideoPathForFfmpeg(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      const relative = url.startsWith('/') ? url.slice(1) : url;
      return path.join(process.cwd(), relative);
    }
    if (path.isAbsolute(url)) {
      return url;
    }
    return path.join(process.cwd(), url);
  }

  // Generate a clip using FFmpeg
  async generateClip(
    inputPath: string,
    start: number,
    duration: number,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(duration)
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private async probeDurationSec(inputPath: string): Promise<number | null> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          resolve(null);
          return;
        }
        const formatDuration = Number(metadata?.format?.duration ?? 0);
        if (Number.isFinite(formatDuration) && formatDuration > 0) {
          resolve(Math.floor(formatDuration));
          return;
        }
        const streamDuration = Number(
          metadata?.streams?.find((s) => s.codec_type === 'video')?.duration ?? 0,
        );
        if (Number.isFinite(streamDuration) && streamDuration > 0) {
          resolve(Math.floor(streamDuration));
          return;
        }
        resolve(null);
      });
    });
  }

  private overlapRatio(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ): number {
    const inter = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
    const aLen = Math.max(1, aEnd - aStart);
    return inter / aLen;
  }

  private async runFfmpegAnalysis(
    inputPath: string,
    args: string[],
    timeoutMs = 90_000,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', ['-hide_banner', '-i', inputPath, ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
      }, timeoutMs);
      proc.stdout.on('data', (d: Buffer) => {
        out += d.toString();
      });
      proc.stderr.on('data', (d: Buffer) => {
        err += d.toString();
      });
      proc.on('error', (spawnErr) => {
        clearTimeout(timer);
        reject(spawnErr);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        // FFmpeg can return non-zero on null muxers while still printing analyzable output.
        if (code !== 0 && !err && !out) {
          reject(new Error(`ffmpeg analysis failed with exit code ${code}`));
          return;
        }
        resolve(`${out}\n${err}`);
      });
    });
  }

  private parsePtsTimes(log: string): number[] {
    const times: number[] = [];
    const regex = /pts_time:([0-9]+(?:\.[0-9]+)?)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(log)) !== null) {
      const t = Number(m[1]);
      if (Number.isFinite(t)) times.push(t);
    }
    return times;
  }

  private async getSceneMoments(
    inputPath: string,
    threshold: number,
    fullScan: boolean,
  ): Promise<number[]> {
    const fps = fullScan ? 2 : 1;
    const vf = `select='gt(scene,${threshold.toFixed(2)})',showinfo`;
    const log = await this.runFfmpegAnalysis(inputPath, [
      '-vf',
      `fps=${fps},${vf}`,
      '-an',
      '-f',
      'null',
      '-',
    ]);
    return this.parsePtsTimes(log);
  }

  private async getAudioLevels(
    inputPath: string,
    fullScan: boolean,
  ): Promise<{ t: number; v: number }[]> {
    const reset = fullScan ? 40 : 80;
    const log = await this.runFfmpegAnalysis(inputPath, [
      '-vn',
      '-af',
      `astats=metadata=1:reset=${reset},ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`,
      '-f',
      'null',
      '-',
    ]);
    const rows: { t: number; v: number }[] = [];
    let currentTime: number | null = null;
    for (const line of log.split('\n')) {
      const tMatch = line.match(/pts_time:([0-9]+(?:\.[0-9]+)?)/);
      if (tMatch) {
        currentTime = Number(tMatch[1]);
      }
      const rmsMatch = line.match(/lavfi\.astats\.Overall\.RMS_level=([-0-9.]+)/);
      if (rmsMatch && currentTime !== null) {
        const db = Number(rmsMatch[1]);
        if (!Number.isFinite(db)) continue;
        // Normalize dB range roughly [-60, 0] to [0, 1].
        const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
        rows.push({ t: currentTime, v: normalized });
      }
    }
    return rows;
  }

  private countInRange(points: number[], start: number, end: number): number {
    let c = 0;
    for (const p of points) {
      if (p >= start && p <= end) c++;
    }
    return c;
  }

  private maxAudioInRange(
    levels: { t: number; v: number }[],
    start: number,
    end: number,
  ): number {
    let m = 0;
    for (const s of levels) {
      if (s.t >= start && s.t <= end && s.v > m) m = s.v;
    }
    return m;
  }

  async detectHighlights(
    video: VideoDocument,
    inputPath: string,
    existingRanges: { start: number; end: number }[] = [],
    options?: HighlightGenerationOptions,
  ): Promise<HighlightAnalysisResult> {
    const probedDuration = await this.probeDurationSec(inputPath);
    const durationSec = Math.max(
      30,
      Math.floor(video.duration || probedDuration || 120),
    );
    const clipDuration = Math.min(
      30,
      Math.max(
        6,
        Math.floor(options?.clipDurationSec ?? Math.floor(durationSec / 12)),
      ),
    );
    const maxStart = Math.max(0, durationSec - clipDuration);
    const fullScan = options?.fullScan !== false;
    const stepBase = Math.max(3, Math.floor(clipDuration / 2));
    // In partial mode, stride is larger (faster but less precise).
    const step = fullScan ? stepBase : Math.max(stepBase, clipDuration);
    const selectionMode = options?.selectionMode ?? 'top_k';
    const topK = Math.max(1, Math.floor(options?.topK ?? 3));
    const minScore = Math.max(0, Math.min(1, options?.minScore ?? 0.7));
    const minGapSec = Math.max(1, Math.floor(options?.minGapSec ?? 8));
    const maxTotalSec =
      options?.maxTotalSec && options.maxTotalSec > 0
        ? Math.floor(options.maxTotalSec)
        : Number.POSITIVE_INFINITY;

    let sceneCuts: number[] = [];
    let motionBursts: number[] = [];
    let audioLevels: { t: number; v: number }[] = [];
    try {
      [sceneCuts, motionBursts, audioLevels] = await Promise.all([
        this.getSceneMoments(inputPath, 0.4, fullScan),
        // Lower threshold catches camera/motion bursts (proxy for action intensity).
        this.getSceneMoments(inputPath, 0.16, fullScan),
        this.getAudioLevels(inputPath, fullScan),
      ]);
    } catch {
      // Fallback if ffmpeg analysis times out/fails: keep pipeline alive.
      sceneCuts = [];
      motionBursts = [];
      audioLevels = [];
    }

    const sceneNorm = Math.max(1, sceneCuts.length);
    const motionNorm = Math.max(1, motionBursts.length);

    const candidates: HighlightCandidate[] = [];

    // Build event anchors from scene/audio/motion so windows are centered on events,
    // not only uniform sequential slices.
    const highAudioMoments = audioLevels.filter((a) => a.v >= 0.65).map((a) => a.t);
    const anchors = [...sceneCuts, ...motionBursts, ...highAudioMoments]
      .map((t) => Math.max(0, Math.min(maxStart, Math.floor(t - clipDuration / 2))))
      .sort((a, b) => a - b);
    const dedupedAnchors: number[] = [];
    for (const a of anchors) {
      if (
        dedupedAnchors.length === 0 ||
        Math.abs(a - dedupedAnchors[dedupedAnchors.length - 1]) >=
          Math.max(4, Math.floor(minGapSec / 2))
      ) {
        dedupedAnchors.push(a);
      }
    }

    const startPoints =
      dedupedAnchors.length > 0
        ? dedupedAnchors
        : Array.from({ length: Math.floor(maxStart / step) + 1 }, (_, i) => i * step);

    for (const s of startPoints) {
      const e = s + clipDuration;
      const overlapsOld = existingRanges.some(
        (r) => this.overlapRatio(s, e, r.start, r.end) > 0.35,
      );
      if (!overlapsOld) {
        const sceneInWindow = this.countInRange(sceneCuts, s, e) / sceneNorm;
        const motionInWindow = this.countInRange(motionBursts, s, e) / motionNorm;
        const audioInWindow = this.maxAudioInRange(audioLevels, s, e);
        const fallbackBase = sceneCuts.length + motionBursts.length > 0 ? 0 : 0.5;
        const score = Math.max(
          0,
          Math.min(
            1,
            sceneInWindow * 0.5 +
              audioInWindow * 0.2 +
              motionInWindow * 0.3 +
              fallbackBase * 0.1,
          ),
        );
        candidates.push({
          start: s,
          duration: clipDuration,
          score,
          components: {
            scene: sceneInWindow,
            audio: audioInWindow,
            motion: motionInWindow,
          },
        });
      }
    }

    // Fallback: if everything overlaps, still allow candidates.
    const pool: HighlightCandidate[] =
      candidates.length >= 3
        ? candidates
        : Array.from({ length: Math.floor(maxStart / step) + 1 }, (_, i) => ({
            start: i * step,
            duration: clipDuration,
            score: 0.45,
            components: {
              scene: 0.15,
              audio: 0.15,
              motion: 0.15,
            },
          }));

    const ranked = [...pool].sort((a, b) => b.score - a.score);

    const picked: HighlightCandidate[] = [];
    const debugItems: HighlightSelectionDebugItem[] = [];
    const dropReasons: Record<string, number> = {};
    let usedTotalSec = 0;
    for (const c of ranked) {
      const cEnd = c.start + c.duration;
      const clashesWithPicked = picked.some((p) => {
        const pEnd = p.start + p.duration;
        if (Math.abs(c.start - p.start) < minGapSec) return true;
        return this.overlapRatio(c.start, cEnd, p.start, pEnd) > 0.3;
      });
      if (clashesWithPicked) {
        dropReasons.overlap = (dropReasons.overlap ?? 0) + 1;
        debugItems.push({
          ...c,
          end: cEnd,
          selected: false,
          reason: 'overlap_or_gap',
        });
        continue;
      }

      if (selectionMode === 'threshold' && c.score < minScore) {
        dropReasons.score = (dropReasons.score ?? 0) + 1;
        debugItems.push({
          ...c,
          end: cEnd,
          selected: false,
          reason: 'below_score_threshold',
        });
        continue;
      }
      if (selectionMode === 'top_k' && picked.length >= topK) break;
      if (usedTotalSec + c.duration > maxTotalSec) {
        dropReasons.maxTotalSec = (dropReasons.maxTotalSec ?? 0) + 1;
        debugItems.push({
          ...c,
          end: cEnd,
          selected: false,
          reason: 'exceeds_max_total_seconds',
        });
        continue;
      }

      picked.push(c);
      usedTotalSec += c.duration;
      debugItems.push({
        ...c,
        end: cEnd,
        selected: true,
        reason: 'selected',
      });
    }

    if (selectionMode === 'top_k' && picked.length < topK) {
      for (const c of ranked) {
        if (picked.length >= topK) break;
        const already = picked.some((p) => p.start === c.start);
        if (already) continue;
        if (usedTotalSec + c.duration > maxTotalSec) continue;
        picked.push(c);
        usedTotalSec += c.duration;
        debugItems.push({
          ...c,
          end: c.start + c.duration,
          selected: true,
          reason: 'selected_fallback',
        });
      }
    }

    const selected = selectionMode === 'top_k' ? picked.slice(0, topK) : picked;
    return {
      selected:
        selectionMode === 'all'
          ? selected.sort((a, b) => b.score - a.score)
          : selected.sort((a, b) => a.start - b.start),
      debug: {
        videoDurationSec: durationSec,
        candidateCount: pool.length,
        selectedCount: selected.length,
        selectionMode,
        topK,
        minScore,
        minGapSec,
        clipDurationSec: clipDuration,
        fullScan,
        dropReasons,
        items: debugItems.sort((a, b) => b.score - a.score),
      },
    };
  }

  // Process video: detect + generate + save highlights
  async processVideo(
    video: VideoDocument,
    uploaderId: string,
    options?: HighlightGenerationOptions,
  ) {
    const videoId = video._id;
    const visibility = options?.visibility ?? HighlightVisibility.PRIVATE;
    const existing = await this.highlightModel
      .find({ video: videoId })
      .select('startTime endTime')
      .lean()
      .exec();
    const existingRanges = existing.map((h) => ({
      start: Number(h.startTime || 0),
      end: Number(h.endTime || 0),
    }));

    const inputPath = this.resolveVideoPathForFfmpeg(video.url);
    const analysis = await this.detectHighlights(
      video,
      inputPath,
      existingRanges,
      options,
    );
    const highlights = analysis.selected;

    const clipsDir = path.join(process.cwd(), 'uploads', 'clips');
    fs.mkdirSync(clipsDir, { recursive: true });

    for (let i = 0; i < highlights.length; i++) {
      const h = highlights[i];
      const fileName = `${videoId.toString()}_${Date.now()}_${i}.mp4`;
      const outputPath = path.join(clipsDir, fileName);
      const clipUrl = path.posix.join('uploads', 'clips', fileName);

      await this.generateClip(inputPath, h.start, h.duration, outputPath);

      await this.highlightModel.create({
        title: `Highlight ${i + 1}`,
        video: videoId,
        startTime: h.start,
        endTime: h.start + h.duration,
        creator: new Types.ObjectId(uploaderId),
        clipUrl,
        visibility,
      });
    }
  }

  /** Load video from DB then run highlight pipeline (for HTTP handlers / worker). */
  async processVideoById(
    videoId: string,
    uploaderId: string,
    options?: HighlightGenerationOptions,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(videoId))
      throw new BadRequestException('Invalid video ID');
    if (!Types.ObjectId.isValid(uploaderId))
      throw new BadRequestException('Invalid uploader ID');

    const video = await this.videoModel.findById(videoId).exec();
    if (!video) throw new NotFoundException('Video not found');

    await this.processVideo(video, uploaderId, options);
  }

  async debugAnalyzeVideoById(videoId: string, options?: HighlightGenerationOptions) {
    if (!Types.ObjectId.isValid(videoId))
      throw new BadRequestException('Invalid video ID');
    const video = await this.videoModel.findById(videoId).exec();
    if (!video) throw new NotFoundException('Video not found');
    const existing = await this.highlightModel
      .find({ video: video._id })
      .select('startTime endTime')
      .lean()
      .exec();
    const existingRanges = existing.map((h) => ({
      start: Number(h.startTime || 0),
      end: Number(h.endTime || 0),
    }));
    const inputPath = this.resolveVideoPathForFfmpeg(video.url);
    return this.detectHighlights(video, inputPath, existingRanges, options);
  }

  // CRUD operations

  async create(data: Partial<Highlight>): Promise<Highlight> {
    if (
      data.startTime === undefined ||
      data.endTime === undefined ||
      data.startTime >= data.endTime
    ) {
      throw new BadRequestException('Start time must be less than end time');
    }
    if (data.video === undefined || data.creator === undefined) {
      throw new BadRequestException('video and creator are required');
    }
    if (!data.clipUrl) {
      throw new BadRequestException(
        'clipUrl is required for manual highlight creation',
      );
    }
    const highlight = new this.highlightModel({
      ...data,
      video: new Types.ObjectId(String(data.video)),
      creator: new Types.ObjectId(String(data.creator)),
      visibility: data.visibility ?? HighlightVisibility.PRIVATE,
    });
    return highlight.save();
  }

  async findAll(): Promise<Highlight[]> {
    return this.highlightModel
      .find()
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** Feed / discovery: only public highlights */
  async findPublic(): Promise<Highlight[]> {
    return this.highlightModel
      .find({ visibility: HighlightVisibility.PUBLIC })
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Highlight> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid highlight ID');

    const doc = await this.highlightModel
      .findById(id)
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .exec();
    if (!doc) throw new BadRequestException('Highlight not found');
    return doc;
  }

  async findByVideo(
    videoId: string,
    opts?: { publicOnly?: boolean },
  ): Promise<Highlight[]> {
    if (!Types.ObjectId.isValid(videoId))
      throw new BadRequestException('Invalid video ID');

    const filter: Record<string, unknown> = {
      video: new Types.ObjectId(videoId),
    };
    if (opts?.publicOnly) {
      filter.visibility = HighlightVisibility.PUBLIC;
    }

    return this.highlightModel
      .find(filter)
      .populate('creator', 'username email avatar')
      .sort({ startTime: 1 })
      .exec();
  }

  async updateVisibility(
    highlightId: string,
    requesterUserId: string,
    visibility: HighlightVisibility,
  ): Promise<Highlight> {
    if (!Types.ObjectId.isValid(highlightId))
      throw new BadRequestException('Invalid highlight ID');

    const doc = await this.highlightModel.findById(highlightId).exec();
    if (!doc) throw new NotFoundException('Highlight not found');

    const creatorId = doc.creator.toString();
    if (creatorId !== requesterUserId) {
      throw new BadRequestException('Only the creator can change visibility');
    }

    doc.visibility = visibility;
    return doc.save();
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid highlight ID');

    const result = await this.highlightModel.findByIdAndDelete(id).exec();
    if (!result) throw new BadRequestException('Highlight not found');
    return { message: 'Highlight deleted successfully' };
  }

  async removeForOwner(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid highlight ID');

    const doc = await this.highlightModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Highlight not found');
    if (doc.creator.toString() !== userId) {
      throw new ForbiddenException(
        'Only the creator can delete this highlight',
      );
    }
    return this.remove(id);
  }

  async updateDetails(
    highlightId: string,
    requesterUserId: string,
    patch: { title?: string; description?: string },
  ): Promise<Highlight> {
    if (!Types.ObjectId.isValid(highlightId))
      throw new BadRequestException('Invalid highlight ID');

    const doc = await this.highlightModel.findById(highlightId).exec();
    if (!doc) throw new NotFoundException('Highlight not found');
    if (doc.creator.toString() !== requesterUserId) {
      throw new ForbiddenException('Only the creator can edit this highlight');
    }

    if (patch.title !== undefined) doc.title = patch.title;
    if (patch.description !== undefined) doc.description = patch.description;
    return doc.save();
  }
}
