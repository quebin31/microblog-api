import { z } from 'zod';

export const putVoteSchema = z.object({
  positive: z.boolean(),
});

export type PutVoteData = z.infer<typeof putVoteSchema>;
