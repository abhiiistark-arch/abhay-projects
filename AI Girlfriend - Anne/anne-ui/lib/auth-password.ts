import { timingSafeEqual } from 'crypto';

export function getAppPassword(): string {
  return process.env.APP_PASSWORD ?? 'abhayislove';
}

export function verifyPassword(input: string): boolean {
  const expected = getAppPassword();
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);

  if (inputBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(inputBuf, expectedBuf);
}
