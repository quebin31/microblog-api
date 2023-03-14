import { Request, Response } from 'express';
import path from 'path';

export function serveOpenApiDocs(req: Request, res: Response) {
  res.sendFile(path.join(process.cwd(), 'build/redoc.html'))
}
