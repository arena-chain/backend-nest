import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Video, VideoDocument } from './schema/video.schema';
import { VideoComment, VideoCommentDocument } from './schema/video-comment.schema';
import { VideoLike, VideoLikeDocument } from './schema/video-like.schema';
import {
  VideoCommentLike,
  VideoCommentLikeDocument,
} from './schema/video-comment-like.schema';

type CommentLean = {
  _id: Types.ObjectId;
  video: Types.ObjectId;
  author: unknown;
  body: string;
  parentComment: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class VideoEngagementService {
  constructor(
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectModel(VideoComment.name)
    private readonly commentModel: Model<VideoCommentDocument>,
    @InjectModel(VideoLike.name)
    private readonly likeModel: Model<VideoLikeDocument>,
    @InjectModel(VideoCommentLike.name)
    private readonly commentLikeModel: Model<VideoCommentLikeDocument>,
  ) {}

  private async loadVideoDoc(id: string): Promise<VideoDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid video ID');
    }
    const doc = await this.videoModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Video not found');
    return doc;
  }

  private assertCanAccess(
    video: VideoDocument,
    viewerUserId: string | undefined,
  ): void {
    if (video.channelVisibility === 'public') {
      return;
    }
    if (!viewerUserId) {
      throw new ForbiddenException('Sign in to view this private video');
    }
    if (video.uploader.toString() !== viewerUserId) {
      throw new ForbiddenException('You cannot access this private video');
    }
  }

  async getEngagement(videoId: string, viewerUserId?: string) {
    const video = await this.loadVideoDoc(videoId);
    this.assertCanAccess(video, viewerUserId);

    const vid = new Types.ObjectId(videoId);
    const [likeCount, commentCount, likedByMe] = await Promise.all([
      this.likeModel.countDocuments({ video: vid }).exec(),
      this.commentModel.countDocuments({ video: vid }).exec(),
      viewerUserId
        ? this.likeModel
            .exists({ video: vid, user: new Types.ObjectId(viewerUserId) })
            .exec()
        : Promise.resolve(null),
    ]);

    return {
      likeCount,
      commentCount,
      likedByMe: Boolean(likedByMe),
    };
  }

  private serializeCommentDoc(c: CommentLean) {
    return {
      _id: c._id.toString(),
      video: c.video.toString(),
      body: c.body,
      author: c.author,
      parentComment: c.parentComment ? c.parentComment.toString() : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async listComments(videoId: string, viewerUserId?: string) {
    const video = await this.loadVideoDoc(videoId);
    this.assertCanAccess(video, viewerUserId);

    const vid = new Types.ObjectId(videoId);
    const rows = (await this.commentModel
      .find({ video: vid })
      .sort({ createdAt: -1 })
      .populate('author', 'nickname email')
      .lean()
      .exec()) as unknown as CommentLean[];

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((r) => r._id);
    const [agg, mineRows] = await Promise.all([
      this.commentLikeModel
        .aggregate<{ _id: Types.ObjectId; likeCount: number }>([
          { $match: { comment: { $in: ids } } },
          { $group: { _id: '$comment', likeCount: { $sum: 1 } } },
        ])
        .exec(),
      viewerUserId
        ? this.commentLikeModel
            .find({
              comment: { $in: ids },
              user: new Types.ObjectId(viewerUserId),
            })
            .select('comment')
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    const countMap = new Map(
      agg.map((a) => [a._id.toString(), a.likeCount]),
    );
    const mySet = new Set(
      mineRows.map((m) => (m as { comment: Types.ObjectId }).comment.toString()),
    );

    const enriched = rows.map((c) => ({
      ...this.serializeCommentDoc(c),
      likeCount: countMap.get(c._id.toString()) ?? 0,
      likedByMe: mySet.has(c._id.toString()),
    }));

    const roots = enriched.filter((c) => !c.parentComment);
    const replyList = enriched.filter((c) => c.parentComment);
    const repliesByParent = new Map<string, typeof enriched>();
    for (const r of replyList) {
      const pid = r.parentComment as string;
      const list = repliesByParent.get(pid) ?? [];
      list.push(r);
      repliesByParent.set(pid, list);
    }
    for (const [, list] of repliesByParent) {
      list.sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() -
          new Date(b.createdAt ?? 0).getTime(),
      );
    }
    roots.sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    );

    return roots.map((r) => ({
      ...r,
      replies: repliesByParent.get(r._id) ?? [],
    }));
  }

  async addComment(
    videoId: string,
    authorUserId: string,
    body: string,
    parentCommentId?: string,
  ) {
    const video = await this.loadVideoDoc(videoId);
    this.assertCanAccess(video, authorUserId);

    let parentComment: Types.ObjectId | null = null;
    if (parentCommentId) {
      if (!Types.ObjectId.isValid(parentCommentId)) {
        throw new BadRequestException('Invalid parent comment ID');
      }
      const parent = await this.commentModel.findById(parentCommentId).exec();
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.video.toString() !== videoId) {
        throw new BadRequestException('Parent comment belongs to another video');
      }
      if (parent.parentComment) {
        throw new BadRequestException(
          'You can only reply to a top-level comment',
        );
      }
      parentComment = parent._id as Types.ObjectId;
    }

    const created = await this.commentModel.create({
      video: new Types.ObjectId(videoId),
      author: new Types.ObjectId(authorUserId),
      body: body.trim(),
      parentComment,
    });
    const populated = await created.populate('author', 'nickname email');
    return {
      _id: populated._id.toString(),
      video: populated.video.toString(),
      body: populated.body,
      author: populated.get('author'),
      parentComment: populated.parentComment
        ? populated.parentComment.toString()
        : null,
      createdAt: populated.get('createdAt'),
      updatedAt: populated.get('updatedAt'),
      likeCount: 0,
      likedByMe: false,
      replies: [],
    };
  }

  async like(videoId: string, userId: string) {
    const video = await this.loadVideoDoc(videoId);
    this.assertCanAccess(video, userId);

    const vid = new Types.ObjectId(videoId);
    const uid = new Types.ObjectId(userId);
    try {
      await this.likeModel.create({ video: vid, user: uid });
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code !== 11000) throw e;
    }
    const likeCount = await this.likeModel.countDocuments({ video: vid }).exec();
    return { liked: true, likeCount };
  }

  async unlike(videoId: string, userId: string) {
    const video = await this.loadVideoDoc(videoId);
    this.assertCanAccess(video, userId);

    const vid = new Types.ObjectId(videoId);
    const uid = new Types.ObjectId(userId);
    await this.likeModel.deleteOne({ video: vid, user: uid }).exec();
    const likeCount = await this.likeModel.countDocuments({ video: vid }).exec();
    return { liked: false, likeCount };
  }

  private async loadCommentForEngagement(commentId: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }
    const doc = await this.commentModel.findById(commentId).exec();
    if (!doc) throw new NotFoundException('Comment not found');
    return doc;
  }

  async likeComment(commentId: string, userId: string) {
    const doc = await this.loadCommentForEngagement(commentId);
    const video = await this.loadVideoDoc(doc.video.toString());
    this.assertCanAccess(video, userId);

    const cid = new Types.ObjectId(commentId);
    const uid = new Types.ObjectId(userId);
    try {
      await this.commentLikeModel.create({ comment: cid, user: uid });
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code !== 11000) throw e;
    }
    const likeCount = await this.commentLikeModel
      .countDocuments({ comment: cid })
      .exec();
    return { liked: true, likeCount };
  }

  async unlikeComment(commentId: string, userId: string) {
    const doc = await this.loadCommentForEngagement(commentId);
    const video = await this.loadVideoDoc(doc.video.toString());
    this.assertCanAccess(video, userId);

    const cid = new Types.ObjectId(commentId);
    const uid = new Types.ObjectId(userId);
    await this.commentLikeModel.deleteOne({ comment: cid, user: uid }).exec();
    const likeCount = await this.commentLikeModel
      .countDocuments({ comment: cid })
      .exec();
    return { liked: false, likeCount };
  }

  async deleteComment(commentId: string, requesterUserId: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }
    const doc = await this.commentModel.findById(commentId).exec();
    if (!doc) throw new NotFoundException('Comment not found');
    if (doc.author.toString() !== requesterUserId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    const video = await this.loadVideoDoc(doc.video.toString());
    this.assertCanAccess(video, requesterUserId);

    const replyIds = await this.commentModel
      .find({ parentComment: doc._id })
      .select('_id')
      .lean()
      .exec();

    const allIds = [doc._id, ...replyIds.map((r) => r._id)];
    await this.commentLikeModel.deleteMany({ comment: { $in: allIds } }).exec();
    await this.commentModel.deleteMany({ parentComment: doc._id }).exec();
    await this.commentModel.deleteOne({ _id: doc._id }).exec();

    return { message: 'Comment deleted' };
  }
}
