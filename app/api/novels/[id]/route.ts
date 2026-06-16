import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { updateNovel, deleteNovel, getNovel, getNovelBySlug } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  if (body.slug) {
    const existing = await getNovelBySlug(body.slug);
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: '이미 사용 중인 주소(slug)입니다.' }, { status: 409 });
    }
  }
  const novel = await updateNovel(id, body);
  if (!novel) return NextResponse.json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(novel);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  if (!(await getNovel(id))) return NextResponse.json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });
  await deleteNovel(id);
  return NextResponse.json({ ok: true });
}
