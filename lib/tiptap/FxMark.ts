import { Mark, mergeAttributes } from '@tiptap/core';

// 글자 특수효과를 굵게/기울임처럼 적용/해제할 수 있는 TipTap 마크.
// 렌더 결과는 리더와 동일한 <span class="fx fx-이름" data-fx="이름" [data-speed]>.

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fx: {
      setFx: (name: string, speed?: string, color?: string) => ReturnType;
      unsetFx: () => ReturnType;
    };
  }
}

export const FxMark = Mark.create({
  name: 'fx',
  inclusive: false,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-fx'),
        renderHTML: () => ({}),
      },
      speed: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-speed'),
        renderHTML: () => ({}),
      },
      color: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-color'),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-fx]' }];
  },

  renderHTML({ mark }) {
    const name = mark.attrs.name as string | null;
    const attrs: Record<string, string> = {
      class: `fx fx-${name}`,
      'data-fx': name ?? '',
    };
    if (mark.attrs.speed) attrs['data-speed'] = mark.attrs.speed as string;
    if (mark.attrs.color) attrs['data-color'] = mark.attrs.color as string;
    return ['span', mergeAttributes(attrs), 0];
  },

  addCommands() {
    return {
      setFx:
        (name, speed, color) =>
        ({ commands }) =>
          commands.setMark(this.name, { name, speed: speed || null, color: color || null }),
      unsetFx:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
