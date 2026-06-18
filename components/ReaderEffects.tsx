'use client';
import { useEffect } from 'react';

/**
 * 리더 본문의 특수효과 처리 (프로토타입)
 *
 * 작가는 docx 본문에 아래처럼 마커를 적습니다(서식 변화 없이 한 번에 입력):
 *   [fx:shake]덜덜 떨리는 손[/fx]
 *   [fx:glitch]시스템 오류[/fx]
 *   [fx:dust]스크롤하면 가루가 되어 사라진다[/fx]
 *
 * 이 컴포넌트가 런타임에 마커를 <span class="fx fx-...">로 바꾸고,
 * 가루(dust)는 글자 단위로 쪼개 스크롤 진행도에 묶어 연출합니다.
 * (재업로드/DB 변경 없이 동작하는 프로토타입 방식)
 */

// 지원하는 효과 이름 (화이트리스트)
const KNOWN_FX = new Set(['shake', 'glitch', 'dust']);

// [fx:name]...[/fx]  — 안쪽에 docx 서식 태그가 들어 있어도 그대로 보존
const MARKER_RE = /\[fx:([a-zA-Z-]+)\]([\s\S]*?)\[\/fx\]/g;

function segmentGraphemes(text: string): string[] {
  // 한글 음절은 보통 단일 코드포인트라 Array.from으로도 충분하지만,
  // 가능하면 Intl.Segmenter로 정확히 분할
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const seg = new Seg('ko', { granularity: 'grapheme' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

// dust 전용: fx 요소 내부 텍스트를 글자 단위 span으로 분할
function splitIntoChars(root: HTMLElement) {
  const textNodes: Text[] = [];
  const walk = (node: Node) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) textNodes.push(c as Text);
      else if (c.nodeType === Node.ELEMENT_NODE) walk(c);
    });
  };
  walk(root);

  const perNode = textNodes.map((n) => segmentGraphemes(n.textContent ?? ''));
  const total = perNode.reduce((a, b) => a + b.length, 0);
  root.style.setProperty('--n', String(total));

  let idx = 0;
  textNodes.forEach((node, ni) => {
    const frag = document.createDocumentFragment();
    perNode[ni].forEach((ch) => {
      const s = document.createElement('span');
      s.className = 'fx-ch';
      s.textContent = ch;
      // 각 글자가 흩어질 방향/회전을 무작위로 부여
      const ang = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 34;
      s.style.setProperty('--i', String(idx++));
      s.style.setProperty('--dx', `${(Math.cos(ang) * dist).toFixed(1)}px`);
      s.style.setProperty('--dy', `${(Math.sin(ang) * dist - 12).toFixed(1)}px`);
      s.style.setProperty('--rot', `${(Math.random() * 70 - 35).toFixed(1)}deg`);
      frag.appendChild(s);
    });
    node.replaceWith(frag);
  });
}

export default function ReaderEffects() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.reader-content');
    if (!el || el.dataset.fxProcessed) return;
    el.dataset.fxProcessed = '1';

    // 1) 마커 → 시맨틱 span 변환
    if (MARKER_RE.test(el.innerHTML)) {
      el.innerHTML = el.innerHTML.replace(MARKER_RE, (m, rawName: string, inner: string) => {
        const name = rawName.toLowerCase();
        if (!KNOWN_FX.has(name)) return m; // 모르는 효과는 그대로 둠
        return `<span class="fx fx-${name}" data-fx="${name}">${inner}</span>`;
      });
    }

    // 2) dust 요소만 글자 단위로 분할
    const dustEls = Array.from(el.querySelectorAll<HTMLElement>('.fx-dust'));
    dustEls.forEach(splitIntoChars);

    if (dustEls.length === 0) return;

    // 3) 스크롤 연동: 화면을 지나간 만큼만 진행도(--p)를 갱신 → 멈추면 가루도 멈춤
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      const start = vh * 0.65; // 이 지점부터 흩어지기 시작
      const end = vh * 0.2; // 이 지점에서 완전히 사라짐
      for (const d of dustEls) {
        const top = d.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, (start - top) / (start - end)));
        d.style.setProperty('--p', p.toFixed(3));
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return null;
}
