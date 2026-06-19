import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNovelBySlug, getChapterByNumber, listChapters } from '@/lib/db';
import ReaderControls from '@/components/ReaderControls';

export const dynamic = 'force-dynamic';

export default async function ReaderPage({ params }: { params: Promise<{ slug: string; number: string }> }) {
  const { slug, number } = await params;
  const novel = await getNovelBySlug(slug);
  if (!novel || !novel.published) notFound();
  const num = parseInt(number, 10);
  const chapter = await getChapterByNumber(novel.id, num);
  if (!chapter || !chapter.published) notFound();

  const chapters = await listChapters(novel.id);
  const idx = chapters.findIndex((c) => c.id === chapter.id);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;

  return (
    <div id="reader-shell" className="reader-shell min-h-screen">
      <div className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/novel/${novel.slug}`} className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
            ← {novel.title}
          </Link>
          <ReaderControls />
        </div>
      </div>

      <article className="reader-paper px-6 sm:px-10 py-12">
        <header className="mb-8 pb-6 border-b border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">{chapter.number}화</p>
          <h1 className="mt-1 font-serif text-2xl font-extrabold">{chapter.title}</h1>
        </header>
        <div className="reader-content" dangerouslySetInnerHTML={{ __html: chapter.contentHtml }} />
      </article>

      <nav className="reader-paper px-6 sm:px-10 pb-20 flex items-center justify-between gap-3">
        {prev ? (
          <Link href={`/novel/${novel.slug}/${prev.number}`} className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--bg)] transition">
            ← {prev.number}화
          </Link>
        ) : <span />}
        <Link href={`/novel/${novel.slug}`} className="text-sm text-[var(--muted)] hover:text-[var(--text)]">목록</Link>
        {next ? (
          <Link href={`/novel/${novel.slug}/${next.number}`} className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--bg)] transition">
            {next.number}화 →
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
