import { Request, Response } from 'express';
import * as accountsService from '../services/accounts.service';

export async function signUp(req: Request, res: Response) {
  const result = await accountsService.signUp(req.body);
  res.status(200).json(result);
}
