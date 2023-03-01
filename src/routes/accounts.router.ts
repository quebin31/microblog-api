import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as accountsController from '../controllers/accounts.controller';
import { validateSchema } from '../middlewares/schemas';
import { signInSchema, signUpSchema } from '../schemas/accounts';

const router = Router();

router.post('/sign-up', validateSchema(signUpSchema), asyncHandler(accountsController.signUp));
router.post('/sign-in', validateSchema(signInSchema), asyncHandler(accountsController.signIn));
router.get('/verify-email');
router.get('/:id');
router.patch('/:id');

export default router;
