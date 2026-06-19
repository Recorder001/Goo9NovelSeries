// 변환된 .fx 스팬에 실제 동작(글자 분할·스크롤 연동·상호작용)을 붙이는 브라우저 전용 유틸.
// 리더(ReaderEffects)와 어드민 미리보기가 함께 사용.

import {
  wrapMarkersDOM,
  hasMarkers,
  NEEDS_SPLIT,
  RANDOM_DIR,
  SCROLL_LINKED,
} from './effects';

const SPEED: Record<string, string> = { slow: '1.8', normal: '1', fast: '0.55' };

function segment(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const seg = new Seg('ko', { granularity: 'grapheme' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

// fx 요소 내부 텍스트를 글자 단위 span으로 분할 (멱등: 이미 분할됐으면 건너뜀)
function splitIntoChars(el: HTMLElement, fx: string) {
  if (el.querySelector('.fx-ch')) return;

  const textNodes: Text[] = [];
  const walk = (node: Node) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) textNodes.push(c as Text);
      else if (c.nodeType === Node.ELEMENT_NODE && !(c as HTMLElement).classList.contains('fx-ch')) walk(c);
    });
  };
  walk(el);

  const per = textNodes.map((n) => segment(n.textContent ?? ''));
  const total = per.reduce((a, b) => a + b.length, 0) || 1;
  el.style.setProperty('--n', String(total));

  const rnd = RANDOM_DIR.has(fx);
  let idx = 0;
  textNodes.forEach((node, ni) => {
    const frag = document.createDocumentFragment();
    per[ni].forEach((ch) => {
      const s = document.createElement('span');
      s.className = 'fx-ch';
      s.textContent = ch;
      s.style.setProperty('--i', String(idx++));
      if (rnd) {
        const a = Math.random() * Math.PI * 2;
        const d = 12 + Math.random() * 34;
        s.style.setProperty('--dx', `${(Math.cos(a) * d).toFixed(1)}px`);
        s.style.setProperty('--dy', `${(Math.sin(a) * d - 12).toFixed(1)}px`);
        s.style.setProperty('--rot', `${(Math.random() * 70 - 35).toFixed(1)}deg`);
      }
      frag.appendChild(s);
    });
    node.replaceWith(frag);
  });
}

export type ApplyOpts = { preview?: boolean };

/** root 안의 마커/효과를 모두 적용. 정리(cleanup) 함수를 반환. */
export function applyEffects(root: HTMLElement, opts: ApplyOpts = {}): () => void {
  const preview = !!opts.preview;
  const cleanups: Array<() => void> = [];

  // 0) 아직 변환 안 된 원본 마커가 남아 있으면 변환(구버전 회차/직접 입력 대비)
  if (hasMarkers(root.innerHTML)) wrapMarkersDOM(root);

  const fxEls = Array.from(root.querySelectorAll<HTMLElement>('.fx'));
  if (fxEls.length === 0) return () => {};

  // 1) 옵션 적용: 속도 → --fx-dur, 색(네온) → --fx-color
  fxEls.forEach((el) => {
    const sp = el.dataset.speed;
    if (sp && SPEED[sp]) el.style.setProperty('--fx-dur', SPEED[sp]);
    if (el.dataset.color) el.style.setProperty('--fx-color', el.dataset.color);
  });

  // 2) 글자 단위 분할
  fxEls.forEach((el) => {
    const fx = el.dataset.fx;
    if (fx && NEEDS_SPLIT.has(fx)) splitIntoChars(el, fx);
  });

  // 3) 스크롤 연동 (dust/type/focus)
  const scrollEls = fxEls.filter((el) => el.dataset.fx && SCROLL_LINKED[el.dataset.fx]);
  if (scrollEls.length) {
    const latched = new WeakMap<HTMLElement, number>();
    const setP = (el: HTMLElement, p: number) => el.style.setProperty('--p', p.toFixed(3));

    if (preview) {
      // 미리보기: 스크롤 대신 고정 진행도로 결과만 보여줌
      scrollEls.forEach((el) => setP(el, SCROLL_LINKED[el.dataset.fx as string].previewP));
    } else {
      let ticking = false;
      const update = () => {
        ticking = false;
        const vh = window.innerHeight;
        for (const el of scrollEls) {
          const cfg = SCROLL_LINKED[el.dataset.fx as string];
          const top = el.getBoundingClientRect().top;
          let p = (vh * cfg.from - top) / (vh * cfg.from - vh * cfg.to);
          p = Math.min(1, Math.max(0, p));
          if (cfg.latch) {
            const prev = latched.get(el) ?? 0;
            if (p < prev) p = prev;
            else latched.set(el, p);
          }
          setP(el, p);
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
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    }
  }

  // 4) 검열(redacted): 탭/클릭/키보드로 드러내기
  root.querySelectorAll<HTMLElement>('.fx-redacted').forEach((el) => {
    if (preview) {
      el.classList.add('fx-revealed');
      return;
    }
    const toggle = () => el.classList.toggle('fx-revealed');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    };
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', '가려진 내용 보기');
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', onKey);
    cleanups.push(() => {
      el.removeEventListener('click', toggle);
      el.removeEventListener('keydown', onKey);
    });
  });

  // 5) 잉크(ink): 화면에 들어오면 번지듯 또렷해짐(한 번)
  const inkEls = Array.from(root.querySelectorAll<HTMLElement>('.fx-ink'));
  if (inkEls.length) {
    if (preview || !('IntersectionObserver' in window)) {
      inkEls.forEach((el) => el.classList.add('fx-in'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('fx-in');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      inkEls.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }
  }

  return () => cleanups.forEach((fn) => fn());
}
