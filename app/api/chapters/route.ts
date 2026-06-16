import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { createChapter, getChapterByNumber, listChapters } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const novelId = new URL(req.url).searchParams.get('novelId');
  if (!novelId) return NextResponse.json({ error: 'novelId 필요' }, { status: 400 });
  return NextResponse.json(await listChapters(novelId, { includeUnpublished: true }));
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const body = await req.json();
  if (!body.novelId || body.number == null || !body.title || !body.contentHtml) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }
  if (await getChapterByNumber(body.novelId, Number(body.number))) {
    return NextResponse.json({ error: '같은 회차 번호가 이미 존재합니다.' }, { status: 409 });
  }
  const chapter = await createChapter({ ...body, number: Number(body.number) });
  return NextResponse.json(chapter, { status: 201 });
}
