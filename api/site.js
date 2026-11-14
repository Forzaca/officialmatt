import { wrap, ok, fail, query, readJson, clean, sameOrigin } from '../lib/http.js';
import { readDoc, updateDoc, sendFile } from '../lib/store.js';
import { readSession, isBanned, ADMIN_ID } from '../lib/session.js';
import { getSettings, publicSettings, publicReview, publicOrder, sortWork, PRIOR_COMPLETED } from '../lib/data.js';

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|embed|headless|lighthouse|monitor/i;

function bump(map, key, max = 120) {
  if (!key) return;
  if (map[key] === undefined && Object.keys(map).length >= max) key = '(other)';
  map[key] = (map[key] || 0) + 1;
}

const day = (d = new Date()) => d.toISOString().slice(0, 10);

async function bootstrap(req, res) {
  const settings = publicSettings(await getSettings());
  const session = readSession(req);
  let viewer = null;
  let isAdmin = false;
  if (session && !(await isBanned(session.id))) {
    viewer = { id: session.id, username: session.username, name: session.name, avatar: session.avatar };
    isAdmin = session.id === ADMIN_ID();
  }
  ok(res, { ok: true, settings, viewer, isAdmin, adminId: ADMIN_ID() });
}

async function work(req, res) {
  const list = sortWork(await readDoc('work', [])).filter((w) => !w.hidden);
  ok(res, {
    ok: true,
    work: list.map(({ id, title, category, description, images, link, tags, featured, year, client, createdAt }) => ({
      id, title, category, description, images, link, tags, featured, year, client, createdAt,
    })),
  });
}

async function servers(req, res) {
  const list = await readDoc('servers', []);
  ok(res, { ok: true, servers: list.filter((s) => s.logo).map(({ name, logo }) => ({ name, logo })) });
}

async function reviews(req, res) {
  const all = await readDoc('reviews', []);
  const approved = all.filter((r) => r.status === 'approved').sort((a, b) => (b.approvedAt || b.createdAt) - (a.approvedAt || a.createdAt));
  const count = approved.length;
  const average = count ? approved.reduce((s, r) => s + r.rating, 0) / count : 0;
  const breakdown = [5, 4, 3, 2, 1].map((n) => ({ stars: n, count: approved.filter((r) => r.rating === n).length }));
  ok(res, { ok: true, reviews: approved.map(publicReview), summary: { count, average: Math.round(average * 10) / 10, breakdown } });
}

async function orders(req, res) {
  const all = await readDoc('orders', []);
  const active = all.filter((o) => o.status !== 'completed').sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.createdAt - b.createdAt);
  const completed = all.filter((o) => o.status === 'completed').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, 40);
  ok(res, { ok: true, active: active.map(publicOrder), completed: completed.map(publicOrder), totalCompleted: PRIOR_COMPLETED + all.filter((o) => o.status === 'completed').length });
}

async function track(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'POST only.');
  if (!sameOrigin(req)) return ok(res, { ok: true, skipped: true });
  const ua = req.headers['user-agent'] || '';
  if (BOT_UA.test(ua)) return ok(res, { ok: true, skipped: true });

  const body = await readJson(req, 4096);
  const path = clean(body.path, 120).split('?')[0] || '/';
  if (path.startsWith('/admin') || path.startsWith('/api')) return ok(res, { ok: true, skipped: true });

  let ref = '';
  try {
    if (body.ref) {
      const host = new URL(body.ref).hostname.replace(/^www\./, '');
      if (host && host !== (req.headers.host || '').replace(/^www\./, '')) ref = host.slice(0, 80);
    }
  } catch {  }

  const device = /Mobi|Android|iPhone|iPod/i.test(ua) ? 'Mobile' : /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Desktop';
  const country = (req.headers['x-vercel-ip-country'] || '').toString().slice(0, 2).toUpperCase() || '';

  await updateDoc(`analytics-${day()}`, {}, (d) => {
    d.views = (d.views || 0) + 1;
    if (body.newVisitor) d.visitors = (d.visitors || 0) + 1;
    d.pages ||= {}; d.refs ||= {}; d.devices ||= {}; d.countries ||= {};
    bump(d.pages, path);
    bump(d.refs, ref || 'Direct');
    bump(d.devices, device, 5);
    if (country) bump(d.countries, country, 80);
    return d;
  });
  ok(res);
}

async function file(req, res) {
  const sent = await sendFile(res, String(query(req).p || ''));
  if (!sent) fail(res, 404, 'File not found.');
}

const ops = { bootstrap, work, servers, reviews, orders, track, file };

export default wrap(async (req, res) => {
  const fn = ops[query(req).op];
  if (!fn) return fail(res, 404, 'Unknown operation.');
  await fn(req, res);
});
