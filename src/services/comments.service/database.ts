import { prisma } from '../../prisma';
import { NewCommentData, PatchCommentData } from '../../schemas/comments';

export type GetAllOptions = {
  sort: 'desc' | 'asc',
  skip: number,
  take: number,
  cursor?: Date,
  user?: string,
  post?: string,
  filterDraft?: boolean,
}

export const commentsDb = {
  async getAll(options: GetAllOptions) {
    const cursor = options.cursor !== undefined
      ? { createdAt: options.cursor }
      : undefined;

    return prisma.comment.findMany({
      where: {
        userId: options.user,
        postId: options.post,
        draft: options.filterDraft,
      },
      orderBy: {
        createdAt: options.sort,
      },
      cursor,
      skip: options.skip,
      take: options.take,
      include: { user: true, post: true },
    });
  },

  async createNewComment(data: NewCommentData, userId: string) {
    const { postId, ...rest } = data;
    return prisma.comment.create({
      data: {
        ...rest,
        user: { connect: { id: userId } },
        post: { connect: { id: postId } },
      },
      include: { user: true, post: true },
    });
  },

  async findById(id: string) {
    return prisma.comment.findUnique({
      where: { id },
      include: { user: true, post: true },
    });
  },

  async updateComment(id: string, data: PatchCommentData, userId: string) {
    const { comments, ...user } = await prisma.user.update({
      where: { id: userId },
      data: {
        comments: {
          update: {
            where: { id },
            data: data,
          },
        },
      },
      include: {
        comments: {
          where: { id },
          include: { post: true },
        },
      },
    });

    return { ...comments.at(0)!!, user };
  },
};
