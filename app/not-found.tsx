import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-5 py-32 text-center">
      <h1 className="font-serif text-4xl font-extrabold">404</h1>
      <p className="mt-3 text-[var(--muted)]">페이지를 찾을 수 없습니다.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-[var(--accent)] text-white px-5 py-2.5 text-sm">홈으로</Link>
    </div>
  );
}
