import { NextResponse } from 'next/server';
import {
  createSessionToken,
  getSessionCookieOptions,
  isAllowedOrigin,
  SESSION_COOKIE,
} from '@/lib/auth-session';
import { verifyPassword } from '@/lib/auth-password';

export const revalidate = 0;

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const body = await req.json();
    const password = typeof body?.password === 'string' ? body.password : '';
    const honeypot = typeof body?.website === 'string' ? body.website : '';

    if (honeypot) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!verifyPassword(password)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return new NextResponse('Invalid password', { status: 401 });
    }

    const token = await createSessionToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());

    return response;
  } catch {
    return new NextResponse('Bad request', { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!isAllowedOrigin(req)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...getSessionCookieOptions(), maxAge: 0 });
  return response;
}
