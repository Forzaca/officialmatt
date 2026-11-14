(() => {
  'use strict';
  const MP = window.MP;
  const { $, esc, icon } = MP;

  const DAYS = 90;
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  document.body.appendChild(tip);

  const LABEL = { operational: 'Operational', degraded: 'Degraded', down: 'Down', unknown: 'Checking' };
  const DOT = { operational: 'green', degraded: 'amber', down: 'red', unknown: '' };

  async function timeFetch(url, opts) {
    const t = performance.now();
    try {
      const r = await fetch(url, { cache: 'no-store', ...opts });
      return { ok: r.ok, status: r.status, ms: Math.round(performance.now() - t), res: r };
    } catch (e) {
      return { ok: false, status: 0, ms: Math.round(performance.now() - t), error: e };
    }
  }

  function bars(history) {
    const out = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      const d = history?.[date];
      let cls = '';
      let label = 'No data';
      if (d) {
        const total = (d.ok || 0) + (d.degraded || 0) + (d.down || 0);
        const pct = total ? ((d.ok || 0) / total) * 100 : 100;
        cls = d.down ? 'down' : d.degraded ? 'deg' : 'ok';
        label = `${pct.toFixed(pct === 100 ? 0 : 1)}% healthy · ${total} check${total === 1 ? '' : 's'}`;
      }
      out.push(`<i class="${cls}" style="--i:${DAYS - i}" data-tip="${MP.date(Date.parse(date + 'T12:00:00'), { month: 'short', day: 'numeric', year: 'numeric' })}" data-tip2="${label}"></i>`);
    }
    return out.join('');
  }

  function uptime(history) {
    let ok = 0, total = 0;
    for (const d of Object.values(history || {})) {
      const t = (d.ok || 0) + (d.degraded || 0) + (d.down || 0);
      ok += d.ok || 0; total += t;
    }
    return total ? `${((ok / total) * 100).toFixed(2)}% uptime` : 'Collecting data';
  }

  function component(name, desc, c, history) {
    return `
      <div class="comp">
        <div class="comp-head">
          <span class="comp-name"><span class="dot ${DOT[c.status]} ${c.status === 'operational' ? 'pulse' : ''}"></span>${esc(name)}</span>
          <span class="comp-meta">${c.latency != null ? `<span class="mono">${c.latency} ms</span>` : ''}<span class="badge ${DOT[c.status]}">${LABEL[c.status]}</span></span>
        </div>
        <div class="small muted" style="margin-top:4px">${esc(c.detail || desc)}</div>
        ${history ? `<div class="uptime">${bars(history)}</div><div class="uptime-legend"><span>${DAYS} days ago</span><span>${uptime(history)}</span><span>Today</span></div>` : ''}
      </div>`;
  }

  async function run() {
    const btn = $('#recheck');
    btn.classList.add('loading');
    $('#checked').textContent = 'Checking…';

    const [site, api, lanyard] = await Promise.all([
      timeFetch('/?_status=' + Date.now(), { method: 'HEAD' }),
      timeFetch('/api/health'),
      timeFetch(`https://api.lanyard.rest/v1/users/${MP.DISCORD_ID}`),
    ]);

    let health = null;
    try { health = await api.res.json(); } catch {  }
    const get = (id) => health?.checks?.find((c) => c.id === id);

    const website = { status: site.ok ? 'operational' : 'down', latency: site.ms, detail: site.ok ? 'Pages loading normally' : 'Pages failed to load' };
    const apiC = health ? { ...get('api'), latency: api.ms } : { status: 'down', latency: api.ms, detail: 'API not responding' };
    const storage = get('storage') || { status: 'unknown', detail: 'Unknown' };
    const auth = get('auth') || { status: 'unknown', detail: 'Unknown' };
    const lan = { status: lanyard.ok ? 'operational' : 'degraded', latency: lanyard.ms, detail: lanyard.ok ? 'Live Discord profile on the contact card' : 'Contact card falls back to a static profile' };

    const core = [website, apiC, storage];
    const overall = core.some((c) => c.status === 'down') ? 'down'
      : [...core, auth, lan].some((c) => c.status !== 'operational') ? 'degraded' : 'operational';
    const headline = { operational: 'All systems operational', degraded: 'Some things are running slow', down: "Something's down" }[overall];
    const sub = { operational: 'Everything is working as it should.', degraded: "The site works, but a part of it isn't at full speed.", down: "I'm probably already on it." }[overall];
    const orbIcon = overall === 'operational' ? icon.check : icon.alert;

    const hero = $('#overall');
    hero.className = `status-hero card ${overall} in`;
    hero.innerHTML = `<span class="orb">${orbIcon}</span><div><h2>${headline}</h2><p class="muted small" style="margin-top:4px">${sub}</p></div>`;

    const history = health?.history || {};
    $('#components').innerHTML =
      component('Website', 'Pages and assets', website) +
      component('API', 'Serverless functions', apiC, history) +
      component('Storage', 'Vercel Blob (work, reviews, settings)', storage) +
      component('Discord sign-in', 'OAuth with Discord', auth) +
      component('Live profile', 'Lanyard', lan);
    $('#components').classList.add('in');

    $('#checked').textContent = `Last checked ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}${health?.region ? ` · region ${health.region}` : ''}`;
    btn.classList.remove('loading');
  }

  $('#components').innerHTML = Array.from({ length: 5 }, () => `<div class="comp"><div class="comp-head"><span class="sk sk-line" style="width:140px"></span><span class="sk" style="width:90px;height:24px;border-radius:8px"></span></div><span class="sk" style="display:block;height:30px;margin-top:14px;border-radius:6px"></span></div>`).join('');

  $('#recheck').addEventListener('click', run);
  run();
  setInterval(() => document.visibilityState === 'visible' && run(), 60000);

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    const r = t.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(t.dataset.tip)}</b>${esc(t.dataset.tip2 || '')}`;
    tip.style.left = `${Math.min(innerWidth - 110, Math.max(110, r.left + r.width / 2))}px`;
    tip.style.top = `${r.top}px`;
    tip.hidden = false;
  });
  addEventListener('scroll', () => (tip.hidden = true), { passive: true });
})();
