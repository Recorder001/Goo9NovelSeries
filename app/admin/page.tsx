'use client';
import { useCallback, useEffect, useState } from 'react';
import { convertMarkers, EFFECTS } from '@/lib/effects';
import EffectEditor from '@/components/EffectEditor';

type Novel = {
  id: string; slug: string; title: string; author: string; description: string;
  coverImage: string | null; status: string; published: number; sortOrder: number;
};
type Chapter = { id: string; novelId: string; number: number; title: string; published: number; contentHtml: string };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청 실패');
  return data;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// docx → 자체 포함 HTML (색·정렬·폰트·이미지 보존)
async function convertDocx(file: File): Promise<string> {
  const { renderAsync } = await import('docx-preview');
  const container = document.createElement('div');
  await renderAsync(file, container, undefined, {
    className: 'docx',
    inWrapper: true,
    ignoreWidth: true,
    ignoreHeight: true,
    breakPages: false,
    ignoreLastRenderedPageBreak: true,
    useBase64URL: true,
    renderHeaders: false,
    renderFooters: false,
  } as any);
  return container.innerHTML;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');

  useEffect(() => {
    api('/api/auth/me').then((d) => setAuthed(d.authed)).catch(() => setAuthed(false));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr('');
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
      setAuthed(true);
    } catch (err: any) { setLoginErr(err.message); }
  }
  async function logout() { await api('/api/auth/logout', { method: 'POST' }); setAuthed(false); }

  if (authed === null) return <div className="mx-auto max-w-md px-5 py-24 text-center text-[var(--muted)]">불러오는 중…</div>;

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm px-5 py-24">
        <h1 className="font-serif text-2xl font-extrabold mb-6">관리자 로그인</h1>
        <form onSubmit={login} className="space-y-3">
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호" autoFocus
            className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 bg-[var(--surface)]"
          />
          {loginErr && <p className="text-sm text-red-600">{loginErr}</p>}
          <button className="w-full rounded-lg bg-[var(--accent)] text-white px-4 py-2.5">로그인</button>
        </form>
        <p className="mt-4 text-xs text-[var(--muted)]">비밀번호는 Railway 환경변수 ADMIN_PASSWORD 값입니다.</p>
      </div>
    );
  }

  return <Dashboard onLogout={logout} />;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selected, setSelected] = useState<Novel | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const list = await api('/api/novels');
    setNovels(list);
    setSelected((cur) => (cur ? list.find((n: Novel) => n.id === cur.id) || null : null));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-extrabold">관리</h1>
        <button onClick={onLogout} className="text-sm text-[var(--muted)] hover:text-[var(--text)]">로그아웃</button>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <aside>
          <button
            onClick={() => { setCreating(true); setSelected(null); }}
            className="w-full rounded-lg bg-[var(--accent)] text-white px-4 py-2.5 text-sm mb-3"
          >+ 새 작품</button>
          <ul className="space-y-1">
            {novels.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => { setSelected(n); setCreating(false); }}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-sm border transition ${selected?.id === n.id ? 'border-[var(--accent)] bg-[var(--bg)]' : 'border-transparent hover:bg-[var(--bg)]'}`}
                >
                  <span className="font-medium">{n.title}</span>
                  {!n.published && <span className="ml-2 text-xs text-[var(--muted)]">(비공개)</span>}
                </button>
              </li>
            ))}
            {novels.length === 0 && <li className="text-sm text-[var(--muted)] px-3 py-2">작품이 없습니다.</li>}
          </ul>
        </aside>

        <section>
          {creating && <NovelForm onSaved={async () => { setCreating(false); await load(); }} onCancel={() => setCreating(false)} />}
          {selected && !creating && <NovelEditor key={selected.id} novel={selected} onChanged={load} />}
          {!creating && !selected && <p className="text-[var(--muted)] py-16 text-center">왼쪽에서 작품을 선택하거나 새로 추가하세요.</p>}
        </section>
      </div>
    </div>
  );
}

const input = 'w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--surface)] text-sm';
const label = 'block text-sm font-medium mb-1';

function NovelForm({ novel, onSaved, onCancel }: { novel?: Novel; onSaved: () => void; onCancel?: () => void }) {
  const [f, setF] = useState({
    slug: novel?.slug || '', title: novel?.title || '', author: novel?.author || '',
    description: novel?.description || '', status: novel?.status || '연재중',
    published: novel ? !!novel.published : true, coverImage: novel?.coverImage || null as string | null,
    sortOrder: novel?.sortOrder || 0,
  });
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      if (novel) await api(`/api/novels/${novel.id}`, { method: 'PUT', body: JSON.stringify(f) });
      else await api('/api/novels', { method: 'POST', body: JSON.stringify(f) });
      onSaved();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }
  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setF((s) => ({ ...s, coverImage: '' })); // 로딩 표시용
    const url = await fileToDataURL(file);
    setF((s) => ({ ...s, coverImage: url }));
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-bold">{novel ? '작품 정보 수정' : '새 작품'}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className={label}>제목</label><input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
        <div><label className={label}>주소(slug) <span className="text-[var(--muted)] font-normal">영문/숫자</span></label><input className={input} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '') })} placeholder="my-novel" required /></div>
        <div><label className={label}>작가명</label><input className={input} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></div>
        <div><label className={label}>상태</label>
          <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option>연재중</option><option>완결</option><option>휴재</option>
          </select>
        </div>
      </div>
      <div><label className={label}>소개</label><textarea className={input} rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <div>
          <label className={label}>표지 이미지</label>
          <input type="file" accept="image/*" onChange={onCover} className="text-sm" />
          {f.coverImage && <img src={f.coverImage} alt="cover" className="mt-2 w-24 rounded-lg border border-[var(--border)]" />}
        </div>
        <div>
          <label className={label}>정렬 순서 <span className="text-[var(--muted)] font-normal">작을수록 앞</span></label>
          <input type="number" className={input} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} />
          <label className="flex items-center gap-2 mt-3 text-sm">
            <input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> 공개
          </label>
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button disabled={saving} className="rounded-lg bg-[var(--accent)] text-white px-5 py-2.5 text-sm disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm">취소</button>}
      </div>
    </form>
  );
}

function NovelEditor({ novel, onChanged }: { novel: Novel; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const loadCh = useCallback(async () => {
    setChapters(await api(`/api/chapters?novelId=${novel.id}`));
  }, [novel.id]);
  useEffect(() => { loadCh(); }, [loadCh]);

  async function del() {
    if (!confirm(`'${novel.title}' 작품과 모든 회차를 삭제할까요?`)) return;
    await api(`/api/novels/${novel.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="space-y-6">
      {editing ? (
        <NovelForm novel={novel} onSaved={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-extrabold">{novel.title}</h2>
              <p className="text-sm text-[var(--muted)] mt-1">/novel/{novel.slug} · {novel.status} · {novel.published ? '공개' : '비공개'}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setEditing(true)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">수정</button>
              <button onClick={del} className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-sm">삭제</button>
            </div>
          </div>
        </div>
      )}

      <ChapterManager novel={novel} chapters={chapters} reload={loadCh} />
    </div>
  );
}

