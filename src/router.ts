import { Router } from 'express';
import accountsRouter from './routes/accounts.router';

const router = Router();

router.use('/accounts', accountsRouter);

export default router;
