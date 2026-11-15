import { wrap, ok, fail, query, readJson, readRaw, clean, uid, sameOrigin } from '../lib/http.js';
import { readDoc, updateDoc, uploadFile, removeFiles, sniffImage, isOurBlobUrl, storeMode, normalizeBlobUrl } from '../lib/store.js';
import { handleUpload } from '@vercel/blob/client';
import { requireAdmin, ADMIN_ID } from '../lib/session.js';
import { getSettings, DEFAULT_SETTINGS, CATEGORIES, ORDER_STATUSES, sortWork } from '../lib/data.js';

const DAY = 86_400_000;
const isoDay = (t) => new Date(t).toISOString().slice(0, 10);
const notFound = (what) => Object.assign(new Error(`${what} not found.`), { status: 404 });

function mergeCounts(target, src) {
  for (const [k, v] of Object.entries(src || {})) target[k] = (target[k] || 0) + v;
}
const top = (map, n = 8) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, value]) => ({ key, value }));

async function overview(req, res) {
  const days = Math.min(90, Math.max(7, Number(query(req).days) || 30));
  const dates = Array.from({ length: days }, (_, i) => isoDay(Date.now() - (days - 1 - i) * DAY));
  const [settings, reviews, work, orders, bans, ...daily] = await Promise.all([
    getSettings(),
    readDoc('reviews', []),
    readDoc('work', []),
    readDoc('orders', []),
    readDoc('bans', []),
    ...dates.map((d) => readDoc(`analytics-${d}`, {}).catch(() => ({}))),
  ]);

  const pages = {}, refs = {}, devices = {}, countries = {};
  const series = dates.map((date, i) => {
    const d = daily[i] || {};
    mergeCounts(pages, d.pages); mergeCounts(refs, d.refs); mergeCounts(devices, d.devices); mergeCounts(countries, d.countries);
    return { date, views: d.views || 0, visitors: d.visitors || 0 };
  });
  const half = Math.floor(days / 2);
  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);

  ok(res, {
    ok: true,
    settings,
    counts: {
      work: work.length,
      reviewsPending: reviews.filter((r) => r.status === 'pending').length,
      reviewsApproved: reviews.filter((r) => r.status === 'approved').length,
      ordersActive: orders.filter((o) => o.status !== 'completed').length,
      ordersCompleted: orders.filter((o) => o.status === 'completed').length,
      bans: bans.length,
    },
    analytics: {
      days,
      series,
      totals: { views: sum(series, 'views'), visitors: sum(series, 'visitors') },
      previous: { views: sum(series.slice(0, half), 'views'), recent: sum(series.slice(-half), 'views') },
      pages: top(pages), refs: top(refs), devices: top(devices, 5), countries: top(countries),
    },
  });
}

const listReviews = async (req, res) => ok(res, { ok: true, reviews: (await readDoc('reviews', [])).sort((a, b) => b.createdAt - a.createdAt) });
const listWork = async (req, res) => ok(res, { ok: true, work: sortWork(await readDoc('work', [])) });
const listOrders = async (req, res) => ok(res, { ok: true, orders: await readDoc('orders', []) });

async function people(req, res) {
  const [bans, users] = await Promise.all([readDoc('bans', []), readDoc('users', {})]);
  const recent = Object.entries(users)
    .map(([id, u]) => ({ id, ...u }))
    .sort((a, b) => b.lastLogin - a.lastLogin)
    .slice(0, 200);
  ok(res, { ok: true, bans, users: recent });
}

async function exportAll(req, res) {
  const [settings, work, reviews, orders, bans, users] = await Promise.all([
    getSettings(), readDoc('work', []), readDoc('reviews', []), readDoc('orders', []), readDoc('bans', []), readDoc('users', {}),
  ]);
  res.setHeader('Content-Disposition', `attachment; filename="portfolio-backup-${isoDay(Date.now())}.json"`);
  ok(res, { exportedAt: new Date().toISOString(), settings, work, reviews, orders, bans, users });
}

