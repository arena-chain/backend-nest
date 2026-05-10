import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type ClassifierJson = {
  ok?: boolean;
  gaming?: boolean;
  score?: number;
  error?: string;
};

@Injectable()
export class GamingVideoClassifierService {
  private readonly logger = new Logger(GamingVideoClassifierService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * When GAMING_VIDEO_CHECK_ENABLED=true, runs the PyTorch CLIP script on disk.
   * Rejects non-gaming uploads and deletes the uploaded file.
   */
  async assertGamingVideo(filePath: string): Promise<void> {
    const enabled =
      this.config.get<string>('GAMING_VIDEO_CHECK_ENABLED') === 'true';
    if (!enabled) {
      return;
    }

    const configuredPython = this.config.get<string>('GAMING_VIDEO_PYTHON');
    const defaultVenvPython = path.resolve(
      process.cwd(),
      '..',
      'gaming-video-classifier',
      '.venv',
      process.platform === 'win32' ? 'Scripts\\python.exe' : 'bin/python3',
    );
    const python =
      configuredPython && configuredPython.trim() !== ''
        ? configuredPython
        : fs.existsSync(defaultVenvPython)
          ? defaultVenvPython
          : 'python3';
    const scriptPath =
      this.config.get<string>('GAMING_VIDEO_CLASSIFIER_SCRIPT') ??
      path.resolve(
        process.cwd(),
        '..',
        'gaming-video-classifier',
        'classify_video.py',
      );
    const minScoreRaw = this.config.get<string>('GAMING_VIDEO_MIN_SCORE');
    const minScore =
      minScoreRaw !== undefined && minScoreRaw !== ''
        ? Number(minScoreRaw)
        : 0.5;
    const safeMin =
      Number.isFinite(minScore) && minScore >= 0 && minScore <= 1
        ? minScore
        : 0.5;

    if (!fs.existsSync(scriptPath)) {
      this.logger.error(`Gaming classifier script not found: ${scriptPath}`);
      throw new ServiceUnavailableException(
        'Gaming video check is enabled but the classifier script is missing on the server.',
      );
    }

    let stdout = '';
    let stderr = '';

    // Build args — pass local model dir if configured so the script never
    // downloads from HuggingFace at upload time (one-time pre-cache is enough).
    const modelDir = this.config.get<string>('GAMING_VIDEO_MODEL_DIR') ?? '';
    const scriptArgs = [
      scriptPath,
      '--video',
      filePath,
      '--min-score',
      String(safeMin),
    ];
    if (modelDir.trim()) {
      scriptArgs.push('--local-model-dir', modelDir.trim());
    }

    // Pass the env var too so the Python fallback inside the script also picks it up.
    const childEnv = modelDir.trim()
      ? { ...process.env, GAMING_VIDEO_MODEL_DIR: modelDir.trim() }
      : process.env;

    try {
      const result = await execFileAsync(python, scriptArgs, {
        timeout: 60_000,           // 60 s — should be <10 s with local cache
        maxBuffer: 32 * 1024 * 1024,
        env: childEnv,
      });
      stdout = result.stdout?.toString() ?? '';
      stderr = result.stderr?.toString() ?? '';
    } catch (err: unknown) {
      const e = err as {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
        code?: number | string;
        message?: string;
      };
      // stdout/stderr may be Buffer or string depending on Node version
      stdout =
        e.stdout instanceof Buffer
          ? e.stdout.toString('utf8')
          : (e.stdout as string | undefined) ?? '';
      stderr =
        e.stderr instanceof Buffer
          ? e.stderr.toString('utf8')
          : (e.stderr as string | undefined) ?? '';

      const parsed = this.parseClassifierJson(stdout);

      // Exit code 4 = script ran successfully but video is NOT gaming
      // (sys.exit(0 if gaming else 4) at end of classify_video.py)
      const exitCode = Number(e.code);
      if (
        (exitCode === 4 || (parsed?.ok === true && parsed.gaming === false))
      ) {
        this.safeUnlink(filePath);
        const confidence = parsed?.score?.toFixed?.(3) ?? '?';
        throw new BadRequestException(
          `Ce contenu ne semble pas être une vidéo de gaming (confiance ${confidence} ; minimum requis : ${safeMin}). Seules les vidéos de jeux vidéo sont acceptées.`,
        );
      }

      this.logger.warn(
        `Classifier exited with code=${e.code}: ${e.message ?? err}; stderr=${stderr.slice(0, 500)}`,
      );
      this.safeUnlink(filePath);
      throw new ServiceUnavailableException(
        parsed?.error
          ? `Could not classify video: ${parsed.error}`
          : 'Could not classify video. Ensure Python, PyTorch, and dependencies are installed.',
      );
    }

    if (stderr) {
      this.logger.debug(`Classifier stderr: ${stderr.slice(0, 800)}`);
    }

    const parsed = this.parseClassifierJson(stdout);
    if (!parsed || parsed.ok !== true) {
      this.safeUnlink(filePath);
      throw new ServiceUnavailableException(
        'Video classifier returned an unexpected response.',
      );
    }
    if (parsed.gaming !== true) {
      this.safeUnlink(filePath);
      const confidence = parsed.score?.toFixed?.(3) ?? '?';
      throw new BadRequestException(
        `Ce contenu ne semble pas être une vidéo de gaming (confiance ${confidence} ; minimum requis : ${safeMin}). Seules les vidéos de jeux vidéo sont acceptées.`,
      );
    }
  }

  private parseClassifierJson(stdout: string): ClassifierJson | null {
    const t = stdout.trim();
    if (!t) {
      return null;
    }
    const lines = t.split('\n').filter((s) => s.trim().length > 0);
    const last = lines[lines.length - 1] ?? t;
    try {
      return JSON.parse(last) as ClassifierJson;
    } catch {
      return null;
    }
  }

  private safeUnlink(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch {
      this.logger.warn(`Could not delete rejected upload: ${filePath}`);
    }
  }
}