function ChapterManager({ novel, chapters, reload }: { novel: Novel; chapters: Chapter[]; reload: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">회차 <span className="text-[var(--muted)] font-normal">({chapters.length})</span></h3>
        <button onClick={() => setAdding((v) => !v)} className="rounded-lg bg-[var(--accent)] text-white px-3 py-1.5 text-sm">{adding ? '닫기' : '+ 회차 추가'}</button>
      </div>

      {adding && (
        <ChapterForm
          novel={novel}
          nextNumber={(chapters.reduce((m, c) => Math.max(m, c.number), 0) || 0) + 1}
          onSaved={() => { setAdding(false); reload(); }}
        />
      )}

      <ul className="divide-y divide-[var(--border)] mt-2">
        {chapters.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-3">
            <span className="text-sm text-[var(--muted)] w-12">{c.number}화</span>
            <span className="flex-1 text-sm">{c.title}</span>
            {!c.published && <span className="text-xs text-[var(--muted)]">비공개</span>}
            <button
              onClick={async () => { if (confirm('이 회차를 삭제할까요?')) { await api(`/api/chapters/${c.id}`, { method: 'DELETE' }); reload(); } }}
              className="text-xs text-red-600 hover:underline"
            >삭제</button>
          </li>
        ))}
        {chapters.length === 0 && !adding && <li className="text-sm text-[var(--muted)] py-6 text-center">회차가 없습니다.</li>}
      </ul>
    </div>
  );
}

function FxHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="font-medium">✨ 글자 특수효과 사용법</span>
        <span className="text-[var(--muted)]">{open ? '닫기 ▲' : '열기 ▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-[var(--muted)]">
            원고(.docx)에서 효과를 줄 부분을 아래처럼 감싸면 됩니다. 마커는 서식(굵게·색 등) 변화 없이 한 번에 입력하세요.
          </p>
          <pre className="rounded-md bg-[var(--bg)] border border-[var(--border)] p-2 overflow-auto text-xs">{`[fx:shake]덜덜 떨리는 손[/fx]
[fx:dust]스크롤하면 가루가 되어 사라진다[/fx]
[fx:wave speed=slow]천천히 출렁이는 글자[/fx]`}</pre>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
            {EFFECTS.map((e) => (
              <li key={e.name} className="flex gap-2">
                <code className="shrink-0 rounded bg-[var(--bg)] px-1.5 py-0.5 text-xs">{e.name}</code>
                <span className="text-[var(--muted)]">{e.label} · {e.desc}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--muted)]">
            옵션: <code className="rounded bg-[var(--bg)] px-1 py-0.5">speed=slow|normal|fast</code> (애니메이션 속도).
            아래 미리보기에서 표시 결과를 확인할 수 있어요(가루·등장 등 스크롤 연동 효과는 완성 상태로 보여줍니다).
          </p>
        </div>
      )}
    </div>
  );
}

function ChapterForm({ novel, nextNumber, onSaved }: { novel: Novel; nextNumber: number; onSaved: () => void }) {
  const [number, setNumber] = useState(nextNumber);
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [fileName, setFileName] = useState('');
  const [converting, setConverting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [importHtml, setImportHtml] = useState('');
  const [importNonce, setImportNonce] = useState(0);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(''); setConverting(true); setFileName(file.name);
    try {
      const out = convertMarkers(await convertDocx(file));
      setImportHtml(out);
      setImportNonce((n) => n + 1); // 에디터로 불러오기
      if (!title) setTitle(file.name.replace(/\.docx$/i, ''));
    } catch (e: any) { setErr('변환 실패: ' + e.message); } finally { setConverting(false); }
  }

  async function save() {
    setErr('');
    if (!html || !html.replace(/<[^>]*>/g, '').trim()) { setErr('내용을 입력하거나 docx를 불러오세요.'); return; }
    if (!title) { setErr('제목을 입력하세요.'); return; }
    setSaving(true);
    try {
      await api('/api/chapters', { method: 'POST', body: JSON.stringify({ novelId: novel.id, number, title, contentHtml: html }) });
      onSaved();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] p-4 mb-4 bg-[var(--bg)]">
      <div className="grid sm:grid-cols-[100px_1fr] gap-3">
        <div><label className={label}>회차</label><input type="number" className={input} value={number} onChange={(e) => setNumber(Number(e.target.value))} /></div>
        <div><label className={label}>회차 제목</label><input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 1화 - 시작" /></div>
      </div>
      <div className="mt-3">
        <label className={label}>원고 불러오기 (.docx) <span className="text-[var(--muted)] font-normal">— 또는 아래 에디터에 직접 작성</span></label>
        <input type="file" accept=".docx" onChange={onFile} className="text-sm" />
        {fileName && <span className="ml-2 text-xs text-[var(--muted)]">{fileName}</span>}
        {converting && <p className="text-sm text-[var(--muted)] mt-1">변환 중…</p>}
      </div>
      <FxHelp />
      <div className="mt-3">
        <label className={label}>본문</label>
        <EffectEditor onChange={setHtml} importHtml={importHtml} importNonce={importNonce} />
      </div>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      <button onClick={save} disabled={saving || converting} className="mt-3 rounded-lg bg-[var(--accent)] text-white px-5 py-2.5 text-sm disabled:opacity-50">
        {saving ? '저장 중…' : '회차 저장'}
      </button>
    </div>
  );
}
