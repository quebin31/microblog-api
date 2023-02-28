import { Role } from '../../util/auth';

export {};

declare global {
  namespace Express {
    interface Request {
      subject?: string,
      role?: Role,
    }
  }
}
