import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { listNovels, createNovel, getNovelBySlug } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  return NextResponse.json(await listNovels({ includeUnpublished: true }));
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const body = await req.json();
  if (!body.slug || !body.title) {
    return NextResponse.json({ error: '제목과 주소(slug)는 필수입니다.' }, { status: 400 });
  }
  if (await getNovelBySlug(body.slug)) {
    return NextResponse.json({ error: '이미 사용 중인 주소(slug)입니다.' }, { status: 409 });
  }
  const novel = await createNovel(body);
  return NextResponse.json(novel, { status: 201 });
}
