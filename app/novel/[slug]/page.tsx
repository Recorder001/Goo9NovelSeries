import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNovelBySlug, listChapters } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function NovelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const novel = await getNovelBySlug(slug);
  if (!novel || !novel.published) notFound();
  const chapters = await listChapters(novel.id);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">← 전체 작품</Link>

      <div className="mt-6 flex flex-col sm:flex-row gap-5 sm:gap-6">
        <div className="w-52 sm:w-40 shrink-0 mx-auto sm:mx-0">
          <div className="aspect-[2/3] rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
            {novel.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-serif text-xl text-[var(--muted)] p-3 text-center">
                {novel.title}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)]">
            {novel.status}
          </span>
          <h1 className="mt-2 font-serif text-3xl font-extrabold tracking-tight">{novel.title}</h1>
          {novel.author && <p className="mt-1 text-[var(--muted)]">{novel.author}</p>}
          {novel.description && (
            <p className="mt-4 text-[var(--text)]/90 whitespace-pre-wrap leading-relaxed">{novel.description}</p>
          )}
          {chapters.length > 0 && (
            <Link
              href={`/novel/${novel.slug}/${chapters[0].number}`}
              className="mt-5 inline-block rounded-lg bg-[var(--accent)] text-white px-5 py-2.5 text-sm"
            >
              1화부터 읽기
            </Link>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold mb-3">회차 목록 <span className="text-[var(--muted)] font-normal">({chapters.length})</span></h2>
        {chapters.length === 0 ? (
          <p className="text-[var(--muted)] py-8 text-center border border-dashed border-[var(--border)] rounded-xl">
            아직 등록된 회차가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
            {chapters.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/novel/${novel.slug}/${c.number}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg)] transition"
                >
                  <span className="text-sm text-[var(--muted)] w-12 shrink-0">{c.number}화</span>
                  <span className="flex-1">{c.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
