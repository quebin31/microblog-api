import { GetAllOptions, postsRepository } from '../repositories/posts.repository';
import { GetAllParams, NewPostData, PatchPostData } from '../schemas/posts';
import { Post, PostVote, User } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../errors';
import { accountsService } from './accounts.service';
import { omit } from '../utils/types';
import { countPositiveVotes } from '../utils/votes';

export type PostResponse = {
  id: string,
  authorName: string | null,
  authorId: string,
  title: string,
  body: string,
  score: number,
  positiveVotes: number,
  negativeVotes: number,
  totalVotes: number,
  draft: boolean,
  createdAt: Date,
  lastModifiedAt: Date,
}

export type PostsResponse = {
  posts: PostResponse[],
  cursor: Date | null,
}

export type FullPost = Post & { user: User, votes: PostVote[] }

export function mapToPostResponse(post: FullPost, callerId?: string): PostResponse {
  const { votes, ...rest } = post;
  const positiveVotes = votes.reduce(countPositiveVotes, 0);
  const negativeVotes = votes.length - positiveVotes;

  return {
    ...omit(rest, ['user', 'userId', 'updatedAt']),
    authorName: post.user.publicName || post.user.id === callerId ? post.user.name : null,
    authorId: post.user.id,
    score: positiveVotes - negativeVotes,
    positiveVotes,
    negativeVotes,
    totalVotes: positiveVotes + negativeVotes,
    lastModifiedAt: post.updatedAt,
  };
}

export const postsService = {
  async getAll(params: GetAllParams, userId?: string): Promise<PostsResponse> {
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
          return { posts: [], cursor: null };
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
      user: params.user === 'self' ? userId : params.user,
    };

    const posts = await postsRepository.getAll(options);
    const last = posts.at(posts.length - 1);

    const mappedPosts = posts.map((post) => mapToPostResponse(post, userId));
    return { posts: mappedPosts, cursor: last?.createdAt ?? null };
  },

  async newPost(data: NewPostData, userId: string): Promise<PostResponse> {
    const post = await postsRepository.createNewPost(data, userId)
      .catch((_) => {
        throw new NotFoundError('Invalid user');
      });

    return mapToPostResponse(post, userId);
  },

  async getPost(id: string, userId?: string) {
    const post = await postsRepository.findById(id);
    if (!post || (post.draft && post.userId !== userId)) {
      throw new NotFoundError(`Couldn't find post with id ${id}`);
    }

    return mapToPostResponse(post, userId);
  },

  async updatePost(id: string, data: PatchPostData, userId: string) {
    if (data.draft === true) {
      throw new BadRequestError('Posts cannot be turned into drafts');
    }

    const updated = await postsRepository.updatePost(id, data, userId)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find post with id ${id} to update`);
      });

    return mapToPostResponse(updated, userId);
  },

  async deletePost(id: string, userId: string) {
    const privileged = await accountsService.isModeratorOrAdmin(userId);
    await postsRepository.deletePost(id, privileged ? undefined : userId)
      .catch((_) => {
        throw new NotFoundError(`Couldn't find post with id ${id} to delete`);
      });
  },
};
