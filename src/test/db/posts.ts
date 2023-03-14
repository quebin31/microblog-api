import { Post } from '@prisma/client';
import { createNewPostData } from '../factories/posts';
import { postsRepository } from '../../repositories/posts.repository';
import { FullPost } from '../../services/posts.service';

export async function insertTestPost(userId: string, overrides?: Partial<Post>) {
  const data = createNewPostData(overrides);
  return postsRepository.createNewPost(data, userId);
}

export type TestPostsOptions = { qty?: number, draft?: boolean };

export async function insertTestPosts(userId: string, options?: TestPostsOptions) {
  const posts: FullPost[] = [];
  const qty = options?.qty ?? 5;
  const draft = options?.draft ?? false;

  for (let i = 0; i < qty; i += 1) {
    const post = await insertTestPost(userId, { draft });
    posts.push(post);
  }

  return posts;
}
