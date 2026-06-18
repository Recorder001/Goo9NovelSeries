'use client';
import { useEffect } from 'react';
import { applyEffects } from '@/lib/applyEffects';

/**
 * 리더 본문의 글자 특수효과를 활성화한다.
 * 본문 HTML에 들어 있는 [fx:name]...[/fx] 마커(또는 업로드 시 변환된 .fx 스팬)를
 * 찾아 글자 분할·스크롤 연동·상호작용을 붙인다.
 */
export default function ReaderEffects() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.reader-content');
    if (!el) return;
    return applyEffects(el);
  }, []);

  return null;
}
