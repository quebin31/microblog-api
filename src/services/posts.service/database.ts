import { prisma } from '../../prisma';
import { NewPostData } from '../../schemas/posts';

export type GetAllOptions = {
  sort: 'desc' | 'asc',
  take: number,
  cursor?: Date,
  user?: string,
  filterDraft?: boolean,
}

export const postsDb = {
  async getAll(options: GetAllOptions) {
    const cursor = options.cursor !== undefined
      ? { createdAt: options.cursor }
      : undefined;

    return prisma.post.findMany({
      where: {
        userId: options.user,
        draft: options.filterDraft,
      },
      orderBy: {
        createdAt: options.sort,
      },
      skip: options.cursor !== undefined ? 1 : 0,
      take: options.take,
      cursor,
      include: { user: true },
    });
  },

  async newPost(data: NewPostData, userId: string) {
    return prisma.post.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
      },
      include: { user: true },
    });
  },
};
