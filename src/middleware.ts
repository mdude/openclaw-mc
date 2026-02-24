import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, its assets, and auth API
  if (
    pathname === '/missioncontrol/login' ||
    pathname.startsWith('/missioncontrol/api/auth/') ||
    pathname.startsWith('/missioncontrol/_next/')
  ) {
    return NextResponse.next();
  }

  // API routes: allow Bearer token through
  if (pathname.startsWith('/missioncontrol/api/')) {
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) return NextResponse.next();
  }

  // Check session cookie
  const token = request.cookies.get('mc_session')?.value;
  if (!token) {
    const loginUrl = new URL('/missioncontrol/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/missioncontrol/:path*'],
};
