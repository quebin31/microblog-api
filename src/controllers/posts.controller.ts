import { Request, Response } from 'express';
import { postsService } from '../services/posts.service';

export async function getAllPosts(req: Request, res: Response) {
  const userId = req.subject;
  const response = await postsService.getAll(req.query, userId);
  res.status(200).json(response);
}

export async function newPost(req: Request, res: Response) {
  const userId = req.subject!!;
  const response = await postsService.newPost(req.body, userId);
  res.status(201).json(response);
}