async function settings(req, res) {
  const body = await readJson(req, 8192);
  const next = await updateDoc('settings', {}, (s) => {
    const merged = { ...DEFAULT_SETTINGS, ...s };
    if ('available' in body) merged.available = Boolean(body.available);
    if ('maintenance' in body) {
      const on = Boolean(body.maintenance);
      if (on && !merged.maintenance) merged.maintenanceStartedAt = Date.now();
      if (!on) merged.maintenanceStartedAt = null;
      merged.maintenance = on;
    }
    if ('maintenanceEta' in body) {
      const eta = clean(body.maintenanceEta, 10);
      if (eta && !/^\d{4}-\d{2}-\d{2}$/.test(eta)) throw Object.assign(new Error('Expected back must be a date.'), { status: 400 });
      merged.maintenanceEta = eta;
    }
    if ('reviewsOpen' in body) merged.reviewsOpen = Boolean(body.reviewsOpen);
    if ('statusNote' in body) merged.statusNote = clean(body.statusNote, 80);
    if ('maintenanceMessage' in body) merged.maintenanceMessage = clean(body.maintenanceMessage, 240);
    if ('timezone' in body) {
      const tz = clean(body.timezone, 60);
      try { if (tz) new Intl.DateTimeFormat('en', { timeZone: tz }); merged.timezone = tz; } catch { throw Object.assign(new Error('Unknown timezone.'), { status: 400 }); }
    }
    if ('discordInvite' in body) {
      const inv = clean(body.discordInvite, 120);
      if (inv && !/^https:\/\/(discord\.gg|discord\.com\/invite)\//.test(inv)) throw Object.assign(new Error('Invite must be a discord.gg link.'), { status: 400 });
      merged.discordInvite = inv;
    }
    merged.updatedAt = Date.now();
    return merged;
  });
  ok(res, { ok: true, settings: next });
}

async function upload(req, res) {
  const buf = await readRaw(req, 4.4 * 1024 * 1024);
  const kind = sniffImage(buf);
  if (!kind) return fail(res, 400, 'Upload a PNG, JPG, WebP or GIF.');
  const dir = query(req).dir === 'servers' ? 'servers' : 'work';
  const base = clean(query(req).name || dir, 60).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'work';
  const blob = await uploadFile(`${dir}/${base}.${kind.ext}`, buf, kind.type);
  ok(res, { ok: true, url: blob.url, pathname: blob.pathname, size: buf.length, type: kind.type });
}

/* Videos are too big for a function body (4.5 MB), so the browser uploads them straight
   to Blob with a short-lived token handed out here (admin only, see the router below). */
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const VIDEO_MAX_MB = 200;
const uploadInfo = async (req, res) => ok(res, { ok: true, access: await storeMode(), videoMaxMb: VIDEO_MAX_MB });
async function videoToken(req, res) {
  const body = await readJson(req, 8192);
  const result = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (pathname) => {
      if (!/^work\/[a-z0-9-]{1,60}\.(mp4|webm|mov)$/.test(pathname)) {
        throw Object.assign(new Error('Upload an MP4, WebM or MOV video.'), { status: 400 });
      }
      return { allowedContentTypes: VIDEO_TYPES, maximumSizeInBytes: VIDEO_MAX_MB * 1024 * 1024, addRandomSuffix: true, cacheControlMaxAge: 60 * 60 * 24 * 365 };
    },
  });
  ok(res, result);
}

async function discard(req, res) {
  const urls = ((await readJson(req, 16384)).urls || []).map(normalizeBlobUrl);
  const work = await readDoc('work', []);
  const servers = await readDoc('servers', []);
  const inUse = new Set([...work.flatMap((w) => w.images || []), ...servers.map((s) => s.logo)]);
  await removeFiles(urls.filter((u) => !inUse.has(u)));
  ok(res);
}

