import { NextResponse } from 'next/server';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }));
  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ ok: false, error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}
