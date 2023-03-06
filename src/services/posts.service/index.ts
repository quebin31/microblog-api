import { GetAllOptions, postsDb } from './database';
import { GetAllParams, NewPostData } from '../../schemas/posts';
import { Post, User } from '@prisma/client';
import { NotFoundError } from '../../errors';

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

export function mapToPostResponse(post: Post & { user: User }, callerId?: string): PostResponse {
  return {
    id: post.id,
    authorName: post.user.publicName || post.user.id === callerId ? post.user.name : null,
    authorId: post.user.id,
    title: post.title,
    body: post.body,
    score: post.positiveVotes - post.negativeVotes,
    positiveVotes: post.positiveVotes,
    negativeVotes: post.negativeVotes,
    totalVotes: post.positiveVotes + post.negativeVotes,
    draft: post.draft,
    createdAt: post.createdAt,
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
        filterDraft = true;
        break;
      default:
        break;
    }

    const options: GetAllOptions = {
      filterDraft,
      cursor: params.cursor,
      sort: params.sort || 'desc',
      take: params.take || 30,
      user: params.user === 'self' ? userId : params.user,
    };

    const posts = await postsDb.getAll(options);
    const last = posts.at(posts.length - 1);

    const mappedPosts = posts.map((post) => mapToPostResponse(post, userId));
    return { posts: mappedPosts, cursor: last?.createdAt || null };
  },

  async newPost(data: NewPostData, userId: string): Promise<PostResponse> {
    const post = await postsDb.newPost(data, userId)
      .catch((_) => {
        throw new NotFoundError('Invalid user');
      });

    return mapToPostResponse(post, userId);
  },
};
