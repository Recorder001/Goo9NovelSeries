import Link from 'next/link';
import { listNovels } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const novels = await listNovels();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <section className="mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">Novels</h1>
        <p className="mt-3 text-[var(--muted)]">이 넓은 우주에서 기적처럼 만난, 이야기들의 교차점.</p>
      </section>

      {novels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-[var(--muted)]">아직 등록된 작품이 없습니다.</p>
          <Link href="/admin" className="mt-4 inline-block rounded-lg bg-[var(--accent)] text-white px-5 py-2.5 text-sm">
            관리 페이지에서 작품 추가하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {novels.map((n) => (
            <Link
              key={n.id}
              href={`/novel/${n.slug}`}
              className="group rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              <div className="aspect-[3/4] bg-[var(--bg)] overflow-hidden">
                {n.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.coverImage} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-serif text-2xl text-[var(--muted)] p-3 text-center">
                    {n.title}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)]">
                    {n.status}
                  </span>
                </div>
                <h2 className="font-semibold leading-snug line-clamp-2">{n.title}</h2>
                {n.author && <p className="mt-1 text-xs text-[var(--muted)]">{n.author}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
