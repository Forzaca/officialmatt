export const MAX_JSON_BYTES = 4 * 1024 * 1024;

export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

export const ok = (res, data = { ok: true }) => send(res, 200, data);
export const fail = (res, status, error, extra = {}) => send(res, status, { ok: false, error, ...extra });

export function redirect(res, location, cookies = []) {
  res.statusCode = 302;
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

export async function readRaw(req, limit = MAX_JSON_BYTES) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const err = new Error('Payload too large');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req, limit = MAX_JSON_BYTES) {
  const buf = await readRaw(req, limit);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    const err = new Error('Invalid JSON');
    err.status = 400;
    throw err;
  }
}

export function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}

export function cookie(name, value, { maxAge, httpOnly = true, path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'SameSite=Lax', 'Secure'];
  if (httpOnly) parts.push('HttpOnly');
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

export function query(req) {
  const url = new URL(req.url, 'http://local');
  return Object.fromEntries(url.searchParams.entries());
}

export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function clean(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

export function uid(prefix = '') {
  const rand = crypto.getRandomValues(new Uint8Array(6));
  return prefix + Date.now().toString(36) + Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      if (!res.headersSent) fail(res, status, status >= 500 ? 'Something went wrong on our side.' : err.message);
    }
  };
}
