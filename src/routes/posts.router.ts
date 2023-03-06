import { Router } from 'express';
import { validateQuery } from '../middlewares/schemas';
import { getAllSchema } from '../schemas/posts';
import asyncHandler from 'express-async-handler';
import * as postsController from '../controllers/posts.controller';

const router = Router();

router.get('/', validateQuery(getAllSchema), asyncHandler(postsController.getAllPosts));
router.post('/');
router.get('/:id');
router.patch('/:id');
router.delete('/:id');

export default router;
