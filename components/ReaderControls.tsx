'use client';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'sepia';

export default function ReaderControls() {
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState(720);
  const [theme, setTheme] = useState<Theme>('light');
  const [ready, setReady] = useState(false);

  // 초기값 로드
  useEffect(() => {
    try {
      const s = localStorage.getItem('reader.scale');
      const w = localStorage.getItem('reader.width');
      const t = localStorage.getItem('reader.theme') as Theme | null;
      if (s) setScale(parseFloat(s));
      if (w) setWidth(parseInt(w));
      if (t) setTheme(t);
    } catch {}
    setReady(true);
  }, []);

  // 적용
  useEffect(() => {
    if (!ready) return;
    const shell = document.getElementById('reader-shell');
    if (!shell) return;
    shell.style.setProperty('--reader-scale', String(scale));
    shell.style.setProperty('--reader-max', `${width}px`);
    shell.dataset.theme = theme;
    try {
      localStorage.setItem('reader.scale', String(scale));
      localStorage.setItem('reader.width', String(width));
      localStorage.setItem('reader.theme', theme);
    } catch {}
  }, [scale, width, theme, ready]);

  const btn = 'px-2.5 py-1 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--bg)] transition';

  return (
    <div className="flex flex-wrap items-center gap-2 text-[var(--muted)]">
      <span className="text-xs mr-1">글자</span>
      <button className={btn} onClick={() => setScale((v) => Math.max(0.8, +(v - 0.1).toFixed(2)))}>A−</button>
      <button className={btn} onClick={() => setScale((v) => Math.min(1.8, +(v + 0.1).toFixed(2)))}>A+</button>
      <span className="text-xs mx-1 ml-3">폭</span>
      <button className={btn} onClick={() => setWidth((v) => Math.max(560, v - 80))}>좁게</button>
      <button className={btn} onClick={() => setWidth((v) => Math.min(960, v + 80))}>넓게</button>
      <span className="text-xs mx-1 ml-3">테마</span>
      <button className={btn} onClick={() => setTheme('light')} aria-pressed={theme === 'light'}>화이트</button>
      <button className={btn} onClick={() => setTheme('sepia')} aria-pressed={theme === 'sepia'}>세피아</button>
    </div>
  );
}
