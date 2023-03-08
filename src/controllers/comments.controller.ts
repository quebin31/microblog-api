import { Request, Response } from 'express';
import { commentsService } from '../services/comments.service';

export async function getAllComments(req: Request, res: Response) {
  const userId = req.subject;
  const response = await commentsService.getAll(req.query, userId);
  res.status(200).json(response);
}
