import { put, del, head } from '@vercel/blob';
import { createHash } from 'node:crypto';

const recentWrites = new Map();
const WRITE_MEMORY_MS = 20_000;
let knownBase = null;

const token = () => process.env.BLOB_READ_WRITE_TOKEN || '';
export const blobConfigured = () => Boolean(token());

function dataKey() {
  const raw = process.env.DATA_KEY || createHash('sha256').update('mp:' + token()).digest('hex').slice(0, 24);
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'default';
}

export const dataPath = (name) => `data/${dataKey()}/${name}.json`;

function derivedBase() {
  if (process.env.BLOB_PUBLIC_BASE) return process.env.BLOB_PUBLIC_BASE.replace(/\/+$/, '');
  const m = token().match(/^vercel_blob_rw_([a-z0-9]+)_/i);
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com` : null;
}

export function blobBase() {
  return knownBase || derivedBase();
}

const clone = (v) => (v === undefined ? v : structuredClone(v));

async function fetchJson(url) {
  const r = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (r.status === 404 || r.status === 403) return { missing: true };
  if (!r.ok) throw new Error(`Blob read failed (${r.status})`);
  return { value: await r.json() };
}

export async function readDoc(name, fallback) {
  if (!blobConfigured()) return clone(fallback);
  const mem = recentWrites.get(name);
  if (mem && Date.now() - mem.at < WRITE_MEMORY_MS) return clone(mem.value);

  const pathname = dataPath(name);
  const base = blobBase();
  try {
    if (!base) throw new Error('no base');
    const out = await fetchJson(`${base}/${pathname}`);
    return out.missing ? clone(fallback) : out.value;
  } catch (err) {
    try {
      const meta = await head(pathname);
      knownBase = new URL(meta.url).origin;
      const out = await fetchJson(meta.url);
      return out.missing ? clone(fallback) : out.value;
    } catch (e) {
      if (e?.name === 'BlobNotFoundError' || /not.?found/i.test(e?.message || '')) return clone(fallback);
      throw e;
    }
  }
}

export async function writeDoc(name, value) {
  if (!blobConfigured()) {
    const err = new Error('Storage is not configured (BLOB_READ_WRITE_TOKEN missing).');
    err.status = 503;
    throw err;
  }
  const result = await put(dataPath(name), JSON.stringify(value), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
  knownBase = new URL(result.url).origin;
  recentWrites.set(name, { value: clone(value), at: Date.now() });
  return value;
}

export async function updateDoc(name, fallback, mutate) {
  const current = await readDoc(name, fallback);
  const next = (await mutate(current)) ?? current;
  await writeDoc(name, next);
  return next;
}

export async function uploadFile(pathname, body, contentType) {
  if (!blobConfigured()) {
    const err = new Error('Storage is not configured.');
    err.status = 503;
    throw err;
  }
  const result = await put(pathname, body, {
    access: 'public',
    addRandomSuffix: true,
    contentType,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  knownBase = new URL(result.url).origin;
  return result;
}

export function isOurBlobUrl(url) {
  try {
    const u = new URL(url);
    const base = blobBase();
    if (base && url.startsWith(base + '/')) return true;
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export async function removeFiles(urls) {
  const list = (urls || []).filter(isOurBlobUrl);
  if (!list.length) return;
  try {
    await del(list);
  } catch (err) {
    console.error('Blob delete failed', err);
  }
}

export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { type: 'image/png', ext: 'png' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  if (buf.toString('ascii', 0, 4) === 'GIF8') return { type: 'image/gif', ext: 'gif' };
  return null;
}
