import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as accountsController from '../controllers/accounts.controller';
import { validateSchema } from '../middlewares/schemas';
import { signInSchema, signUpSchema, verificationSchema } from '../schemas/accounts';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/sign-up', validateSchema(signUpSchema), asyncHandler(accountsController.signUp));
router.post('/sign-in', validateSchema(signInSchema), asyncHandler(accountsController.signIn));
router.post('/resend-email', authMiddleware, asyncHandler(accountsController.resendEmail));

const verifyMiddlewares = [authMiddleware, validateSchema(verificationSchema)];
router.post('/verify-email', ...verifyMiddlewares, asyncHandler(accountsController.verifyEmail));
router.get('/:id', asyncHandler(accountsController.getAccount));
router.patch('/:id');

export default router;
