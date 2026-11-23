import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@/lib/models';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters.');
const key = new TextEncoder().encode(secret);
const cookieName = 'school_session';

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(key);
  cookies().set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
}
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(cookieName)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, key); return payload as unknown as SessionUser; }
  catch { return null; }
}
export async function requireUser() {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}
export async function destroySession() { cookies().delete(cookieName); }
