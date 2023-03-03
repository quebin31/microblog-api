import { Request, Response } from 'express';
import { accountsService } from '../services/accounts.service';
import { verificationService } from '../services/verification.service';

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

export async function verifyEmail(req: Request, res: Response) {
  const userId = req.subject!!;
  await verificationService.verifyEmail(userId, req.body);
  res.status(204).send();
}

export async function getAccount(req: Request, res: Response) {
  const callerId = req.subject;
  const userId = req.params.id;
  const user = await accountsService.getAccount(userId, callerId);
  res.status(200).json(user);
}

export async function patchAccount(req: Request, res: Response) {
  const callerId = req.subject!!;
  const userId = req.params.id;
  const updated = await accountsService.updateAccount(userId, callerId, req.body);
  res.status(200).json(updated);
}
