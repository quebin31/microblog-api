import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { validateBody } from '../middlewares/schemas';
import { authMiddleware } from '../middlewares/auth';
import { optional } from '../middlewares/util';
import * as schemas from '../schemas/accounts';
import * as controller from '../controllers/accounts.controller';

const router = Router();

router.post('/sign-up', validateBody(schemas.signUpSchema), asyncHandler(controller.signUp));
router.post('/sign-in', validateBody(schemas.signInSchema), asyncHandler(controller.signIn));
router.post('/resend-email', authMiddleware, asyncHandler(controller.resendEmail));

const verifyMiddlewares = [authMiddleware, validateBody(schemas.verificationSchema)];
router.post('/verify-email', ...verifyMiddlewares, asyncHandler(controller.verifyEmail));
router.get('/:id', optional(authMiddleware), asyncHandler(controller.getAccount));

const patchAccountMiddlewares = [authMiddleware, validateBody(schemas.patchAccountSchema)];
router.patch('/:id', ...patchAccountMiddlewares, asyncHandler(controller.patchAccount));

export default router;
