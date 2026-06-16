import 'server-only';
import { createClient, type Client } from '@libsql/client';

const globalForDb = globalThis as unknown as { _db?: Client; _ready?: Promise<void> };

function client(): Client {
  if (!globalForDb._db) {
    const url = process.env.DATABASE_URL || 'file:./dev.db';
    globalForDb._db = createClient({ url });
  }
  return globalForDb._db;
}

// 테이블이 없으면 생성 (최초 1회)
export async function ensureSchema(): Promise<void> {
  if (!globalForDb._ready) {
    globalForDb._ready = (async () => {
      const db = client();
      await db.execute(`CREATE TABLE IF NOT EXISTS novels (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        coverImage TEXT,
        status TEXT NOT NULL DEFAULT '연재중',
        published INTEGER NOT NULL DEFAULT 1,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      await db.execute(`CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        novelId TEXT NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        contentHtml TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(novelId, number),
        FOREIGN KEY(novelId) REFERENCES novels(id) ON DELETE CASCADE
      )`);
    })();
  }
  return globalForDb._ready;
}

export type Novel = {
  id: string; slug: string; title: string; author: string;
  description: string; coverImage: string | null; status: string;
  published: number; sortOrder: number; createdAt: string; updatedAt: string;
};

export type Chapter = {
  id: string; novelId: string; number: number; title: string;
  contentHtml: string; published: number; createdAt: string; updatedAt: string;
};

function rowToNovel(r: any): Novel { return r as Novel; }
function rowToChapter(r: any): Chapter { return r as Chapter; }

// ---------- Novels ----------
export async function listNovels(opts: { includeUnpublished?: boolean } = {}): Promise<Novel[]> {
  await ensureSchema();
  const sql = opts.includeUnpublished
    ? `SELECT * FROM novels ORDER BY sortOrder ASC, createdAt DESC`
    : `SELECT * FROM novels WHERE published = 1 ORDER BY sortOrder ASC, createdAt DESC`;
  const res = await client().execute(sql);
  return res.rows.map(rowToNovel);
}

export async function getNovel(id: string): Promise<Novel | null> {
  await ensureSchema();
  const res = await client().execute({ sql: `SELECT * FROM novels WHERE id = ?`, args: [id] });
  return res.rows[0] ? rowToNovel(res.rows[0]) : null;
}

export async function getNovelBySlug(slug: string): Promise<Novel | null> {
  await ensureSchema();
  const res = await client().execute({ sql: `SELECT * FROM novels WHERE slug = ?`, args: [slug] });
  return res.rows[0] ? rowToNovel(res.rows[0]) : null;
}

export async function createNovel(data: {
  slug: string; title: string; author?: string; description?: string;
  coverImage?: string | null; status?: string; published?: boolean; sortOrder?: number;
}): Promise<Novel> {
  await ensureSchema();
  const id = crypto.randomUUID();
  await client().execute({
    sql: `INSERT INTO novels (id, slug, title, author, description, coverImage, status, published, sortOrder)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.slug, data.title, data.author ?? '', data.description ?? '',
           data.coverImage ?? null, data.status ?? '연재중',
           data.published === false ? 0 : 1, data.sortOrder ?? 0],
  });
  return (await getNovel(id))!;
}

export async function updateNovel(id: string, data: Partial<{
  slug: string; title: string; author: string; description: string;
  coverImage: string | null; status: string; published: boolean; sortOrder: number;
}>): Promise<Novel | null> {
  await ensureSchema();
  const fields: string[] = []; const args: any[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    args.push(k === 'published' ? (v ? 1 : 0) : v);
  }
  if (fields.length) {
    fields.push(`updatedAt = datetime('now')`);
    args.push(id);
    await client().execute({ sql: `UPDATE novels SET ${fields.join(', ')} WHERE id = ?`, args });
  }
  return getNovel(id);
}

export async function deleteNovel(id: string): Promise<void> {
  await ensureSchema();
  await client().execute({ sql: `DELETE FROM chapters WHERE novelId = ?`, args: [id] });
  await client().execute({ sql: `DELETE FROM novels WHERE id = ?`, args: [id] });
}

// ---------- Chapters ----------
export async function listChapters(novelId: string, opts: { includeUnpublished?: boolean } = {}): Promise<Chapter[]> {
  await ensureSchema();
  const sql = opts.includeUnpublished
    ? `SELECT * FROM chapters WHERE novelId = ? ORDER BY number ASC`
    : `SELECT * FROM chapters WHERE novelId = ? AND published = 1 ORDER BY number ASC`;
  const res = await client().execute({ sql, args: [novelId] });
  return res.rows.map(rowToChapter);
}

export async function getChapter(id: string): Promise<Chapter | null> {
  await ensureSchema();
  const res = await client().execute({ sql: `SELECT * FROM chapters WHERE id = ?`, args: [id] });
  return res.rows[0] ? rowToChapter(res.rows[0]) : null;
}

export async function getChapterByNumber(novelId: string, number: number): Promise<Chapter | null> {
  await ensureSchema();
  const res = await client().execute({ sql: `SELECT * FROM chapters WHERE novelId = ? AND number = ?`, args: [novelId, number] });
  return res.rows[0] ? rowToChapter(res.rows[0]) : null;
}

export async function createChapter(data: {
  novelId: string; number: number; title: string; contentHtml: string; published?: boolean;
}): Promise<Chapter> {
  await ensureSchema();
  const id = crypto.randomUUID();
  await client().execute({
    sql: `INSERT INTO chapters (id, novelId, number, title, contentHtml, published)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, data.novelId, data.number, data.title, data.contentHtml, data.published === false ? 0 : 1],
  });
  return (await getChapter(id))!;
}

export async function updateChapter(id: string, data: Partial<{
  number: number; title: string; contentHtml: string; published: boolean;
}>): Promise<Chapter | null> {
  await ensureSchema();
  const fields: string[] = []; const args: any[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    args.push(k === 'published' ? (v ? 1 : 0) : v);
  }
  if (fields.length) {
    fields.push(`updatedAt = datetime('now')`);
    args.push(id);
    await client().execute({ sql: `UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, args });
  }
  return getChapter(id);
}

export async function deleteChapter(id: string): Promise<void> {
  await ensureSchema();
  await client().execute({ sql: `DELETE FROM chapters WHERE id = ?`, args: [id] });
}
