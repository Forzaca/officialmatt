import { put, del, head, get, list } from '@vercel/blob';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';

const recentWrites = new Map();
const WRITE_MEMORY_MS = 20_000;
let knownBase = null;

const token = () => process.env.BLOB_READ_WRITE_TOKEN || '';

// Works with both public and private Blob stores. Set BLOB_ACCESS=private|public
// to skip detection; otherwise it is worked out from the store itself.
let mode = /^(public|private)$/.test(process.env.BLOB_ACCESS || '') ? process.env.BLOB_ACCESS : null;
let detecting = null;
const accessMismatch = (e) => /(public|private) access on a (private|public) store/i.test(e?.message || '');
const modeFromUrl = (url) => (/\.private\.blob\.vercel-storage\.com/i.test(url) ? 'private' : 'public');

async function detectMode() {
  if (mode || !blobConfigured()) return mode;
  detecting ||= list({ limit: 1 })
    .then((r) => { if (r.blobs[0]?.url) mode = modeFromUrl(r.blobs[0].url); return mode; })
    .catch(() => mode)
    .finally(() => { detecting = null; });
  return detecting;
}

async function putAuto(pathname, body, opts) {
  const first = mode || 'public';
  try {
    const r = await put(pathname, body, { ...opts, access: first });
    mode = first;
    return r;
  } catch (e) {
    if (!accessMismatch(e)) throw e;
    mode = first === 'public' ? 'private' : 'public';
    return put(pathname, body, { ...opts, access: mode });
  }
}

const FILE_ROUTE = '/api/site?op=file&p=';
const FILE_PATH = /^(work|reviews)\/[A-Za-z0-9._-]{1,200}$/;
export const filePathFromUrl = (url) => {
  if (typeof url !== 'string' || !url.startsWith(FILE_ROUTE)) return null;
  const p = decodeURIComponent(url.slice(FILE_ROUTE.length));
  return FILE_PATH.test(p) ? p : null;
};

/** Streams a private-store image to the response. Only work/ and reviews/ files are reachable. */
export async function sendFile(res, pathname) {
  if (!FILE_PATH.test(pathname || '')) return false;
  const r = await get(pathname, { access: 'private' });
  if (!r || r.statusCode !== 200) return false;
  res.statusCode = 200;
  res.setHeader('Content-Type', r.blob.contentType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (r.blob.size) res.setHeader('Content-Length', String(r.blob.size));
  await new Promise((resolve, reject) => {
    Readable.fromWeb(r.stream).on('error', reject).pipe(res).on('finish', resolve).on('error', reject);
  });
  return true;
}
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

async function readPrivate(pathname, fallback) {
  const r = await get(pathname, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return clone(fallback);
  return JSON.parse(await new Response(r.stream).text());
}

export async function readDoc(name, fallback) {
  if (!blobConfigured()) return clone(fallback);
  const mem = recentWrites.get(name);
  if (mem && Date.now() - mem.at < WRITE_MEMORY_MS) return clone(mem.value);

  const pathname = dataPath(name);
  await detectMode();
  if (mode === 'private') return readPrivate(pathname, fallback);
  const base = blobBase();
  try {
    if (!base) throw new Error('no base');
    const out = await fetchJson(`${base}/${pathname}`);
    return out.missing ? clone(fallback) : out.value;
  } catch (err) {
    try {
      const meta = await head(pathname);
      if (modeFromUrl(meta.url) === 'private') { mode = 'private'; return readPrivate(pathname, fallback); }
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
  const result = await putAuto(dataPath(name), JSON.stringify(value), {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
  if (mode === 'public') knownBase = new URL(result.url).origin;
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
  const result = await putAuto(pathname, body, {
    addRandomSuffix: true,
    contentType,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  if (mode === 'private') return { ...result, url: FILE_ROUTE + encodeURIComponent(result.pathname) };
  knownBase = new URL(result.url).origin;
  return result;
}

export function isOurBlobUrl(url) {
  if (filePathFromUrl(url)) return true;
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
  const targets = (urls || []).filter(isOurBlobUrl).map((u) => filePathFromUrl(u) || u);
  if (!targets.length) return;
  try {
    await del(targets);
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
