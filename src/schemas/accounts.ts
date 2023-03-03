import { z } from 'zod';

const authShape = {
  email: z.string().email(),
  password: z.string().min(8).max(32),
};

export const signUpSchema = z
  .object(authShape)
  .extend({
    name: z.string().min(2).max(64),
  });

export const signInSchema = z
  .object(authShape)
  .extend({
    password: z.string(),
  });

export const verificationSchema = z.object({
  verificationCode: z.string(),
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;
export type VerificationData = z.infer<typeof verificationSchema>;

