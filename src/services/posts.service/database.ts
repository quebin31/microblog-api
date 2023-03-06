import { prisma } from '../../prisma';

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
};
