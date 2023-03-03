import { SignUpData } from '../../schemas/accounts';
import { prisma } from '../../prisma';

export const accountsDb = {
  async createNewUser(data: SignUpData) {
    return prisma.user.create({ data: data });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async verifyUser(id: string) {
    return prisma.user.update({ where: { id }, data: { verified: true } });
  },
};
