import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { updateChapter, deleteChapter, getChapter } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  if (body.number != null) body.number = Number(body.number);
  const chapter = await updateChapter(id, body);
  if (!chapter) return NextResponse.json({ error: '회차를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(chapter);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  if (!(await getChapter(id))) return NextResponse.json({ error: '회차를 찾을 수 없습니다.' }, { status: 404 });
  await deleteChapter(id);
  return NextResponse.json({ ok: true });
}
