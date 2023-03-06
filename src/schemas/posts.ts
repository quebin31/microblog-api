import { z } from 'zod';

export const getAllSchema = z
  .object({
    sort: z.enum(['desc', 'asc']),
    cursor: z.coerce.date(),
    take: z.coerce.number().min(1).max(50),
    user: z.string().uuid().or(z.enum(['self'])),
    include: z.enum(['all', 'published', 'drafts']),
  })
  .partial();

export const newPostSchema = z.object({
  title: z.string().min(1).max(128),
  body: z.string().min(1).max(1024),
  draft: z.boolean().default(false),
});

export type GetAllParams = z.infer<typeof getAllSchema>;
export type NewPostData = z.infer<typeof newPostSchema>;
