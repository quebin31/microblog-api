import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as accountsController from '../controllers/accounts.controller';
import { validateSchema } from '../middlewares/schemas';
import { authMiddleware } from '../middlewares/auth';
import { optional } from '../middlewares/util';
import * as schemas from '../schemas/accounts';

const router = Router();

router.post('/sign-up', validateSchema(schemas.signUpSchema), asyncHandler(accountsController.signUp));
router.post('/sign-in', validateSchema(schemas.signInSchema), asyncHandler(accountsController.signIn));
router.post('/resend-email', authMiddleware, asyncHandler(accountsController.resendEmail));

const verifyMiddlewares = [authMiddleware, validateSchema(schemas.verificationSchema)];
router.post('/verify-email', ...verifyMiddlewares, asyncHandler(accountsController.verifyEmail));
router.get('/:id', optional(authMiddleware), asyncHandler(accountsController.getAccount));

const patchAccountMiddlewares = [authMiddleware, validateSchema(schemas.patchAccountSchema)];
router.patch('/:id', ...patchAccountMiddlewares, asyncHandler(accountsController.patchAccount));

export default router;
