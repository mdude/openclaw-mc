import { NextResponse } from 'next/server';
import { verifyLogin, createToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const valid = await verifyLogin(username, password);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const token = createToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set('mc_session', token, {
    httpOnly: true,
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
  });
  return res;
}
