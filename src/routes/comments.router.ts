import { Router } from 'express';
import { optional } from '../middlewares/util';
import { authMiddleware } from '../middlewares/auth';
import { validateBody, validateQuery } from '../middlewares/schemas';
import { getAllSchema, newCommentSchema } from '../schemas/comments';
import asyncHandler from 'express-async-handler';
import * as controller from '../controllers/comments.controller';

const router = Router();

const getAllMiddlewares = [optional(authMiddleware), validateQuery(getAllSchema)];
router.get('/', ...getAllMiddlewares, asyncHandler(controller.getAllComments));

const newCommentMiddlewares = [authMiddleware, validateBody(newCommentSchema)];
router.post('/', ...newCommentMiddlewares, asyncHandler(controller.newComment));

router.get('/:id', optional(authMiddleware), asyncHandler(controller.getComment));
router.patch('/:id');
router.delete('/:id');

export default router;
