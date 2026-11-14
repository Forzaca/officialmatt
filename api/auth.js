import { randomBytes } from 'node:crypto';
import { wrap, ok, fail, redirect, query, cookie, parseCookies, sameOrigin } from '../lib/http.js';
import { createSessionCookie, clearSessionCookie, readSession, isBanned, ADMIN_ID, avatarUrl } from '../lib/session.js';
import { updateDoc } from '../lib/store.js';

const STATE_COOKIE = 'mp_oauth';

function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value.slice(0, 200);
}

function withParam(path, key, value) {
  const u = new URL(path, 'http://x');
  u.searchParams.set(key, value);
  return u.pathname + u.search + u.hash;
}

function redirectUri(req) {
  if (process.env.DISCORD_REDIRECT_URI) return process.env.DISCORD_REDIRECT_URI;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}/api/auth/callback`;
}

async function login(req, res) {
  const { next } = query(req);
  if (!process.env.DISCORD_CLIENT_ID) return redirect(res, withParam(safeNext(next), 'auth', 'unconfigured'));
  const state = randomBytes(18).toString('base64url');
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(req),
    scope: 'identify',
    state,
    prompt: 'none',
  });
  const stateCookie = cookie(STATE_COOKIE, `${state}|${safeNext(next)}`, { maxAge: 600 });
  redirect(res, `https://discord.com/oauth2/authorize?${params}`, [stateCookie]);
}

async function callback(req, res) {
  const q = query(req);
  const [savedState, savedNext] = (parseCookies(req)[STATE_COOKIE] || '').split('|');
  const next = safeNext(savedNext);
  const clearState = cookie(STATE_COOKIE, '', { maxAge: 0 });

  if (q.error) return redirect(res, withParam(next, 'auth', 'cancelled'), [clearState]);
  if (!q.code || !q.state || q.state !== savedState) return redirect(res, withParam(next, 'auth', 'expired'), [clearState]);

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET || '',
      grant_type: 'authorization_code',
      code: q.code,
      redirect_uri: redirectUri(req),
    }),
  });
  if (!tokenRes.ok) {
    console.error('Discord token exchange failed', tokenRes.status, await tokenRes.text().catch(() => ''));
    return redirect(res, withParam(next, 'auth', 'failed'), [clearState]);
  }
  const { access_token, token_type } = await tokenRes.json();

  const meRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `${token_type || 'Bearer'} ${access_token}` },
  });
  if (!meRes.ok) return redirect(res, withParam(next, 'auth', 'failed'), [clearState]);
  const me = await meRes.json();

  if (await isBanned(me.id)) return redirect(res, withParam(next, 'auth', 'banned'), [clearState, clearSessionCookie()]);

  const user = {
    id: me.id,
    username: me.username,
    name: me.global_name || me.username,
    avatar: avatarUrl(me.id, me.avatar, 128),
  };

  try {
    await updateDoc('users', {}, (users) => {
      const prev = users[me.id] || { logins: 0, firstSeen: Date.now() };
      users[me.id] = { ...prev, username: user.username, name: user.name, avatar: user.avatar, lastLogin: Date.now(), logins: prev.logins + 1 };
      const ids = Object.keys(users);
      if (ids.length > 800) {
        ids.sort((a, b) => users[a].lastLogin - users[b].lastLogin).slice(0, ids.length - 800).forEach((id) => delete users[id]);
      }
      return users;
    });
  } catch (err) {
    console.error('Could not record login', err);
  }

  redirect(res, withParam(next, 'auth', 'ok'), [clearState, createSessionCookie(user)]);
}

async function logout(req, res) {
  if (req.method === 'POST') {
    if (!sameOrigin(req)) return fail(res, 403, 'Bad origin.');
    res.setHeader('Set-Cookie', clearSessionCookie());
    return ok(res);
  }
  redirect(res, '/', [clearSessionCookie()]);
}

async function me(req, res) {
  const user = readSession(req);
  if (!user) return ok(res, { ok: true, user: null, isAdmin: false });
  const banned = await isBanned(user.id);
  if (banned) {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return ok(res, { ok: true, user: null, isAdmin: false, banned: true });
  }
  const { id, username, name, avatar } = user;
  ok(res, { ok: true, user: { id, username, name, avatar }, isAdmin: id === ADMIN_ID() });
}

const actions = { login, callback, logout, me };

export default wrap(async (req, res) => {
  const action = query(req).action;
  const fn = actions[action];
  if (!fn) return fail(res, 404, 'Unknown auth action.');
  await fn(req, res);
});
