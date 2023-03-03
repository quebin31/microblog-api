import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as accountsController from '../controllers/accounts.controller';
import { validateSchema } from '../middlewares/schemas';
import { authMiddleware } from '../middlewares/auth';
import {
  patchAccountSchema,
  signInSchema,
  signUpSchema,
  verificationSchema,
} from '../schemas/accounts';

const router = Router();

router.post('/sign-up', validateSchema(signUpSchema), asyncHandler(accountsController.signUp));
router.post('/sign-in', validateSchema(signInSchema), asyncHandler(accountsController.signIn));
router.post('/resend-email', authMiddleware, asyncHandler(accountsController.resendEmail));

const verifyMiddlewares = [authMiddleware, validateSchema(verificationSchema)];
router.post('/verify-email', ...verifyMiddlewares, asyncHandler(accountsController.verifyEmail));
router.get('/:id', asyncHandler(accountsController.getAccount));

const patchAccountMiddlewares = [authMiddleware, validateSchema(patchAccountSchema)];
router.patch('/:id', ...patchAccountMiddlewares, asyncHandler(accountsController.patchAccount));

export default router;
