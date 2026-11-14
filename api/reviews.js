import { wrap, ok, fail, query, readJson, clean, uid, sameOrigin } from '../lib/http.js';
import { readDoc, updateDoc, uploadFile, sniffImage, removeFiles } from '../lib/store.js';
import { requireUser } from '../lib/session.js';
import { getSettings } from '../lib/data.js';

const DAY = 24 * 60 * 60 * 1000;
const MAX_IMAGE = 3 * 1024 * 1024;

async function mine(req, res) {
  const user = await requireUser(req);
  const all = await readDoc('reviews', []);
  const list = all
    .filter((r) => r.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ id, rating, text, project, status, createdAt, image }) => ({ id, rating, text, project, status, createdAt, image }));
  ok(res, { ok: true, reviews: list });
}

async function submit(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'POST only.');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin.');
  const user = await requireUser(req);

  const settings = await getSettings();
  if (settings.maintenance) return fail(res, 503, 'The site is in maintenance. Try again soon.');
  if (settings.reviewsOpen === false) return fail(res, 403, 'Reviews are closed right now.');

  const body = await readJson(req, 4.5 * 1024 * 1024);
  const rating = Math.round(Number(body.rating));
  const text = clean(body.text, 800);
  const project = clean(body.project, 80);
  if (!(rating >= 1 && rating <= 5)) return fail(res, 400, 'Pick a rating from 1 to 5 stars.');
  if (text.length < 10) return fail(res, 400, 'Write at least a sentence (10+ characters).');

  const existing = await readDoc('reviews', []);
  const own = existing.filter((r) => r.userId === user.id);
  if (own.some((r) => r.status === 'pending')) return fail(res, 409, 'You already have a review waiting for approval.');
  const last = own.reduce((m, r) => Math.max(m, r.createdAt), 0);
  if (Date.now() - last < DAY) return fail(res, 429, 'You can leave one review per day.');

  let image = null;
  if (typeof body.image === 'string' && body.image.startsWith('data:')) {
    const base64 = body.image.slice(body.image.indexOf(',') + 1);
    const buf = Buffer.from(base64, 'base64');
    if (buf.length > MAX_IMAGE) return fail(res, 413, 'Image is too large (3 MB max).');
    const kind = sniffImage(buf);
    if (!kind) return fail(res, 400, 'Images must be PNG, JPG, WebP or GIF.');
    const blob = await uploadFile(`reviews/${user.id}.${kind.ext}`, buf, kind.type);
    image = blob.url;
  }

  const review = {
    id: uid('r_'),
    userId: user.id,
    username: user.username,
    displayName: user.name,
    avatar: user.avatar,
    rating,
    text,
    project,
    image,
    status: 'pending',
    createdAt: Date.now(),
  };
  await updateDoc('reviews', [], (list) => {
    list.push(review);
    return list;
  });
  ok(res, { ok: true, review: { id: review.id, status: review.status } });
}

async function withdraw(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'POST only.');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin.');
  const user = await requireUser(req);
  const { id } = await readJson(req, 2048);
  let removed = null;
  await updateDoc('reviews', [], (list) => {
    const i = list.findIndex((r) => r.id === id && r.userId === user.id && r.status === 'pending');
    if (i >= 0) removed = list.splice(i, 1)[0];
    return list;
  });
  if (!removed) return fail(res, 404, 'Nothing to withdraw.');
  if (removed.image) await removeFiles([removed.image]);
  ok(res);
}

const ops = { mine, submit, withdraw };

export default wrap(async (req, res) => {
  const fn = ops[query(req).op];
  if (!fn) return fail(res, 404, 'Unknown operation.');
  await fn(req, res);
});