async function workSave(req, res) {
  const b = await readJson(req, 64 * 1024);
  const category = CATEGORIES.includes(b.category) ? b.category : 'other';
  const DEFAULT_TITLE = { banners: 'Banner', bots: 'Discord bot', web: 'Side project', other: 'Side project' };
  const images = (Array.isArray(b.images) ? b.images : []).map(normalizeBlobUrl).filter(isOurBlobUrl).slice(0, 12);
  if (!images.length) return fail(res, 400, 'Add at least one image or video.');
  let link = clean(b.link, 300);
  if (link && !/^https?:\/\//i.test(link)) link = '';
  // The admin form only sends category, images, featured and hidden.
  // Older fields are kept on edit and only overwritten when sent.
  const fields = { category, images, featured: Boolean(b.featured), hidden: Boolean(b.hidden) };
  const title = clean(b.title, 90);
  if (title) fields.title = title;
  if ('link' in b) fields.link = link;
  if ('description' in b) fields.description = clean(b.description, 1200);
  if ('client' in b) fields.client = clean(b.client, 60);
  if ('year' in b) fields.year = clean(String(b.year || ''), 4);
  if ('tags' in b) fields.tags = (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map((t) => clean(t, 24)).filter(Boolean).slice(0, 8);

  let removed = [];
  let saved;
  await updateDoc('work', [], (list) => {
    if (b.id) {
      const item = list.find((w) => w.id === b.id);
      if (!item) throw notFound('Project');
      removed = (item.images || []).filter((u) => !images.includes(u));
      Object.assign(item, fields, { updatedAt: Date.now() });
      saved = item;
    } else {
      saved = { id: uid('w_'), title: DEFAULT_TITLE[category], link: '', description: '', client: '', year: String(new Date().getFullYear()), tags: [], ...fields, order: -Date.now(), createdAt: Date.now() };
      list.push(saved);
    }
    return list;
  });
  await removeFiles(removed);
  ok(res, { ok: true, item: saved });
}

const listServers = async (req, res) => ok(res, { ok: true, servers: await readDoc('servers', []) });

async function serverSave(req, res) {
  const b = await readJson(req, 4096);
  const name = clean(b.name, 60);
  const logo = isOurBlobUrl(b.logo) ? b.logo : '';
  if (!logo) return fail(res, 400, 'Upload a logo.');
  let saved;
  let old = '';
  await updateDoc('servers', [], (list) => {
    const item = b.id && list.find((s) => s.id === b.id);
    if (item) {
      if (item.logo !== logo) old = item.logo;
      Object.assign(item, { name, logo, updatedAt: Date.now() });
      saved = item;
    } else {
      saved = { id: uid('s_'), name, logo, createdAt: Date.now() };
      list.push(saved);
    }
    return list;
  });
  if (old) await removeFiles([old]);
  ok(res, { ok: true, server: saved });
}

async function serverDelete(req, res) {
  const { id } = await readJson(req, 2048);
  let removed;
  await updateDoc('servers', [], (list) => {
    const i = list.findIndex((s) => s.id === id);
    if (i < 0) throw notFound('Server');
    removed = list.splice(i, 1)[0];
    return list;
  });
  await removeFiles([removed.logo]);
  ok(res);
}

async function serverReorder(req, res) {
  const { ids } = await readJson(req, 16 * 1024);
  if (!Array.isArray(ids)) return fail(res, 400, 'ids[] required.');
  await updateDoc('servers', [], (list) => list.sort((a, c) => ids.indexOf(a.id) - ids.indexOf(c.id)));
  ok(res);
}

async function workDelete(req, res) {
  const { id } = await readJson(req, 2048);
  let removed;
  await updateDoc('work', [], (list) => {
    const i = list.findIndex((w) => w.id === id);
    if (i < 0) throw notFound('Project');
    removed = list.splice(i, 1)[0];
    return list;
  });
  await removeFiles(removed.images);
  ok(res);
}

async function workReorder(req, res) {
  const { ids } = await readJson(req, 32 * 1024);
  if (!Array.isArray(ids)) return fail(res, 400, 'ids[] required.');
  await updateDoc('work', [], (list) => {
    for (const w of list) {
      const i = ids.indexOf(w.id);
      w.order = i < 0 ? 9999 : i;
    }
    return list;
  });
  ok(res);
}

async function reviewStatus(req, res) {
  const { id, status } = await readJson(req, 2048);
  if (!['approved', 'rejected', 'pending'].includes(status)) return fail(res, 400, 'Bad status.');
  await updateDoc('reviews', [], (list) => {
    const r = list.find((x) => x.id === id);
    if (!r) throw notFound('Review');
    r.status = status;
    if (status === 'approved') r.approvedAt = Date.now();
    r.moderatedAt = Date.now();
    return list;
  });
  ok(res);
}

async function reviewDelete(req, res) {
  const { id } = await readJson(req, 2048);
  let removed;
  await updateDoc('reviews', [], (list) => {
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) throw notFound('Review');
    removed = list.splice(i, 1)[0];
    return list;
  });
  if (removed.image) await removeFiles([removed.image]);
  ok(res);
}

async function orderSave(req, res) {
  const b = await readJson(req, 16 * 1024);
  const title = clean(b.title, 90);
  if (!title) return fail(res, 400, 'Give the order a title.');
  const status = ORDER_STATUSES.includes(b.status) ? b.status : 'queued';
  const fields = {
    title,
    type: clean(b.type, 40) || 'Other',
    client: clean(b.client, 60),
    clientId: /^\d{15,21}$/.test(String(b.clientId || '')) ? String(b.clientId) : '',
    showClient: Boolean(b.showClient),
    status,
    progress: Math.max(0, Math.min(100, Math.round(Number(b.progress) || 0))),
    note: clean(b.note, 200),
    eta: clean(b.eta, 40),
  };
  let saved;
  await updateDoc('orders', [], (list) => {
    const now = Date.now();
    if (b.id) {
      const o = list.find((x) => x.id === b.id);
      if (!o) throw notFound('Order');
      if (status === 'in_progress' && !o.startedAt) fields.startedAt = now;
      if (status === 'completed' && o.status !== 'completed') fields.completedAt = now;
      if (status !== 'completed') fields.completedAt = null;
      Object.assign(o, fields, { updatedAt: now });
      saved = o;
    } else {
      const position = list.filter((o) => o.status !== 'completed').length;
      saved = { id: uid('o_'), ...fields, position, createdAt: now, startedAt: status === 'in_progress' ? now : null, completedAt: status === 'completed' ? now : null };
      list.push(saved);
    }
    return list;
  });
  ok(res, { ok: true, order: saved });
}

async function orderDelete(req, res) {
  const { id } = await readJson(req, 2048);
  await updateDoc('orders', [], (list) => {
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) throw notFound('Order');
    list.splice(i, 1);
    return list;
  });
  ok(res);
}

