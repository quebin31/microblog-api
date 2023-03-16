import { Router } from 'express';
import { validateBody, validateQuery } from '../middlewares/schemas';
import { getAllSchema, newPostSchema, patchPostSchema } from '../schemas/posts';
import asyncHandler from 'express-async-handler';
import { authMiddleware, verifiedMiddleware } from '../middlewares/auth';
import { optional } from '../middlewares/util';
import * as controller from '../controllers/posts.controller';
import { putVoteSchema } from '../schemas/votes';

const router = Router();

const getAllMiddlewares = [optional(authMiddleware), validateQuery(getAllSchema)];
router.get('/', ...getAllMiddlewares, asyncHandler(controller.getAllPosts));

const newPostMiddlewares = [authMiddleware, verifiedMiddleware, validateBody(newPostSchema)];
router.post('/', ...newPostMiddlewares, asyncHandler(controller.newPost));

router.get('/:id', optional(authMiddleware), asyncHandler(controller.getPost));

const patchPostMiddlewares = [authMiddleware, verifiedMiddleware, validateBody(patchPostSchema)];
router.patch('/:id', ...patchPostMiddlewares, asyncHandler(controller.patchPost));

const deletePostMiddlewares = [authMiddleware, verifiedMiddleware];
router.delete('/:id', ...deletePostMiddlewares, asyncHandler(controller.deletePost));

const putVoteMiddlewares = [authMiddleware, verifiedMiddleware, validateBody(putVoteSchema)];
router.put('/:id/votes', ...putVoteMiddlewares, asyncHandler(controller.putVote));

const deleteVoteMiddlewares = [authMiddleware, verifiedMiddleware];
router.delete('/:id/votes', ...deleteVoteMiddlewares, asyncHandler(controller.deleteVote));

export default router;
