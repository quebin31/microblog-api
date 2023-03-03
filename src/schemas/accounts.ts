import { z } from 'zod';
import { Role } from '@prisma/client';

const name = z.string().min(2).max(64);

const authShape = {
  email: z.string().email(),
  password: z.string().min(8).max(32),
};

export const signUpSchema = z
  .object(authShape)
  .extend({ name });

export const signInSchema = z
  .object(authShape)
  .extend({
    password: z.string(),
  });

export const verificationSchema = z.object({
  verificationCode: z.string(),
});

export const patchAccountSchema = z.union([
  z
    .object({
      role: z.enum([Role.user, Role.moderator]),
    }),
  z
    .object({
      name,
      publicEmail: z.boolean(),
      publicName: z.boolean(),
    })
    .partial(),
]);

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;
export type VerificationData = z.infer<typeof verificationSchema>;
export type PatchAccountData = z.infer<typeof patchAccountSchema>;

