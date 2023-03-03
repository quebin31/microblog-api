import { Request, Response } from 'express';
import * as accountsService from '../services/accounts.service';
import * as verificationService from '../services/verification.service';

export async function signUp(req: Request, res: Response) {
  const result = await accountsService.signUp(req.body);
  res.status(200).json(result);
}

export async function signIn(req: Request, res: Response) {
  const result = await accountsService.signIn(req.body);
  res.status(200).json(result);
}

export async function resendEmail(req: Request, res: Response) {
  const userId = req.subject!!;
  await verificationService.sendVerificationEmail({ id: userId });
  res.status(204).send();
}
