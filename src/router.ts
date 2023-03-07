import { Router } from 'express';
import accountsRouter from './routes/accounts.router';
import postsRouter from './routes/posts.router';
import commentsRouter from './routes/comments.router';

const router = Router();

router.use('/accounts', accountsRouter);
router.use('/posts', postsRouter);
router.use('/comments', commentsRouter);

export default router;
