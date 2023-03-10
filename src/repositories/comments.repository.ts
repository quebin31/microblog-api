import { prisma } from '../prisma';
import { NewCommentData, PatchCommentData } from '../schemas/comments';
import { PutVoteData } from '../schemas/votes';

export type GetAllOptions = {
  sort: 'desc' | 'asc',
  skip: number,
  take: number,
  cursor?: Date,
  user?: string,
  post?: string,
  filterDraft?: boolean,
}

export const commentsRepository = {
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
      include: { user: true, post: true, votes: true },
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
      include: { user: true, post: true, votes: true },
    });
  },

  async findById(id: string) {
    return prisma.comment.findUnique({
      where: { id },
      include: { user: true, post: true, votes: true },
    });
  },

  async updateComment(id: string, userId: string, data: PatchCommentData) {
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
          include: { post: true, votes: true },
        },
      },
    });

    return { ...comments.at(0)!, user };
  },

  async deleteComment(id: string, userId?: string) {
    await prisma.$transaction(async (tx) => {
      const result = await tx.comment.deleteMany({
        where: { id, userId },
      });

      if (result.count !== 1) {
        throw new Error();
      }
    });
  },

  async upsertVote(id: string, userId: string, data: PutVoteData) {
    await prisma.commentVote.upsert({
      where: {
        userId_commentId: { userId, commentId: id },
      },
      update: {
        positive: data.positive,
      },
      create: {
        positive: data.positive,
        user: { connect: { id: userId } },
        comment: { connect: { id } },
      },
    });
  },

  async deleteVote(id: string, userId: string) {
    await prisma.commentVote.delete({
      where: { userId_commentId: { userId, commentId: id } },
    });
  },
};
