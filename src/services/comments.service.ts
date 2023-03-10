import { Comment, CommentVote, Post, User } from '@prisma/client';
import { omit } from '../utils/types';
import { GetAllParams, NewCommentData, PatchCommentData } from '../schemas/comments';
import { commentsRepository, GetAllOptions } from '../repositories/comments.repository';
import { BadRequestError, NotFoundError } from '../errors';
import { accountsService } from './accounts.service';
import { countPositiveVotes } from '../utils/votes';
import { PutVoteData } from '../schemas/votes';

export type CommentResponse = {
  id: string,
  postTitle: string,
  postId: string,
  authorName: string | null,
  authorId: string,
  body: string,
  score: number,
  positiveVotes: number,
  negativeVotes: number,
  totalVotes: number,
  draft: boolean,
  createdAt: Date,
  lastModifiedAt: Date,
}

export type CommentsResponse = {
  comments: CommentResponse[],
  cursor: Date | null,
}

export type FullComment = Comment & { post: Post, user: User, votes: CommentVote[] }

export function mapToCommentResponse(comment: FullComment, callerId?: string): CommentResponse {
  const { votes, ...rest } = comment;
  const positiveVotes = votes.reduce(countPositiveVotes, 0);
  const negativeVotes = votes.length - positiveVotes;

  return {
    ...omit(rest, ['post', 'user', 'userId', 'updatedAt']),
    postTitle: comment.post.title,
    postId: comment.post.id,
    authorName: comment.user.publicName || comment.user.id === callerId ? comment.user.name : null,
    authorId: comment.user.id,
    score: positiveVotes - negativeVotes,
    positiveVotes,
    negativeVotes,
    totalVotes: positiveVotes + negativeVotes,
    lastModifiedAt: comment.updatedAt,
  };
}

export const commentsService = {
  async getAll(params: GetAllParams, userId?: string): Promise<CommentsResponse> {
    if (params.user === undefined && params.post === undefined) {
      throw new BadRequestError(`At least one of 'user' or 'post' query params must be defined`);
    }

    let filterDraft = undefined;
    switch (params.include) {
      case 'published':
        filterDraft = false;
        break;
      case 'drafts':
        if (userId !== undefined) {
          filterDraft = true;
          break;
        } else {
          return { comments: [], cursor: null };
        }
      default:
        filterDraft = userId !== undefined ? undefined : false;
        break;
    }

    const options: GetAllOptions = {
      filterDraft,
      cursor: params.cursor,
      sort: params.sort ?? 'desc',
      skip: params.cursor !== undefined ? 1 : 0,
      take: params.take ?? 30,
      post: params.post,
      user: params.user === 'self' ? userId : params.user,
    };

    const comments = await commentsRepository.getAll(options);
    const last = comments.at(comments.length - 1);

    const mappedComments = comments.map((it) => mapToCommentResponse(it, userId));
    return { comments: mappedComments, cursor: last?.createdAt ?? null };
  },

  async newComment(data: NewCommentData, userId: string) {
    const comment = await commentsRepository.createNewComment(data, userId)
      .catch((_) => {
        throw new NotFoundError('Invalid user or post');
      });

    return mapToCommentResponse(comment, userId);
  },

  async getComment(id: string, userId?: string) {
    const comment = await commentsRepository.findById(id);
    if (!comment || (comment.draft && comment.userId !== userId)) {
      throw new NotFoundError(`Couldn't find comment with id ${id}`);
    }

    return mapToCommentResponse(comment, userId);
  },

  async updateComment(id: string, userId: string, data: PatchCommentData) {
    if (data.draft === true) {
      throw new BadRequestError(`Comments cannot be turned into drafts`);
    }

    const updated = await commentsRepository.updateComment(id, userId, data)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find comment with id ${id} to update`);
      });

    return mapToCommentResponse(updated, userId);
  },

  async deleteComment(id: string, userId: string) {
    const privileged = await accountsService.isModeratorOrAdmin(userId);
    await commentsRepository.deleteComment(id, privileged ? undefined : userId)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find comment with id ${id} to delete`);
      });
  },

  async putVote(id: string, userId: string, data: PutVoteData) {
    await commentsRepository.upsertVote(id, userId, data)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find comment to vote, or user`);
      });
  },

  async deleteVote(id: string, userId: string) {
    await commentsRepository.deleteVote(id, userId)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find related vote for the comment or user`);
      });
  },
};
