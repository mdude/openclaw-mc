import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import fs from 'fs';
import path from 'path';

function getEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

function getPassHash(): string {
  // Read from a dedicated file to avoid systemd $ escaping issues
  const hashFile = path.join(process.cwd(), '.passhash');
  try {
    return fs.readFileSync(hashFile, 'utf-8').trim();
  } catch {
    return getEnv('MC_PASS_HASH');
  }
}

export async function verifyLogin(username: string, password: string): Promise<boolean> {
  const mcUser = getEnv('MC_USER', 'moxie');
  const mcPassHash = getPassHash();
  if (username !== mcUser) return false;
  if (!mcPassHash) return false;
  return bcryptjs.compareSync(password, mcPassHash);
}

export function createToken(): string {
  const secret = getEnv('MC_JWT_SECRET', 'change-me-in-production');
  return jwt.sign({ user: getEnv('MC_USER', 'moxie') }, secret, { expiresIn: '24h' });
}

export async function isAuthenticated(): Promise<boolean> {
  const secret = getEnv('MC_JWT_SECRET', 'change-me-in-production');
  const cookieStore = await cookies();
  const token = cookieStore.get('mc_session')?.value;
  if (token) {
    try {
      jwt.verify(token, secret);
      return true;
    } catch { return false; }
  }
  return false;
}

export function verifyApiKey(req: Request): boolean {
  const apiKey = getEnv('MC_API_KEY');
  if (!apiKey) return false;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${apiKey}`;
}

export async function requireAuth(req: Request): Promise<boolean> {
  if (verifyApiKey(req)) return true;
  return isAuthenticated();
}
