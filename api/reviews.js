import { wrap, ok, fail, query, readJson, clean, uid, sameOrigin } from '../lib/http.js';
import { readDoc, updateDoc, removeFiles } from '../lib/store.js';
import { requireUser } from '../lib/session.js';
import { getSettings } from '../lib/data.js';

// One review per Discord account. Submitting again edits that review,
// which sends it back to the approval queue.

const newestOwn = (list, userId) =>
  list.filter((r) => r.userId === userId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;

const publicMine = (r) =>
  r && { id: r.id, rating: r.rating, text: r.text, project: r.project, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt || null };

async function mine(req, res) {
  const user = await requireUser(req);
  const all = await readDoc('reviews', []);
  ok(res, { ok: true, review: publicMine(newestOwn(all, user.id)) });
}

async function submit(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'POST only.');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin.');
  const user = await requireUser(req);

  const settings = await getSettings();
  if (settings.maintenance) return fail(res, 503, 'The site is in maintenance. Try again soon.');
  if (settings.reviewsOpen === false) return fail(res, 403, 'Reviews are closed right now.');

  const body = await readJson(req, 16 * 1024);
  const rating = Math.round(Number(body.rating));
  const text = clean(body.text, 800);
  const project = clean(body.project, 80);
  if (!(rating >= 1 && rating <= 5)) return fail(res, 400, 'Pick a rating from 1 to 5 stars.');
  if (text.length < 10) return fail(res, 400, 'Write at least a sentence (10+ characters).');

  let saved = null;
  let edited = false;
  const dropped = [];
  await updateDoc('reviews', [], (list) => {
    const current = newestOwn(list, user.id);
    // Older duplicates from before the one-review rule are removed.
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      if (r.userId === user.id && r !== current) {
        if (r.image) dropped.push(r.image);
        list.splice(i, 1);
      }
    }
    const profile = { username: user.username, displayName: user.name, avatar: user.avatar };
    if (current) {
      edited = true;
      Object.assign(current, profile, { rating, text, project, status: 'pending', updatedAt: Date.now() });
      delete current.approvedAt;
      saved = current;
    } else {
      saved = { id: uid('r_'), userId: user.id, ...profile, rating, text, project, image: null, status: 'pending', createdAt: Date.now() };
      list.push(saved);
    }
    return list;
  });
  if (dropped.length) await removeFiles(dropped);
  ok(res, { ok: true, edited, review: publicMine(saved) });
}

async function remove(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'POST only.');
  if (!sameOrigin(req)) return fail(res, 403, 'Bad origin.');
  const user = await requireUser(req);
  const removed = [];
  await updateDoc('reviews', [], (list) => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].userId === user.id) removed.push(...list.splice(i, 1));
    return list;
  });
  if (!removed.length) return fail(res, 404, 'You have no review to delete.');
  await removeFiles(removed.map((r) => r.image).filter(Boolean));
  ok(res);
}

const ops = { mine, submit, remove, withdraw: remove };

export default wrap(async (req, res) => {
  const fn = ops[query(req).op];
  if (!fn) return fail(res, 404, 'Unknown operation.');
  await fn(req, res);
});
