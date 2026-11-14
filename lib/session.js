import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseCookies, cookie } from './http.js';
import { readDoc } from './store.js';

export const SESSION_COOKIE = 'mp_session';
const MAX_AGE = 60 * 60 * 24 * 7;

export const ADMIN_ID = () => (process.env.ADMIN_DISCORD_ID || '1272978844248178730').trim();

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    const err = new Error('SESSION_SECRET is missing or too short.');
    err.status = 503;
    throw err;
  }
  return s;
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (data) => createHmac('sha256', secret()).update(data).digest('base64url');

export function createSessionCookie(user) {
  const payload = b64(JSON.stringify({ ...user, iat: Date.now(), exp: Date.now() + MAX_AGE * 1000 }));
  return cookie(SESSION_COOKIE, `${payload}.${sign(payload)}`, { maxAge: MAX_AGE });
}

export const clearSessionCookie = () => cookie(SESSION_COOKIE, '', { maxAge: 0 });

export function readSession(req) {
  const raw = parseCookies(req)[SESSION_COOKIE];
  if (!raw || !raw.includes('.')) return null;
  const [payload, sig] = raw.split('.');
  let expected;
  try { expected = sign(payload); } catch { return null; }
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function isBanned(userId) {
  if (!userId || userId === ADMIN_ID()) return false;
  const bans = await readDoc('bans', []);
  return bans.some((b) => b.userId === userId);
}

export async function requireUser(req) {
  const user = readSession(req);
  if (!user) {
    const err = new Error('Sign in with Discord first.');
    err.status = 401;
    throw err;
  }
  if (await isBanned(user.id)) {
    const err = new Error('This account is not allowed to use the site.');
    err.status = 403;
    throw err;
  }
  return user;
}

export function requireAdmin(req) {
  const user = readSession(req);
  if (!user) {
    const err = new Error('Sign in with Discord first.');
    err.status = 401;
    throw err;
  }
  if (user.id !== ADMIN_ID()) {
    const err = new Error('Not allowed.');
    err.status = 403;
    throw err;
  }
  return user;
}

export function avatarUrl(id, hash, size = 128) {
  if (!hash) {
    const index = Number((BigInt(id || 0) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = hash.startsWith('a_') ? 'gif' : 'webp';
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=${size}`;
}
