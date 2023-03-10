import { prisma } from '../prisma';
import { NewPostData, PatchPostData } from '../schemas/posts';

export type GetAllOptions = {
  sort: 'desc' | 'asc',
  skip: number,
  take: number,
  cursor?: Date,
  user?: string,
  filterDraft?: boolean,
}

export const postsRepository = {
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
      cursor,
      skip: options.skip,
      take: options.take,
      include: { user: true },
    });
  },

  async createNewPost(data: NewPostData, userId: string) {
    return prisma.post.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
      },
      include: { user: true },
    });
  },

  async findById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: { user: true },
    });
  },

  async updatePost(id: string, data: PatchPostData, userId: string) {
    const { posts, ...user } = await prisma.user.update({
      where: { id: userId },
      data: {
        posts: {
          update: {
            where: { id },
            data: data,
          },
        },
      },
      include: {
        posts: {
          where: { id },
        },
      },
    });

    return { ...posts.at(0)!, user };
  },

  async deletePost(id: string, userId?: string) {
    await prisma.$transaction(async (tx) => {
      const result = await tx.post.deleteMany({
        where: { id, userId },
      });

      if (result.count !== 1) {
        throw new Error();
      }
    });
  },
};