async function orderReorder(req, res) {
  const { ids } = await readJson(req, 32 * 1024);
  if (!Array.isArray(ids)) return fail(res, 400, 'ids[] required.');
  await updateDoc('orders', [], (list) => {
    for (const o of list) {
      const i = ids.indexOf(o.id);
      if (i >= 0) o.position = i;
    }
    return list;
  });
  ok(res);
}

async function ban(req, res) {
  const b = await readJson(req, 4096);
  const userId = String(b.userId || '').trim();
  if (!/^\d{15,21}$/.test(userId)) return fail(res, 400, 'That is not a Discord user ID.');
  if (userId === ADMIN_ID()) return fail(res, 400, "You can't ban yourself.");
  const users = await readDoc('users', {});
  await updateDoc('bans', [], (list) => {
    if (!list.some((x) => x.userId === userId)) {
      list.push({ userId, reason: clean(b.reason, 160), username: users[userId]?.username || '', createdAt: Date.now() });
    }
    return list;
  });
  await updateDoc('reviews', [], (list) => {
    for (const r of list) if (r.userId === userId && r.status === 'pending') r.status = 'rejected';
    return list;
  });
  ok(res);
}

async function unban(req, res) {
  const { userId } = await readJson(req, 2048);
  await updateDoc('bans', [], (list) => list.filter((x) => x.userId !== userId));
  ok(res);
}

const reads = { 'upload-info': uploadInfo, overview, reviews: listReviews, work: listWork, servers: listServers, orders: listOrders, people, export: exportAll };
const writes = {
  settings, upload, discard, 'video-token': videoToken,
  'work-save': workSave, 'work-delete': workDelete, 'work-reorder': workReorder,
  'server-save': serverSave, 'server-delete': serverDelete, 'server-reorder': serverReorder,
  'review-status': reviewStatus, 'review-delete': reviewDelete,
  'order-save': orderSave, 'order-delete': orderDelete, 'order-reorder': orderReorder,
  ban, unban,
};

export default wrap(async (req, res) => {
  requireAdmin(req);
  const op = query(req).op;
  if (req.method === 'GET' && reads[op]) return reads[op](req, res);
  if (req.method === 'POST' && writes[op]) {
    if (!sameOrigin(req)) return fail(res, 403, 'Bad origin.');
    return writes[op](req, res);
  }
  fail(res, 404, 'Unknown operation.');
});
