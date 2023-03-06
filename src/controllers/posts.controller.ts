import { Request, Response } from 'express';
import { postsService } from '../services/posts.service';

export async function getAllPosts(req: Request, res: Response) {
  const userId = req.subject;
  const response = postsService.getAll(req.query, userId);
  res.status(200).json(response);
}
