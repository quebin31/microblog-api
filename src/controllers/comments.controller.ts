import { Request, Response } from 'express';
import { commentsService } from '../services/comments.service';
import { requireSubject } from '../utils/auth';

export async function getAllComments(req: Request, res: Response) {
  const userId = req.subject;
  const response = await commentsService.getAll(req.query, userId);
  res.status(200).json(response);
}

export async function newComment(req: Request, res: Response) {
  const userId = requireSubject(req.subject);
  const response = await commentsService.newComment(req.body, userId);
  res.status(200).json(response);
}

export async function getComment(req: Request, res: Response) {
  const commentId = req.params.id;
  const userId = req.subject;
  const response = await commentsService.getComment(commentId, userId);
  res.status(200).json(response);
}

export async function patchComment(req: Request, res: Response) {
  const commentId = req.params.id;
  const userId = requireSubject(req.subject);
  const updated = await commentsService.updateComment(commentId, req.body, userId);
  res.status(200).json(updated);
}

export async function deleteComment(req: Request, res: Response) {
  const commentId = req.params.id;
  const userId = requireSubject(req.subject);
  await commentsService.deleteComment(commentId, userId);
  res.status(204).send();
}
