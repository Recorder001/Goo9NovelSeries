'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect, useRef, useState } from 'react';
import { EFFECTS } from '@/lib/effects';
import { applyEffects } from '@/lib/applyEffects';
import { FxMark } from '@/lib/tiptap/FxMark';

type Props = {
  initialContent?: string;
  onChange?: (html: string) => void;
  /** docx 가져오기 등 외부에서 내용을 통째로 바꿀 때 값+nonce를 올려보냄 */
  importHtml?: string;
  importNonce?: number;
};

const SPEEDS = [
  { v: 'normal', label: '보통' },
  { v: 'slow', label: '느리게' },
  { v: 'fast', label: '빠르게' },
];

export default function EffectEditor({ initialContent = '', onChange, importHtml, importNonce }: Props) {
  const [preview, setPreview] = useState(false);
  const [fx, setFx] = useState<string>(EFFECTS[0].name);
  const [speed, setSpeed] = useState('normal');
  const [color, setColor] = useState('#27e1ff');
  const previewRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ allowBase64: true }),
      FxMark,
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: { attributes: { class: 'fx-editor-content' } },
  });

  // 외부 가져오기(docx 등) 반영
  useEffect(() => {
    if (!editor || importNonce === undefined) return;
    editor.commands.setContent(importHtml ?? '', { emitUpdate: false });
    onChange?.(editor.getHTML());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importNonce]);

  // 실제 효과 미리보기 렌더(전체 연출 — 별도 영역이라 에디터 DOM을 건드리지 않음)
  useEffect(() => {
    if (!preview || !previewRef.current || !editor) return;
    const el = previewRef.current;
    el.innerHTML = editor.getHTML();
    return applyEffects(el, { preview: true });
  }, [preview, editor]);

  if (!editor) return <div className="text-sm text-[var(--muted)] p-3">에디터 불러오는 중…</div>;

  const tbtn = 'px-2 py-1 rounded border border-[var(--border)] text-xs hover:bg-[var(--bg)] transition';
  const active = (on: boolean) => (on ? ' bg-[var(--bg)] border-[var(--accent)]' : '');

  const applyFx = () =>
    editor.chain().focus().setFx(fx, speed === 'normal' ? undefined : speed, fx === 'neon' ? color : undefined).run();
  const removeFx = () => editor.chain().focus().unsetFx().run();

  return (
    <div className="fx-editor rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] p-2">
        <button type="button" className={tbtn + active(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
        <button type="button" className={tbtn + active(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
        <span className="mx-1 w-px h-5 bg-[var(--border)]" />
        <select value={fx} onChange={(e) => setFx(e.target.value)} className="rounded border border-[var(--border)] bg-[var(--surface)] text-xs px-1.5 py-1" disabled={preview}>
          {EFFECTS.map((e) => (
            <option key={e.name} value={e.name}>{e.label} ({e.name})</option>
          ))}
        </select>
        <select value={speed} onChange={(e) => setSpeed(e.target.value)} className="rounded border border-[var(--border)] bg-[var(--surface)] text-xs px-1.5 py-1" disabled={preview}>
          {SPEEDS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        {fx === 'neon' && (
          <label className="flex items-center gap-1 text-xs" title="네온 발광 색">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-7 rounded border border-[var(--border)] bg-transparent p-0" disabled={preview} />
          </label>
        )}
        <button type="button" className={tbtn} onClick={applyFx} disabled={preview}>효과 적용</button>
        <button type="button" className={tbtn} onClick={removeFx} disabled={preview}>효과 제거</button>
        <span className="flex-1" />
        <button
          type="button"
          className={tbtn + active(preview)}
          onClick={() => setPreview((v) => !v)}
        >
          {preview ? '✎ 편집으로' : '▶ 실제 효과 보기'}
        </button>
      </div>

      {/* 본문: 편집 모드(라벨 표시) ↔ 미리보기 모드(실제 연출) */}
      {preview ? (
        <div ref={previewRef} className="fx-stage reader-content p-4 max-h-[60vh] overflow-auto" />
      ) : (
        <EditorContent editor={editor} />
      )}

      {!preview && (
        <p className="px-3 pb-2 text-xs text-[var(--muted)]">
          효과 줄 부분을 드래그 선택 → 효과·속도 고르고 <b>효과 적용</b>. 점선 밑줄이 효과 표시예요. 움직임은 <b>▶ 실제 효과 보기</b>로 확인하세요.
        </p>
      )}
    </div>
  );
}
