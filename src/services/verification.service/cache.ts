import redisClient from '../../redis';

export const verificationCache = {
  isVerifiedKey: (id: string) => `verification:${id}:isVerified`,
  requestedAtKey: (id: string) => `verification:${id}:requestedAt`,
  codeKey: (id: string) => `verification:${id}:code`,
  expiration: 24 * 60 * 60 * 1000, // 24 hours

  isVerified: {
    get: async (id: string) => redisClient.get(verificationCache.isVerifiedKey(id)),
    set: async (id: string, verified: boolean) => {
      const key = verificationCache.isVerifiedKey(id);
      return redisClient.set(key, `${verified}`, { EX: verificationCache.expiration });
    },
  },

  requestedAt: {
    get: async (id: string) => redisClient.get(verificationCache.requestedAtKey(id)),
    set: async (id: string, timestamp: number) => {
      const key = verificationCache.requestedAtKey(id);
      return redisClient.set(key, `${timestamp}`, { EX: verificationCache.expiration });
    },
  },

  code: {
    get: async (id: string) => redisClient.get(verificationCache.codeKey(id)),
    del: async (id: string) => redisClient.del(verificationCache.codeKey(id)),
    set: async (id: string, code: string) => {
      const key = verificationCache.codeKey(id);
      return redisClient.set(key, code, { EX: verificationCache.expiration });
    },
  },
};
