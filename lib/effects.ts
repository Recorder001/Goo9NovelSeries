// 리더 글자 특수효과 — 공유 정의
// 마커 문법:  [fx:이름]대상 텍스트[/fx]   (옵션: [fx:wave speed=slow]...[/fx])
// 이 모듈은 DOM에 의존하지 않는 순수 로직만 둡니다(서버/클라이언트 공용).

export type FxName =
  | 'shake' | 'glitch' | 'dust'
  | 'type' | 'focus' | 'wave'
  | 'neon' | 'redacted' | 'ink'
  | 'shimmer' | 'drip' | 'ghost';

export type FxInfo = { name: FxName; label: string; desc: string };

// 어드민 도움말/미리보기에서 사용하는 효과 목록
export const EFFECTS: FxInfo[] = [
  { name: 'shake', label: '떨림', desc: '글자가 덜덜 떨림 (공포·추위·분노)' },
  { name: 'glitch', label: '글리치', desc: '디지털 붕괴·환청·시스템 메시지' },
  { name: 'dust', label: '가루', desc: '스크롤한 만큼만 가루가 되어 흩어짐' },
  { name: 'type', label: '한 글자씩', desc: '스크롤하면 타자기처럼 한 자씩 등장' },
  { name: 'focus', label: '흐림→또렷', desc: '스크롤하면 흐릿하다가 또렷해짐 (회상·각성)' },
  { name: 'wave', label: '물결', desc: '글자가 물결처럼 출렁임 (꿈·물속)' },
  { name: 'neon', label: '네온', desc: '색이 흐르는 그라데이션 텍스트 (마법·강조)' },
  { name: 'redacted', label: '검열', desc: '먹칠로 가렸다가 탭/클릭하면 드러남 (금기어)' },
  { name: 'ink', label: '잉크', desc: '화면에 들어오면 잉크가 번지듯 또렷해짐 (편지·일기)' },
  { name: 'shimmer', label: '아지랑이', desc: '열기처럼 일렁임 (더위·분노)' },
  { name: 'drip', label: '흘러내림', desc: '글자에서 물·피가 떨어짐' },
  { name: 'ghost', label: '잔상', desc: '유령 같은 이중 잔상이 흔들림' },
];

export const KNOWN_FX: Set<string> = new Set(EFFECTS.map((e) => e.name));

// 글자 단위 분할이 필요한 효과
export const NEEDS_SPLIT: Set<string> = new Set(['dust', 'type', 'wave', 'drip']);

// 글자별 무작위 방향(흩어짐)이 필요한 효과
export const RANDOM_DIR: Set<string> = new Set(['dust']);

// 스크롤 진행도(--p)에 묶이는 효과
export type ScrollCfg = {
  from: number; // 진행 시작 지점(뷰포트 높이 비율, 0=상단 1=하단)
  to: number; //   진행 완료 지점
  latch: boolean; // true면 한 번 진행된 만큼 되돌아가지 않음(되감기 방지)
  previewP: number; // 어드민 미리보기에서 보여줄 고정 진행도
};
export const SCROLL_LINKED: Record<string, ScrollCfg> = {
  dust: { from: 0.65, to: 0.2, latch: false, previewP: 0 },
  type: { from: 0.92, to: 0.55, latch: true, previewP: 1 },
  focus: { from: 0.92, to: 0.55, latch: true, previewP: 1 },
};

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// "speed=slow size=big" → ' data-speed="slow" data-size="big"'
function optsToData(opts: string): string {
  if (!opts || !opts.trim()) return '';
  let out = '';
  const re = /([a-zA-Z-]+)=([^\s\]]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(opts))) out += ` data-${m[1].toLowerCase()}="${escAttr(m[2])}"`;
  return out;
}

export function hasMarkers(html: string): boolean {
  // 느슨하게 감지: 토큰이 태그로 쪼개졌을 수 있으므로 '[fx:' 만 있으면 DOM 처리 시도.
  return /\[fx:/i.test(html);
}

const FULL_MARKER = /\[fx:\s*([a-zA-Z-]+)((?:\s+[a-zA-Z-]+=[^\s\]]+)*)\s*\]([\s\S]*?)\[\/fx\]/gi;

type Found = { name: string; opts: string; fullStart: number; contentStart: number; contentEnd: number; fullEnd: number };

