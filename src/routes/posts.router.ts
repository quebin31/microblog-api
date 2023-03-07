import { Router } from 'express';
import { validateBody, validateQuery } from '../middlewares/schemas';
import { getAllSchema, newPostSchema, patchPostSchema } from '../schemas/posts';
import asyncHandler from 'express-async-handler';
import * as postsController from '../controllers/posts.controller';
import { authMiddleware } from '../middlewares/auth';
import { optional } from '../middlewares/util';

const router = Router();

const getAllMiddlewares = [optional(authMiddleware), validateQuery(getAllSchema)];
router.get('/', ...getAllMiddlewares, asyncHandler(postsController.getAllPosts));

const newPostMiddlewares = [authMiddleware, validateBody(newPostSchema)];
router.post('/', ...newPostMiddlewares, asyncHandler(postsController.newPost));

router.get('/:id', optional(authMiddleware), asyncHandler(postsController.getPost));

const patchPostMiddlewares = [authMiddleware, validateBody(patchPostSchema)];
router.patch('/:id', ...patchPostMiddlewares, asyncHandler(postsController.patchPost));

router.delete('/:id', authMiddleware, asyncHandler(postsController.deletePost));

export default router;
