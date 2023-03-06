import { GetAllOptions, postsDb } from './database';
import { GetAllParams } from '../../schemas/posts';
import { Post } from '@prisma/client';

export type PostResponse = {
  id: string,
  title: string,
  body: string,
  score: number,
  positiveVotes: number,
  negativeVotes: number,
  totalVotes: number,
  draft: boolean,
  lastModifiedAt: Date | null
}

export type PostsResponse = {
  posts: PostResponse[],
  cursor: Date | null,
}

export function mapToPostResponse(post: Post): PostResponse {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    score: post.positiveVotes - post.negativeVotes,
    positiveVotes: post.positiveVotes,
    negativeVotes: post.negativeVotes,
    totalVotes: post.positiveVotes + post.negativeVotes,
    draft: post.draft,
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
      case 'drafts'  :
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

    return { posts: posts.map(mapToPostResponse), cursor: last?.createdAt || null };
  },
};
