import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as accountsController from '../controllers/accounts.controller';
import { validateSchema } from '../middlewares/schemas';
import { signUpSchema } from '../schemas/accounts';

const router = Router();

router.post('/sign-up', validateSchema(signUpSchema), asyncHandler(accountsController.signUp));
router.post('/sign-in');
router.get('/verify-email');
router.get('/:id');
router.patch('/:id');

export default router;
