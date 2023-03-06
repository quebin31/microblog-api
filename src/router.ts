import { Router } from 'express';
import accountsRouter from './routes/accounts.router';
import postsRouter from './routes/posts.router';

const router = Router();

router.use('/accounts', accountsRouter);
router.use('/posts', postsRouter);

export default router;
