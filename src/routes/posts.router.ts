import { Router } from 'express';
import { validateBody, validateQuery } from '../middlewares/schemas';
import { getAllSchema, newPostSchema, patchPostSchema } from '../schemas/posts';
import asyncHandler from 'express-async-handler';
import { authMiddleware } from '../middlewares/auth';
import { optional } from '../middlewares/util';
import * as controller from '../controllers/posts.controller';

const router = Router();

const getAllMiddlewares = [optional(authMiddleware), validateQuery(getAllSchema)];
router.get('/', ...getAllMiddlewares, asyncHandler(controller.getAllPosts));

const newPostMiddlewares = [authMiddleware, validateBody(newPostSchema)];
router.post('/', ...newPostMiddlewares, asyncHandler(controller.newPost));

router.get('/:id', optional(authMiddleware), asyncHandler(controller.getPost));

const patchPostMiddlewares = [authMiddleware, validateBody(patchPostSchema)];
router.patch('/:id', ...patchPostMiddlewares, asyncHandler(controller.patchPost));

router.delete('/:id', authMiddleware, asyncHandler(controller.deletePost));

export default router;