// 텍스트 전체에서 "마지막"으로 등장하는, 알려진 효과 마커 1개를 찾는다.
function findLastKnownMarker(text: string): Found | null {
  FULL_MARKER.lastIndex = 0;
  let m: RegExpExecArray | null;
  let last: Found | null = null;
  while ((m = FULL_MARKER.exec(text))) {
    const name = m[1].toLowerCase();
    if (!KNOWN_FX.has(name)) continue; // 모르는 효과는 건너뜀(원문 유지)
    const fullStart = m.index;
    const contentStart = fullStart + (m[0].length - m[3].length - 5); // 5 = '[/fx]'
    last = {
      name,
      opts: m[2] || '',
      fullStart,
      contentStart,
      contentEnd: contentStart + m[3].length,
      fullEnd: fullStart + m[0].length,
    };
  }
  return last;
}

// DOM 텍스트를 하나로 잇고, 전역 오프셋 → (텍스트노드, 노드내 오프셋) 매핑을 만든다.
function buildTextIndex(root: Node) {
  const map: { node: Text; start: number }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text = '';
  let n: Node | null;
  while ((n = walker.nextNode())) {
    map.push({ node: n as Text, start: text.length });
    text += (n as Text).data;
  }
  return { text, map };
}

function locate(map: { node: Text; start: number }[], offset: number): { node: Text; offset: number } {
  for (let i = map.length - 1; i >= 0; i--) {
    if (offset >= map[i].start) return { node: map[i].node, offset: offset - map[i].start };
  }
  return { node: map[0].node, offset: 0 };
}

function applyOptsToEl(el: HTMLElement, opts: string) {
  if (!opts) return;
  const re = /([a-zA-Z-]+)=([^\s\]]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(opts))) el.setAttribute(`data-${m[1].toLowerCase()}`, m[2]);
}

/**
 * 살아있는 DOM에서 [fx:이름]...[/fx] 마커를 <span class="fx fx-이름"> 로 감싼다.
 * - 마커가 태그 경계(여러 run/span)를 가로질러도 Range로 정확히 처리.
 * - 안쪽 서식 태그는 보존, 모르는 효과는 원문 유지.
 */
export function wrapMarkersDOM(root: HTMLElement): void {
  const rangeOf = (map: { node: Text; start: number }[], from: number, to: number) => {
    const r = document.createRange();
    const a = locate(map, from);
    const b = locate(map, to);
    r.setStart(a.node, a.offset);
    r.setEnd(b.node, b.offset);
    return r;
  };

  // 매번 다시 인덱싱하면서 "마지막 마커"부터 처리 → 앞쪽 오프셋이 흔들리지 않음
  for (let guard = 0; guard < 2000; guard++) {
    const { text, map } = buildTextIndex(root);
    if (map.length === 0) break;
    const found = findLastKnownMarker(text);
    if (!found) break;

    const contentLen = found.contentEnd - found.contentStart;

    // 1) 닫는 마커([/fx]) → 여는 마커([fx:..]) 순으로 삭제 (뒤쪽부터 지워 오프셋 보존)
    const close = rangeOf(map, found.contentEnd, found.fullEnd);
    const open = rangeOf(map, found.fullStart, found.contentStart);
    close.deleteContents();
    open.deleteContents();

    // 2) 마커가 사라진 자리의 내용만 다시 잡아 span으로 감싼다
    const after = buildTextIndex(root);
    const span = document.createElement('span');
    span.className = `fx fx-${found.name}`;
    span.setAttribute('data-fx', found.name);
    applyOptsToEl(span, found.opts);

    const content = rangeOf(after.map, found.fullStart, found.fullStart + contentLen);
    span.appendChild(content.extractContents());
    content.insertNode(span);
  }

  // 변환 과정에서 생긴 빈 껍데기 span(속성 없음·내용 없음) 정리
  root.querySelectorAll('span').forEach((s) => {
    if (s.attributes.length === 0 && s.childElementCount === 0 && (s.textContent ?? '') === '') {
      s.remove();
    }
  });
}

/**
 * [fx:이름]...[/fx] 마커를 span으로 변환(문자열 → 문자열).
 * 브라우저에서는 DOM 기반(robust), 서버에서는 가벼운 정규식 폴백을 사용.
 */
export function convertMarkers(html: string): string {
  if (!html || !hasMarkers(html)) return html;

  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = html;
    wrapMarkersDOM(container);
    return container.innerHTML;
  }

  // 서버 폴백(태그 경계를 넘는 분할은 보장 못 하지만 단순 케이스 처리)
  return html.replace(FULL_MARKER, (m, name: string, opts: string, inner: string) => {
    const fx = name.toLowerCase();
    if (!KNOWN_FX.has(fx)) return m;
    return `<span class="fx fx-${fx}" data-fx="${fx}"${optsToData(opts)}>${inner}</span>`;
  });
}
