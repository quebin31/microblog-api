import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';

export async function saltPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 5);
}

export async function checkPassword(password: string, salted: string): Promise<boolean> {
  return bcrypt.compare(password, salted);
}

export enum Role {
  User = 'user',
  Moderator = 'moderator',
  Admin = 'admin',
}

export type AuthPayload = { sub: string, role: Role };

export function createJwt(payload: AuthPayload, secret: string): string {
  return jwt.sign(payload, secret);
}

function isValidJwtPayload(payload: string | JwtPayload): payload is JwtPayload {
  const jwtPayload = payload as JwtPayload;
  return jwtPayload.sub !== undefined && jwtPayload.role !== undefined;
}

export function verifyJwt(token: string, secret: string): JwtPayload {
  const payload = jwt.verify(token, secret);
  if (!isValidJwtPayload(payload)) {
    throw new Error('Received invalid JWT payload');
  }

  return payload;
}
