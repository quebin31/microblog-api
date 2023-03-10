import { Router } from 'express';
import { optional } from '../middlewares/util';
import { authMiddleware } from '../middlewares/auth';
import { validateBody, validateQuery } from '../middlewares/schemas';
import { getAllSchema, newCommentSchema, patchCommentSchema } from '../schemas/comments';
import asyncHandler from 'express-async-handler';
import * as controller from '../controllers/comments.controller';
import { putVoteSchema } from '../schemas/votes';

const router = Router();

const getAllMiddlewares = [optional(authMiddleware), validateQuery(getAllSchema)];
router.get('/', ...getAllMiddlewares, asyncHandler(controller.getAllComments));

const newCommentMiddlewares = [authMiddleware, validateBody(newCommentSchema)];
router.post('/', ...newCommentMiddlewares, asyncHandler(controller.newComment));

router.get('/:id', optional(authMiddleware), asyncHandler(controller.getComment));

const patchCommentMiddlewares = [authMiddleware, validateBody(patchCommentSchema)];
router.patch('/:id', ...patchCommentMiddlewares, asyncHandler(controller.patchComment));

router.delete('/:id', authMiddleware, asyncHandler(controller.deleteComment));

const putVoteMiddlewares = [authMiddleware, validateBody(putVoteSchema)];
router.put('/:id/votes', ...putVoteMiddlewares, asyncHandler(controller.putVote));

router.delete('/:id/votes', authMiddleware, asyncHandler(controller.deleteVote));

export default router;
