import redisClient from '../redis';

export const verificationDao = {
  isVerifiedKey: (id: string) => `verification:${id}:isVerified`,
  requestedAtKey: (id: string) => `verification:${id}:requestedAt`,
  codeKey: (id: string) => `verification:${id}:code`,
  expiration: 24 * 60 * 60 * 1000, // 24 hours

  isVerified: {
    get: async (id: string) => {
      const value = await redisClient.get(verificationDao.isVerifiedKey(id));
      return value === null ? null : value === 'true';
    },
    set: async (id: string, verified: boolean) => {
      const key = verificationDao.isVerifiedKey(id);
      return redisClient.set(key, `${verified}`, { EX: verificationDao.expiration });
    },
  },

  requestedAt: {
    get: async (id: string) => {
      const value = await redisClient.get(verificationDao.requestedAtKey(id));
      return value === null ? null : parseInt(value);
    },
    set: async (id: string, timestamp: number) => {
      const key = verificationDao.requestedAtKey(id);
      return redisClient.set(key, `${timestamp}`, { EX: verificationDao.expiration });
    },
  },

  code: {
    del: async (id: string) => redisClient.del(verificationDao.codeKey(id)),
    get: async (id: string) => redisClient.get(verificationDao.codeKey(id)),
    set: async (id: string, code: string) => {
      const key = verificationDao.codeKey(id);
      return redisClient.set(key, code, { EX: verificationDao.expiration });
    },
  },
};
