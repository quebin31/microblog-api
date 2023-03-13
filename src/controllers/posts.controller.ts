import { Request, Response } from 'express';
import { postsService } from '../services/posts.service';
import { requireSubject } from '../utils/auth';

export async function getAllPosts(req: Request, res: Response) {
  const userId = req.subject;
  const response = await postsService.getAll(req.query, userId);
  res.status(200).json(response);
}

export async function newPost(req: Request, res: Response) {
  const userId = requireSubject(req.subject);
  const response = await postsService.newPost(req.body, userId);
  res.status(201).json(response);
}

export async function getPost(req: Request, res: Response) {
  const postId = req.params.id;
  const userId = req.subject;
  const response = await postsService.getPost(postId, userId);
  res.status(200).json(response);
}

export async function patchPost(req: Request, res: Response) {
  const postId = req.params.id;
  const userId = requireSubject(req.subject);
  const updated = await postsService.updatePost(postId, userId, req.body);
  res.status(200).json(updated);
}

export async function deletePost(req: Request, res: Response) {
  const postId = req.params.id;
  const userId = requireSubject(req.subject);
  await postsService.deletePost(postId, userId);
  res.status(204).send();
}
