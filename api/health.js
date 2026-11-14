import { wrap, send } from '../lib/http.js';
import { readDoc, writeDoc, blobConfigured } from '../lib/store.js';

const SAMPLE_EVERY = 10 * 60 * 1000;
const KEEP_DAYS = 90;

async function timed(fn) {
  const start = performance.now();
  try {
    const detail = await fn();
    return { status: 'operational', latency: Math.round(performance.now() - start), detail: detail || '' };
  } catch (err) {
    return { status: err.degraded ? 'degraded' : 'down', latency: Math.round(performance.now() - start), detail: err.message };
  }
}

const degraded = (msg) => Object.assign(new Error(msg), { degraded: true });

export default wrap(async (req, res) => {
  const started = performance.now();

  const [storage, auth] = await Promise.all([
    timed(async () => {
      if (!blobConfigured()) throw new Error('Blob token missing');
      await readDoc('settings', {});
      return 'Reads OK';
    }),
    timed(async () => {
      if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) throw new Error('OAuth not configured');
      const r = await fetch('https://discord.com/api/v10/gateway', { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw degraded(`Discord responded ${r.status}`);
      return 'Discord reachable';
    }),
  ]);

  const api = { status: 'operational', latency: Math.round(performance.now() - started), detail: 'Responding' };
  const checks = [
    { id: 'api', name: 'API', ...api },
    { id: 'storage', name: 'Storage', ...storage },
    { id: 'auth', name: 'Discord sign-in', ...auth },
  ];
  const overall = storage.status === 'down' ? 'down' : checks.some((c) => c.status !== 'operational') ? 'degraded' : 'operational';

  let history = {};
  if (blobConfigured()) {
    try {
      const doc = await readDoc('health', { days: {}, lastSample: 0 });
      history = doc.days || {};
      const isCron = req.headers['user-agent']?.includes('vercel-cron') ||
        (process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`);
      if (isCron || Date.now() - (doc.lastSample || 0) > SAMPLE_EVERY) {
        const today = new Date().toISOString().slice(0, 10);
        const d = history[today] || { ok: 0, degraded: 0, down: 0 };
        d[overall === 'operational' ? 'ok' : overall] += 1;
        history[today] = d;
        const keys = Object.keys(history).sort();
        keys.slice(0, Math.max(0, keys.length - KEEP_DAYS)).forEach((k) => delete history[k]);
        await writeDoc('health', { days: history, lastSample: Date.now() });
      }
    } catch (err) {
      console.error('Health history unavailable', err);
    }
  }

  send(res, overall === 'down' ? 503 : 200, {
    ok: overall !== 'down',
    status: overall,
    checks,
    history,
    region: process.env.VERCEL_REGION || 'local',
    checkedAt: new Date().toISOString(),
  });
});
