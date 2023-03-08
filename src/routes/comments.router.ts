import { Router } from 'express';
import { optional } from '../middlewares/util';
import { authMiddleware } from '../middlewares/auth';
import { validateQuery } from '../middlewares/schemas';
import { getAllSchema } from '../schemas/comments';
import asyncHandler from 'express-async-handler';
import * as controller from '../controllers/comments.controller';

const router = Router();

const getAllMiddlewares = [optional(authMiddleware), validateQuery(getAllSchema)];
router.get('/', ...getAllMiddlewares, asyncHandler(controller.getAllComments));

router.post('/');
router.get('/:id');
router.patch('/:id');
router.delete('/:id');

export default router;
