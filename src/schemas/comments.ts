import { z } from 'zod';

export const getAllSchema = z
  .object({
    sort: z.enum(['desc', 'asc']),
    cursor: z.coerce.date(),
    take: z.coerce.number().min(1).max(50),
    post: z.string().uuid(),
    user: z.string().uuid().or(z.enum(['self'])),
    include: z.enum(['all', 'published', 'drafts']),
  })
  .partial();

export const newCommentSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().min(1).max(512),
  draft: z.boolean().default(false),
});

export const patchCommentSchema = newCommentSchema
  .pick({ body: true })
  .extend({
    draft: z.boolean(),
  })
  .partial();

export type GetAllParams = z.infer<typeof getAllSchema>;
export type NewCommentData = z.infer<typeof newCommentSchema>;
export type PatchCommentData = z.infer<typeof patchCommentSchema>;
