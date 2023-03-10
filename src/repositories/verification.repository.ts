import redisClient from '../redis';

export const verificationRepository = {
  isVerifiedKey: (id: string) => `verification:${id}:isVerified`,
  requestedAtKey: (id: string) => `verification:${id}:requestedAt`,
  codeKey: (id: string) => `verification:${id}:code`,
  expiration: 24 * 60 * 60 * 1000, // 24 hours

  isVerified: {
    get: async (id: string) => {
      const value = await redisClient.get(verificationRepository.isVerifiedKey(id));
      return value === null ? null : value === 'true';
    },
    set: async (id: string, verified: boolean) => {
      const key = verificationRepository.isVerifiedKey(id);
      return redisClient.set(key, `${verified}`, { EX: verificationRepository.expiration });
    },
  },

  requestedAt: {
    get: async (id: string) => {
      const value = await redisClient.get(verificationRepository.requestedAtKey(id));
      return value === null ? null : parseInt(value);
    },
    set: async (id: string, timestamp: number) => {
      const key = verificationRepository.requestedAtKey(id);
      return redisClient.set(key, `${timestamp}`, { EX: verificationRepository.expiration });
    },
  },

  code: {
    del: async (id: string) => redisClient.del(verificationRepository.codeKey(id)),
    get: async (id: string) => redisClient.get(verificationRepository.codeKey(id)),
    set: async (id: string, code: string) => {
      const key = verificationRepository.codeKey(id);
      return redisClient.set(key, code, { EX: verificationRepository.expiration });
    },
  },
};
