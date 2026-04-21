import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Highlight,
  HighlightDocument,
  HighlightVisibility,
} from './schemas/highlight.schema';
import {
  HighlightComment,
  HighlightCommentDocument,
} from './schemas/highlight-comment.schema';
import {
  HighlightLike,
  HighlightLikeDocument,
} from './schemas/highlight-like.schema';
import {
  HighlightCommentLike,
  HighlightCommentLikeDocument,
} from './schemas/highlight-comment-like.schema';

type CommentLean = {
  _id: Types.ObjectId;
  highlight: Types.ObjectId;
  author: unknown;
  body: string;
  parentComment: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class HighlightsEngagementService {
  constructor(
    @InjectModel(Highlight.name)
    private readonly highlightModel: Model<HighlightDocument>,
    @InjectModel(HighlightComment.name)
    private readonly commentModel: Model<HighlightCommentDocument>,
    @InjectModel(HighlightLike.name)
    private readonly likeModel: Model<HighlightLikeDocument>,
    @InjectModel(HighlightCommentLike.name)
    private readonly commentLikeModel: Model<HighlightCommentLikeDocument>,
  ) {}

  private async loadHighlightDoc(id: string): Promise<HighlightDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid highlight ID');
    }
    const doc = await this.highlightModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Highlight not found');
    return doc;
  }

  /** Who may read engagement / comments / post likes & comments */
  private assertCanAccess(
    highlight: HighlightDocument,
    viewerUserId: string | undefined,
  ): void {
    if (highlight.visibility === HighlightVisibility.PUBLIC) {
      return;
    }
    if (!viewerUserId) {
      throw new ForbiddenException('Sign in to view this private highlight');
    }
    if (highlight.creator.toString() !== viewerUserId) {
      throw new ForbiddenException('You cannot access this private highlight');
    }
  }

  async getEngagement(highlightId: string, viewerUserId?: string) {
    const highlight = await this.loadHighlightDoc(highlightId);
    this.assertCanAccess(highlight, viewerUserId);

    const hid = new Types.ObjectId(highlightId);
    const [likeCount, commentCount, likedByMe] = await Promise.all([
      this.likeModel.countDocuments({ highlight: hid }).exec(),
      this.commentModel.countDocuments({ highlight: hid }).exec(),
      viewerUserId
        ? this.likeModel
            .exists({ highlight: hid, user: new Types.ObjectId(viewerUserId) })
            .exec()
        : Promise.resolve(null),
    ]);

    const savedBy = highlight.savedBy ?? [];
    const saveCount = savedBy.length;
    const savedByMe = Boolean(
      viewerUserId && savedBy.some((id) => id.toString() === viewerUserId),
    );

    return {
      likeCount,
      commentCount,
      likedByMe: Boolean(likedByMe),
      saveCount,
      savedByMe,
    };
  }

  async saveHighlight(highlightId: string, userId: string) {
    const highlight = await this.loadHighlightDoc(highlightId);
    this.assertCanAccess(highlight, userId);
    await this.highlightModel
      .updateOne(
        { _id: new Types.ObjectId(highlightId) },
        { $addToSet: { savedBy: new Types.ObjectId(userId) } },
      )
      .exec();
    return this.getEngagement(highlightId, userId);
  }

  async unsaveHighlight(highlightId: string, userId: string) {
    const highlight = await this.loadHighlightDoc(highlightId);
    this.assertCanAccess(highlight, userId);
    await this.highlightModel
      .updateOne(
        { _id: new Types.ObjectId(highlightId) },
        { $pull: { savedBy: new Types.ObjectId(userId) } },
      )
      .exec();
    return this.getEngagement(highlightId, userId);
  }

  private serializeCommentDoc(c: CommentLean) {
    return {
      _id: c._id.toString(),
      highlight: c.highlight.toString(),
      body: c.body,
      author: c.author,
      parentComment: c.parentComment ? c.parentComment.toString() : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async listComments(highlightId: string, viewerUserId?: string) {
    const highlight = await this.loadHighlightDoc(highlightId);
    this.assertCanAccess(highlight, viewerUserId);

    const hid = new Types.ObjectId(highlightId);
    const rows = (await this.commentModel
      .find({ highlight: hid })
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
        .aggregate<{
          _id: Types.ObjectId;
          likeCount: number;
        }>([
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

    const countMap = new Map(agg.map((a) => [a._id.toString(), a.likeCount]));
    const mySet = new Set(
      mineRows.map((m) =>
        (m as { comment: Types.ObjectId }).comment.toString(),
      ),
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
    highlightId: string,
    authorUserId: string,
    body: string,
    parentCommentId?: string,
  ) {
    const highlight = await this.loadHighlightDoc(highlightId);
    this.assertCanAccess(highlight, authorUserId);

    let parentComment: Types.ObjectId | null = null;
    if (parentCommentId) {
      if (!Types.ObjectId.isValid(parentCommentId)) {
        throw new BadRequestException('Invalid parent comment ID');
      }
      const parent = await this.commentModel.findById(parentCommentId).exec();
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.highlight.toString() !== highlightId) {
        throw new BadRequestException(
          'Parent comment belongs to another highlight',
        );
      }
      if (parent.parentComment) {
        throw new BadRequestException(
          'You can only reply to a top-level comment',
        );
      }
      parentComment = parent._id;
    }

    const created = await this.commentModel.create({
      highlight: new Types.ObjectId(highlightId),
      author: new Types.ObjectId(authorUserId),
      body: body.trim(),
      parentComment,
    });
    const populated = await created.populate('author', 'nickname email');
    return {
      _id: populated._id.toString(),
      highlight: populated.highlight.toString(),
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

  async like(highlightId: string, userId: string) {
    const highlight = await this.loadHighlightDoc(highlightId);
    this.assertCanAccess(highlight, userId);

    const hid = new Types.ObjectId(highlightId);
    const uid = new Types.ObjectId(userId);
    try {
      await this.likeModel.create({ highlight: hid, user: uid });
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code !== 11000) throw e;
    }
    const likeCount = await this.likeModel
      .countDocuments({ highlight: hid })
      .exec();
    return { liked: true, likeCount };
  }

  async unlike(highlightId: string, userId: string) {
    const highlight = await this.loadHighlightDoc(highlightId);
    this.assertCanAccess(highlight, userId);

    const hid = new Types.ObjectId(highlightId);
    const uid = new Types.ObjectId(userId);
    await this.likeModel.deleteOne({ highlight: hid, user: uid }).exec();
    const likeCount = await this.likeModel
      .countDocuments({ highlight: hid })
      .exec();
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
    const highlight = await this.loadHighlightDoc(doc.highlight.toString());
    this.assertCanAccess(highlight, userId);

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
    const highlight = await this.loadHighlightDoc(doc.highlight.toString());
    this.assertCanAccess(highlight, userId);

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
    const highlight = await this.loadHighlightDoc(doc.highlight.toString());
    this.assertCanAccess(highlight, requesterUserId);

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
