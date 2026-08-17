import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'anne_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? 'dev-only-change-auth-secret-in-production';
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getAuthSecret());
    return true;
  } catch {
    return false;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function isAllowedOrigin(request: Request): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  const host = request.headers.get('host');
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    return true;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && origin === appUrl) {
    return true;
  }

  return false;
}
