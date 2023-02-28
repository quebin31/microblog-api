import { Role } from '../../utils/auth';

export {};

declare global {
  namespace Express {
    interface Request {
      subject?: string,
      role?: Role,
    }
  }
}
