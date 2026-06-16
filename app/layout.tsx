import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goo9 Novels',
  description: 'Goo9의 웹소설 전시관',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur sticky top-0 z-40">
          <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
            <Link href="/" className="font-serif text-xl font-extrabold tracking-tight">
              Goo9 <span className="text-[var(--muted)] font-extrabold">Novels</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-[var(--muted)]">
              <Link href="/" className="hover:text-[var(--text)] transition">작품</Link>
              <Link href="/admin" className="hover:text-[var(--text)] transition">관리</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] mt-16">
          <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} Goo9 Universe Novel Series.
          </div>
        </footer>
      </body>
    </html>
  );
}
