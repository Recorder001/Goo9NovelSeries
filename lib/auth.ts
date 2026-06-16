import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE = 'goo9_admin';

function expectedToken(): string {
  const secret = process.env.SESSION_SECRET || 'dev-secret';
  const pw = process.env.ADMIN_PASSWORD || 'changeme';
  return createHmac('sha256', secret).update(pw).digest('hex');
}

export function verifyPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD || 'changeme';
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  const exp = expectedToken();
  const a = Buffer.from(token);
  const b = Buffer.from(exp);
  return a.length === b.length && timingSafeEqual(a, b);
}
