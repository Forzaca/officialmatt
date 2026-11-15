(() => {
  'use strict';
  const MP = window.MP;
  const { $, $$, esc, icon } = MP;

  const s = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    overview: s('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    work: s('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
    reviews: s('<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.7l6.2-.9z"/>'),
    orders: s('<path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01"/>'),
    people: s('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>'),
    settings: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    edit: s('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    trash: s('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    up: s('<path d="m6 15 6-6 6 6"/>'),
    down: s('<path d="m6 9 6 6 6-6"/>'),
    starO: s('<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.7l6.2-.9z"/>'),
    eyeOff: s('<path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3 3.5M6.6 6.6C4.1 8.2 3 12 3 12s4 6 9 6a8.8 8.8 0 0 0 4.4-1.2"/>'),
    ban: s('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
    download: s('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
    servers: s('<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>'),
    ext: s('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  };

  const TABS = [
    { id: 'overview', label: 'Overview', eyebrow: 'Dashboard' },
    { id: 'work', label: 'Work', eyebrow: 'Portfolio' },
    { id: 'servers', label: 'Servers', eyebrow: 'About page' },
    { id: 'reviews', label: 'Reviews', eyebrow: 'Moderation' },
    { id: 'orders', label: 'Orders', eyebrow: 'Queue' },
    { id: 'people', label: 'People', eyebrow: 'Access' },
    { id: 'settings', label: 'Settings', eyebrow: 'Site' },
  ];
  const CATS = { banners: 'Banner', bots: 'Discord bot', other: 'Side project' };
  const catLabel = (c) => CATS[c === 'web' ? 'other' : c] || 'Project';
  const ORDER_STATUS = { queued: ['Queued', ''], in_progress: ['In progress', 'blue'], review: ['With client', 'amber'], completed: ['Completed', 'green'] };

  const A = (op, opts) => MP.api(`/api/admin?op=${op}`, opts);
  const post = (op, body) => A(op, { body });
  const view = $('#a-view');
  const actions = $('#a-actions');
  const state = { tab: 'overview', days: 30, reviewFilter: 'pending', settings: null, pending: 0, me: null };

  const loading = (n = 4, h = 72) => `<div class="rows">${Array.from({ length: n }, () => `<div class="sk" style="height:${h}px;border-radius:16px"></div>`).join('')}</div>`;
  const errorBox = (err) => `<div class="notice red">${icon.alert}<span>${esc(err.message || 'Something went wrong.')}</span></div>`;
  const switchHtml = (id, on, cls = '') => `<label class="switch ${cls}"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></label>`;
  const copyId = (id) => `<button class="copy" type="button" data-copy="${esc(id)}" title="Copy ID">${esc(id)}</button>`;
  const fmt = (n) => Number(n || 0).toLocaleString();

  document.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-copy]');
    if (!c) return;
    try { await navigator.clipboard.writeText(c.dataset.copy); MP.toast('Copied'); } catch { MP.toast('Copy failed', 'bad'); }
  });

  MP.boot.then(({ viewer, isAdmin }) => {
    const card = $('#gate-card');
    card.removeAttribute('aria-busy');
    if (!viewer) {
      card.innerHTML = `<h2>Sign in</h2><p>Sign in with Discord to open the admin panel.</p><a class="btn" href="${MP.loginUrl('/admin')}">Sign in with Discord</a>`;
      return;
    }
    if (!isAdmin) {
      card.innerHTML = `<div class="lock">${icon.lock}</div><h2>No access</h2><p>@${esc(viewer.username)} can't open this area.</p>
        <div style="display:grid;gap:10px"><a class="btn" href="/">Back to the site</a><button class="btn ghost" type="button" id="gate-out">Sign out</button></div>`;
      $('#gate-out').addEventListener('click', MP.logout);
      return;
    }
    state.me = viewer;
    $('#gate').remove();
    $('#app').hidden = false;
    init();
  });

  function init() {
    $('#a-me').innerHTML = `
      <div class="who"><img src="${esc(state.me.avatar)}" alt=""><div style="min-width:0"><b>${esc(state.me.name)}</b><span>@${esc(state.me.username)}</span></div></div>
      <a class="btn ghost sm" href="/" target="_blank" rel="noopener">${I.ext}View site</a>
      <button class="btn ghost sm" type="button" id="a-out">${icon.out}Sign out</button>`;
    $('#a-out').addEventListener('click', MP.logout);
    renderNav();
    const fromHash = location.hash.slice(1);
    go(TABS.some((t) => t.id === fromHash) ? fromHash : 'overview', false);
    addEventListener('hashchange', () => {
      const h = location.hash.slice(1);
      if (h !== state.tab && TABS.some((t) => t.id === h)) go(h, false);
    });
    refreshPending();
  }

  function renderNav() {
    $('#a-nav').innerHTML = TABS.map((t) => `
      <button class="a-tab ${t.id === state.tab ? 'active' : ''}" type="button" data-tab="${t.id}">${I[t.id]}<span>${t.label}</span>${t.id === 'reviews' && state.pending ? `<span class="count">${state.pending}</span>` : ''}</button>`).join('');
    $$('#a-nav [data-tab]').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  }

  async function refreshPending() {
    try {
      const { reviews } = await A('reviews', { quiet: true });
      state.pending = reviews.filter((r) => r.status === 'pending').length;
      renderNav();
    } catch {  }
  }

  function go(tab, push = true) {
    state.tab = tab;
    const t = TABS.find((x) => x.id === tab);
    $('#a-title').textContent = t.label;
    $('#a-eyebrow').textContent = t.eyebrow;
    document.title = `${t.label} · Admin`;
    if (push) history.replaceState(null, '', `#${tab}`);
    renderNav();
    actions.innerHTML = '';
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
    ({ overview, work, servers, reviews, orders, people, settings })[tab]();
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveSettings(patch, msg = 'Saved') {
    const { settings } = await post('settings', patch);
    state.settings = settings;
    MP.toast(msg);
    return settings;
  }

  function bindQuickToggles(root) {
    const avail = $('#q-available', root);
    const maint = $('#q-maint', root);
    avail?.addEventListener('change', async () => {
      try { await saveSettings({ available: avail.checked }, avail.checked ? "You're marked as available" : "You're marked as not available"); }
      catch (err) { avail.checked = !avail.checked; MP.toast(err.message, 'bad'); }
      const label = $('#q-available-label', root); if (label) label.textContent = avail.checked ? 'Available for work' : 'Not available';
    });
    maint?.addEventListener('change', async () => {
      if (maint.checked && !(await MP.confirm('Turn on maintenance mode?', 'Visitors will see the "Back soon" page until you turn it off. You can still use the whole site.', { okLabel: 'Turn on' }))) { maint.checked = false; return; }
      try { await saveSettings({ maintenance: maint.checked }, maint.checked ? 'Maintenance mode is on' : 'Site is live again'); }
      catch (err) { maint.checked = !maint.checked; MP.toast(err.message, 'bad'); }
    });
  }

  async function overview() {
    actions.innerHTML = `<div class="seg" id="range">${[7, 30, 90].map((d) => `<button type="button" data-d="${d}" class="${state.days === d ? 'on' : ''}">${d} days</button>`).join('')}</div>`;
    $$('#range button').forEach((b) => b.addEventListener('click', () => { state.days = Number(b.dataset.d); overview(); }));
    view.innerHTML = `
      <div class="quick"><div class="sk" style="height:88px;border-radius:18px"></div><div class="sk" style="height:88px;border-radius:18px"></div></div>
      <div class="kpis">${'<div class="sk" style="height:112px;border-radius:18px"></div>'.repeat(4)}</div>
      <div class="sk" style="height:320px;border-radius:26px"></div>`;
    let data;
    try { data = await A(`overview&days=${state.days}`); } catch (err) { view.innerHTML = errorBox(err); return; }
    if (state.tab !== 'overview') return;
    const { settings, counts, analytics } = data;
    state.settings = settings;
    state.pending = counts.reviewsPending; renderNav();

    const prev = analytics.previous;
    const change = prev.views ? Math.round(((prev.recent - prev.views) / prev.views) * 100) : null;
    const delta = change === null ? '<div class="delta">Not enough data yet</div>' : `<div class="delta ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs first half</div>`;

    view.innerHTML = `
      <div class="quick">
        <div class="a-card card"><div class="toggle-row"><div><b id="q-available-label">${settings.available ? 'Available for work' : 'Not available'}</b><span>Shown in the header and on the queue</span></div>${switchHtml('q-available', settings.available)}</div></div>
        <div class="a-card card"><div class="toggle-row"><div><b>Maintenance mode</b><span>Public pages redirect to "Back soon"</span></div>${switchHtml('q-maint', settings.maintenance, 'red')}</div></div>
      </div>
      <div class="kpis">
        <div class="kpi card"><span class="label">Page views</span><span class="value">${fmt(analytics.totals.views)}</span>${delta}</div>
        <div class="kpi card"><span class="label">Visitors</span><span class="value">${fmt(analytics.totals.visitors)}</span><div class="delta">Unique per day, summed</div></div>
        <button class="kpi card" type="button" data-goto="reviews"><span class="label">Pending reviews</span><span class="value">${counts.reviewsPending}</span><div class="delta">${counts.reviewsApproved} approved</div></button>
        <button class="kpi card" type="button" data-goto="orders"><span class="label">Active orders</span><span class="value">${counts.ordersActive}</span><div class="delta">${counts.ordersCompleted} completed</div></button>
      </div>
      <div class="a-card card">
        <div class="a-card-head"><div><h3>Page views per day</h3><div class="sub">Last ${analytics.days} days · hover a bar for details</div></div></div>
        <div class="chart" id="chart"></div>
      </div>
      <div class="panels">
        ${panel('Top pages', analytics.pages)}
        ${panel('Referrers', analytics.refs)}
        ${panel('Devices', analytics.devices)}
        ${panel('Countries', analytics.countries, countryName)}
      </div>`;
    bindQuickToggles(view);
    $$('[data-goto]', view).forEach((b) => b.addEventListener('click', () => go(b.dataset.goto)));
    drawChart($('#chart'), analytics.series);
  }

  const regionNames = (() => { try { return new Intl.DisplayNames(undefined, { type: 'region' }); } catch { return null; } })();
  function countryName(code) {
    if (!/^[A-Z]{2}$/.test(code)) return code;
    const flag = String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
    return `${flag}  ${regionNames?.of(code) || code}`;
  }

  function panel(title, rows, label = (x) => x) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<div class="a-card card"><div class="a-card-head"><h3>${title}</h3></div>
      ${rows.length ? `<div class="toplist">${rows.map((r, i) => `<div class="top-row"><i class="fillbar" style="width:${(r.value / max) * 100}%;animation-delay:${i * 50}ms"></i><span>${esc(label(r.key))}</span><b>${fmt(r.value)}</b></div>`).join('')}</div>` : '<p class="muted small">No data yet.</p>'}
    </div>`;
  }

  function drawChart(el, series) {
    const render = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const pad = { l: 34, r: 4, t: 10, b: 24 };
      const max = Math.max(4, ...series.map((d) => d.views));
      const nice = Math.ceil(max / 4) * 4;
      const iw = W - pad.l - pad.r;
      const ih = H - pad.t - pad.b;
      const band = iw / series.length;
      const gap = Math.min(4, Math.max(2, band * 0.25));
      const bw = Math.max(1, band - gap);
      const y = (v) => pad.t + ih - (v / nice) * ih;
      const r = Math.min(4, bw / 2);
      const bar = (x, top, w, bottom) => {
        const h = bottom - top;
        if (h <= 0.5) return '';
        const rr = Math.min(r, h);
        return `M${x},${bottom}V${top + rr}Q${x},${top} ${x + rr},${top}H${x + w - rr}Q${x + w},${top} ${x + w},${top + rr}V${bottom}Z`;
      };
      const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(nice * f));
      const labelIdx = [0, Math.floor(series.length / 2), series.length - 1];
      const short = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of daily page views">
        <g class="grid">${ticks.map((t) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
        <g class="axis">${ticks.map((t) => `<text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('')}
          ${labelIdx.map((i) => `<text x="${pad.l + i * band + bw / 2}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}">${short(series[i].date)}</text>`).join('')}</g>
        <g>${series.map((d, i) => `<path class="bar grow" data-i="${i}" style="--i:${i}" d="${bar(pad.l + i * band, y(d.views), bw, y(0))}"/>`).join('')}</g>
        <g>${series.map((d, i) => `<rect class="hit" data-i="${i}" x="${pad.l + i * band}" y="${pad.t}" width="${band}" height="${ih}"/>`).join('')}</g>
      </svg><div class="chart-tip" hidden></div>`;
      const tip = $('.chart-tip', el);
      const bars = $$('.bar', el);
      const show = (i) => {
        const d = series[i];
        bars.forEach((b, j) => b.classList.toggle('dim', j !== i));
        tip.innerHTML = `<b>${new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b><span>${fmt(d.views)} views · ${fmt(d.visitors)} visitors</span>`;
        tip.style.left = `${Math.min(W - 80, Math.max(80, pad.l + i * band + band / 2))}px`;
        tip.style.top = `${Math.max(30, y(d.views))}px`;
        tip.hidden = false;
      };
      const hide = () => { tip.hidden = true; bars.forEach((b) => b.classList.remove('dim')); };
      $$('.hit', el).forEach((h) => {
        h.addEventListener('pointerenter', () => show(Number(h.dataset.i)));
        h.addEventListener('click', () => show(Number(h.dataset.i)));
      });
      el.querySelector('svg').addEventListener('pointerleave', hide);
    };
    render();
    let t;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (document.body.contains(el)) { $$('.grow', el).forEach((b) => b.classList.remove('grow')); render(); $$('.grow', el).forEach((b) => (b.style.animation = 'none')); } else ro.disconnect(); }, 120); });
    ro.observe(el);
  }

  let serverCache = [];
  async function servers() {
    actions.innerHTML = `<button class="btn sm" type="button" id="new-server">${I.plus}Add server</button>`;
    $('#new-server').addEventListener('click', () => editServer());
    view.innerHTML = loading(4, 72);
    try { serverCache = (await A('servers')).servers; } catch (err) { view.innerHTML = errorBox(err); return; }
    if (state.tab !== 'servers') return;
    renderServers();
  }

  function renderServers() {
    if (!serverCache.length) {
      view.innerHTML = `<div class="a-empty"><b>No servers yet</b>Add the communities you've worked with. Their logos scroll along the About page.<div style="margin-top:16px"><button class="btn sm" type="button" data-new>${I.plus}Add server</button></div></div>`;
      $('[data-new]', view).addEventListener('click', () => editServer());
      return;
    }
    view.innerHTML = `<p class="small muted" style="margin-bottom:14px">${serverCache.length} server${serverCache.length === 1 ? '' : 's'} on the About page, in this order.</p>
      <div class="rows">${serverCache.map((s, i) => `
        <div class="a-row card" style="--i:${i}">
          <img class="thumb logo" src="${esc(s.logo)}" alt="" loading="lazy">
          <div style="min-width:0"><div class="title">${esc(s.name || 'Unnamed server')}</div></div>
          <div class="actions">
            <button class="icon-btn" type="button" data-move="-1" data-id="${s.id}" aria-label="Move up" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>${I.up}</button>
            <button class="icon-btn" type="button" data-move="1" data-id="${s.id}" aria-label="Move down" ${i === serverCache.length - 1 ? 'disabled style="opacity:.3"' : ''}>${I.down}</button>
            <button class="icon-btn" type="button" data-edit="${s.id}" aria-label="Edit">${I.edit}</button>
            <button class="icon-btn" type="button" data-del="${s.id}" aria-label="Delete" style="color:#ff8a83">${I.trash}</button>
          </div>
        </div>`).join('')}</div>`;
    $$('[data-edit]', view).forEach((b) => b.addEventListener('click', () => editServer(serverCache.find((s) => s.id === b.dataset.edit))));
    $$('[data-del]', view).forEach((b) => b.addEventListener('click', async () => {
      const s = serverCache.find((x) => x.id === b.dataset.del);
      if (!(await MP.confirm('Remove this server?', 'Its logo is removed from the About page.', { okLabel: 'Remove', danger: true }))) return;
      try { await post('server-delete', { id: s.id }); serverCache = serverCache.filter((x) => x.id !== s.id); MP.toast('Server removed'); renderServers(); }
      catch (err) { MP.toast(err.message, 'bad'); }
    }));
    $$('[data-move]', view).forEach((b) => b.addEventListener('click', async () => {
      const i = serverCache.findIndex((s) => s.id === b.dataset.id);
      const j = i + Number(b.dataset.move);
      if (j < 0 || j >= serverCache.length) return;
      [serverCache[i], serverCache[j]] = [serverCache[j], serverCache[i]];
      renderServers();
      try { await post('server-reorder', { ids: serverCache.map((s) => s.id) }); } catch (err) { MP.toast(err.message, 'bad'); }
    }));
  }

  function editServer(item) {
    let logo = item?.logo || '';
    let fresh = '';
    let saved = false;
    let uploading = false;
    const m = MP.modal({
      label: item ? 'Edit server' : 'Add server',
      className: 'editor',
      onClose: () => { if (!saved && fresh) post('discard', { urls: [fresh] }).catch(() => {}); },
      html: `
        <div class="modal-head"><h3>${item ? 'Edit server' : 'Add server'}</h3><button class="icon-btn" data-close aria-label="Close">${icon.x}</button></div>
        <form id="sf" novalidate>
          <div class="form-grid">
            <div class="field full">
              <span class="label">Logo <span class="muted">(square works best)</span></span>
              <div class="uploads" id="sf-ups"></div>
              <input type="file" id="sf-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
            </div>
            <div class="field full"><label for="sf-name">Server name <span class="muted">(optional)</span></label><input class="input" id="sf-name" maxlength="60" value="${esc(item?.name || '')}" placeholder="e.g. Big Sky Roleplay"></div>
          </div>
          <div class="modal-foot"><button class="btn ghost sm" type="button" data-close>Cancel</button><button class="btn sm" type="submit" id="sf-save">${item ? 'Save changes' : 'Add server'}</button></div>
        </form>`,
    });
    const box = m.box;
    const ups = $('#sf-ups', box);
    const input = $('#sf-file', box);
    const render = () => {
      ups.innerHTML = uploading
        ? '<div class="up"><div class="busy"><div class="spinner"></div></div></div>'
        : logo
          ? `<div class="up"><img src="${esc(logo)}" alt="" style="object-fit:contain;padding:10px"><div class="tools"><span></span><button type="button" data-x aria-label="Replace">${I.edit}</button></div></div>`
          : `<div class="up add" id="sf-add" tabindex="0" role="button">${icon.upload}<span>Upload logo</span></div>`;
      const add = $('#sf-add', ups);
      if (add) {
        add.addEventListener('click', () => input.click());
        add.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.click()));
        ['dragenter', 'dragover'].forEach((ev) => add.addEventListener(ev, (e) => { e.preventDefault(); add.classList.add('over'); }));
        ['dragleave', 'drop'].forEach((ev) => add.addEventListener(ev, (e) => { e.preventDefault(); add.classList.remove('over'); }));
        add.addEventListener('drop', (e) => e.dataTransfer.files[0] && handle(e.dataTransfer.files[0]));
      }
      $('[data-x]', ups)?.addEventListener('click', () => input.click());
    };
    async function handle(file) {
      uploading = true;
      render();
      try {
        const blob = await MP.compressImage(file, { max: 512, quality: 0.9 });
        const { url } = await A(`upload&dir=servers&name=${encodeURIComponent(file.name)}`, { raw: blob });
        if (fresh) post('discard', { urls: [fresh] }).catch(() => {});
        fresh = url;
        logo = url;
      } catch (err) {
        MP.toast(err.message, 'bad', 5000);
      } finally {
        uploading = false;
        render();
      }
    }
    input.addEventListener('change', () => { if (input.files[0]) handle(input.files[0]); input.value = ''; });
    render();
    $('#sf', box).addEventListener('submit', async (e) => {
      e.preventDefault();
      if (uploading) return MP.toast('Wait for the upload to finish.', 'info');
      if (!logo) return MP.toast('Upload a logo first.', 'bad');
      const btn = $('#sf-save', box);
      btn.classList.add('loading');
      try {
        await post('server-save', { id: item?.id, name: $('#sf-name', box).value, logo });
        saved = true;
        MP.toast(item ? 'Server updated' : 'Server added');
        m.close();
        servers();
      } catch (err) {
        MP.toast(err.message, 'bad', 5000);
        btn.classList.remove('loading');
      }
    });
  }

  let workCache = [];
  async function work() {
    actions.innerHTML = `<button class="btn sm" type="button" id="new-work">${I.plus}New project</button>`;
    $('#new-work').addEventListener('click', () => editWork());
    view.innerHTML = loading(5, 84);
    try { workCache = (await A('work')).work; } catch (err) { view.innerHTML = errorBox(err); return; }
    if (state.tab !== 'work') return;
    renderWorkList();
  }

  function renderWorkList() {
    if (!workCache.length) {
      view.innerHTML = `<div class="a-empty"><b>No projects yet</b>Upload your first piece of work and it'll show up on the site straight away.<div style="margin-top:16px"><button class="btn sm" type="button" data-new>${I.plus}New project</button></div></div>`;
      $('[data-new]', view).addEventListener('click', () => editWork());
      return;
    }
    view.innerHTML = `<p class="small muted" style="margin-bottom:14px">${workCache.length} project${workCache.length === 1 ? '' : 's'}. Featured ones show first on the home page. Use the arrows to change the order.</p>
      <div class="rows">${workCache.map((w, i) => `
        <div class="a-row card" style="--i:${i}">
          ${MP.isVideo(w.images[0]) ? `<video class="thumb" src="${esc(w.images[0])}#t=0.5" muted playsinline preload="metadata"></video>` : `<img class="thumb" src="${esc(w.images[0])}" alt="" loading="lazy">`}
          <div style="min-width:0">
            <div class="title">${esc(catLabel(w.category))}</div>
            <div class="meta">${w.featured ? '<span class="badge amber">Featured</span>' : ''}${w.hidden ? '<span class="badge">Hidden</span>' : ''}<span>${MP.mediaCount(w.images)}</span>${w.year ? `<span>· ${esc(w.year)}</span>` : ''}</div>
          </div>
          <div class="actions">
            <button class="icon-btn" type="button" data-move="-1" data-id="${w.id}" aria-label="Move up" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>${I.up}</button>
            <button class="icon-btn" type="button" data-move="1" data-id="${w.id}" aria-label="Move down" ${i === workCache.length - 1 ? 'disabled style="opacity:.3"' : ''}>${I.down}</button>
            <button class="icon-btn" type="button" data-edit="${w.id}" aria-label="Edit">${I.edit}</button>
            <button class="icon-btn" type="button" data-del="${w.id}" aria-label="Delete" style="color:#ff8a83">${I.trash}</button>
          </div>
        </div>`).join('')}</div>`;

    $$('[data-edit]', view).forEach((b) => b.addEventListener('click', () => editWork(workCache.find((w) => w.id === b.dataset.edit))));
    $$('[data-del]', view).forEach((b) => b.addEventListener('click', async () => {
      const w = workCache.find((x) => x.id === b.dataset.del);
      if (!(await MP.confirm('Delete this project?', 'The project and its images are removed for good.', { okLabel: 'Delete', danger: true }))) return;
      try { await post('work-delete', { id: w.id }); workCache = workCache.filter((x) => x.id !== w.id); MP.toast('Project deleted'); renderWorkList(); }
      catch (err) { MP.toast(err.message, 'bad'); }
    }));
    $$('[data-move]', view).forEach((b) => b.addEventListener('click', async () => {
      const i = workCache.findIndex((w) => w.id === b.dataset.id);
      const j = i + Number(b.dataset.move);
      if (j < 0 || j >= workCache.length) return;
      [workCache[i], workCache[j]] = [workCache[j], workCache[i]];
      renderWorkList();
      try { await post('work-reorder', { ids: workCache.map((w) => w.id) }); } catch (err) { MP.toast(err.message, 'bad'); }
    }));
  }

  /* ---------- Video uploads: straight from the browser to Blob (skips the 4.5 MB function limit) ---------- */
  const isVideoFile = (f) => /^video\//.test(f.type) || /\.(mp4|webm|mov)$/i.test(f.name);
  let blobClient = null;
  let uploadInfo = null;
  async function uploadVideo(file, onPct) {
    uploadInfo ||= await A('upload-info');
    const maxMb = uploadInfo.videoMaxMb || 200;
    if (file.size > maxMb * 1024 * 1024) throw new Error(`${file.name} is too big (${maxMb} MB max).`);
    blobClient ||= await import('https://esm.sh/@vercel/blob@2.9.0/client');
    const ext = (file.name.match(/\.(mp4|webm|mov)$/i)?.[1] || (file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4')).toLowerCase();
    const base = file.name.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'video';
    const opts = {
      handleUploadUrl: '/api/admin?op=video-token',
      contentType: file.type || (ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4'),
      multipart: file.size > 20 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onPct(Math.round(percentage)),
    };
    const run = (access) => blobClient.upload(`work/${base}.${ext}`, file, { ...opts, access });
    let res;
    try {
      res = await run(uploadInfo.access);
    } catch (err) {
      // Store type guessed wrong: retry once with the other access mode.
      if (!/(public|private) access on a (private|public) store/i.test(err?.message || '')) throw new Error(`Video upload failed: ${err?.message || 'unknown error'}`);
      uploadInfo.access = uploadInfo.access === 'public' ? 'private' : 'public';
      res = await run(uploadInfo.access);
    }
    // Private stores aren't publicly readable: serve through our file route (the server does the same on save).
    const u = new URL(res.url);
    return /\.private\.blob\.vercel-storage\.com$/i.test(u.hostname)
      ? `/api/site?op=file&p=${encodeURIComponent(decodeURIComponent(u.pathname.replace(/^\/+/, '')))}`
      : res.url;
  }

  function editWork(item) {
    const w = item || { title: '', category: 'banners', description: '', images: [], link: '', tags: [], featured: false, hidden: false, year: String(new Date().getFullYear()), client: '' };
    let images = [...w.images];
    const fresh = new Set();
    let saved = false;
    let uploading = 0;
    const progress = {};

    const m = MP.modal({
      label: item ? 'Edit project' : 'New project',
      className: 'editor',
      onClose: () => { if (!saved && fresh.size) post('discard', { urls: [...fresh] }).catch(() => {}); },
      html: `
        <div class="modal-head"><h3>${item ? 'Edit project' : 'New project'}</h3><button class="icon-btn" data-close aria-label="Close">${icon.x}</button></div>
        <form id="wf" novalidate>
          <div class="form-grid">
            <div class="field full"><label for="wf-cat">Category</label><select class="select" id="wf-cat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${(w.category === 'web' ? 'other' : w.category) === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            <div class="field full">
              <span class="label">Images &amp; videos <span class="muted">(first one is the cover · up to 12 · videos MP4/WebM/MOV)</span></span>
              <div class="uploads" id="wf-ups"></div>
              <input type="file" id="wf-file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" multiple hidden>
            </div>
            <label class="check-row full"><span class="grow"><b>Featured</b><small>Shown first on the home page</small></span>${switchHtml('wf-feat', w.featured)}</label>
            <label class="check-row full"><span class="grow"><b>Hidden</b><small>Saved here but not shown on the site</small></span>${switchHtml('wf-hidden', w.hidden)}</label>
          </div>
          <div class="modal-foot"><button class="btn ghost sm" type="button" data-close>Cancel</button><button class="btn sm" type="submit" id="wf-save">${item ? 'Save changes' : 'Publish project'}</button></div>
        </form>`,
    });
    const box = m.box;
    const ups = $('#wf-ups', box);
    const fileInput = $('#wf-file', box);

    const renderUps = () => {
      ups.innerHTML = images.map((src, i) => `
        <div class="up" data-key="${esc(src)}">
          ${src.startsWith('pending:') ? `<div class="busy"><div class="spinner"></div>${progress[src] != null ? `<small class="up-pct">${progress[src]}%</small>` : ''}</div>` : MP.isVideo(src) ? `<video src="${esc(src)}#t=0.5" muted playsinline preload="metadata"></video><span class="badge vid">${icon.play}Video</span>` : `<img src="${esc(src)}" alt="">`}
          ${i === 0 && !src.startsWith('pending:') ? '<span class="badge cover" style="background:rgba(10,10,12,.75)">Cover</span>' : ''}
          ${src.startsWith('pending:') ? '' : `<div class="tools"><span style="display:flex;gap:4px"><button type="button" data-l="${i}" aria-label="Move left">${icon.left}</button><button type="button" data-r="${i}" aria-label="Move right">${icon.right}</button></span><button type="button" data-x="${i}" aria-label="Remove">${I.trash}</button></div>`}
        </div>`).join('') + (images.length < 12 ? `<div class="up add" id="wf-add" tabindex="0" role="button">${icon.upload}<span>Add images or videos</span></div>` : '');
      const add = $('#wf-add', ups);
      if (add) {
        add.addEventListener('click', () => fileInput.click());
        add.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileInput.click()));
        ['dragenter', 'dragover'].forEach((ev) => add.addEventListener(ev, (e) => { e.preventDefault(); add.classList.add('over'); }));
        ['dragleave', 'drop'].forEach((ev) => add.addEventListener(ev, (e) => { e.preventDefault(); add.classList.remove('over'); }));
        add.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
      }
      $$('[data-x]', ups).forEach((b) => b.addEventListener('click', () => { images.splice(Number(b.dataset.x), 1); renderUps(); }));
      $$('[data-l]', ups).forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.l); if (i > 0) { [images[i - 1], images[i]] = [images[i], images[i - 1]]; renderUps(); } }));
      $$('[data-r]', ups).forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.r); if (i < images.length - 1) { [images[i + 1], images[i]] = [images[i], images[i + 1]]; renderUps(); } }));
    };

    async function handleFiles(list) {
      const files = [...list].slice(0, 12 - images.length);
      for (const file of files) {
        const key = `pending:${Math.random()}`;
        images.push(key);
        uploading++;
        renderUps();
        try {
          let url;
          if (isVideoFile(file)) {
            progress[key] = 0;
            renderUps();
            url = await uploadVideo(file, (pct) => {
              progress[key] = pct;
              const el = ups.querySelector(`[data-key="${CSS.escape(key)}"] .up-pct`);
              if (el) el.textContent = `${pct}%`;
            });
          } else {
            const blob = await MP.compressImage(file, { max: 2400, quality: 0.88 });
            if (blob.size > 4.3 * 1024 * 1024) throw new Error(`${file.name} is too big after compression (4 MB max).`);
            ({ url } = await A(`upload&name=${encodeURIComponent(file.name)}`, { raw: blob }));
          }
          fresh.add(url);
          images[images.indexOf(key)] = url;
        } catch (err) {
          images = images.filter((x) => x !== key);
          MP.toast(err.message, 'bad', 5000);
        } finally {
          delete progress[key];
          uploading--;
          renderUps();
        }
      }
    }
    fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });
    renderUps();

    $('#wf', box).addEventListener('submit', async (e) => {
      e.preventDefault();
      if (uploading) return MP.toast('Wait for the uploads to finish.', 'info');
      const btn = $('#wf-save', box);
      btn.classList.add('loading');
      try {
        const { item: savedItem } = await post('work-save', {
          id: item?.id,
          category: $('#wf-cat', box).value,
          images: images.filter((x) => !x.startsWith('pending:')),
          featured: $('#wf-feat', box).checked,
          hidden: $('#wf-hidden', box).checked,
        });
        saved = true;
        const orphaned = [...fresh].filter((u) => !savedItem.images.includes(u));
        if (orphaned.length) post('discard', { urls: orphaned }).catch(() => {});
        MP.toast(item ? 'Project updated' : 'Project published');
        m.close();
        work();
      } catch (err) {
        MP.toast(err.message, 'bad', 5000);
        btn.classList.remove('loading');
      }
    });
  }

  async function reviews() {
    view.innerHTML = loading(4, 140);
    let list;
    try { list = (await A('reviews')).reviews; } catch (err) { view.innerHTML = errorBox(err); return; }
    if (state.tab !== 'reviews') return;
    state.pending = list.filter((r) => r.status === 'pending').length;
    renderNav();
    const counts = { pending: 0, approved: 0, rejected: 0, all: list.length };
    list.forEach((r) => counts[r.status]++);
    const filters = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Declined'], ['all', 'All']];
    actions.innerHTML = `<div class="seg" id="rf">${filters.map(([k, l]) => `<button type="button" data-f="${k}" class="${state.reviewFilter === k ? 'on' : ''}">${l}<span class="n">${counts[k]}</span></button>`).join('')}</div>`;
    $$('#rf button').forEach((b) => b.addEventListener('click', () => { state.reviewFilter = b.dataset.f; reviews(); }));

    const shown = state.reviewFilter === 'all' ? list : list.filter((r) => r.status === state.reviewFilter);
    if (!shown.length) {
      view.innerHTML = `<div class="a-empty"><b>${state.reviewFilter === 'pending' ? "You're all caught up" : 'Nothing here'}</b>${state.reviewFilter === 'pending' ? 'New reviews will show up here for approval.' : 'No reviews in this list.'}</div>`;
      return;
    }
    const tone = { pending: 'amber', approved: 'green', rejected: 'red' };
    const word = { pending: 'Pending', approved: 'Approved', rejected: 'Declined' };
    view.innerHTML = `<div class="r-grid">${shown.map((r, i) => `
      <article class="r-card card" style="--i:${i}">
        <div class="head">
          <img src="${esc(r.avatar)}" alt="" onerror="this.src='/assets/icon-48.png'">
          <div style="min-width:0;flex:1"><b style="display:block;font-size:15px">${esc(r.displayName || r.username)}</b><span class="small muted">@${esc(r.username)} · ${MP.timeAgo(r.createdAt)}</span></div>
          <span class="badge ${tone[r.status]}">${word[r.status]}</span>
        </div>
        <div class="row" style="gap:10px">${MP.stars(r.rating)}${r.project ? `<span class="tag">${esc(r.project)}</span>` : ''}</div>
        <p>${esc(r.text)}</p>
        ${r.image ? `<button class="shot" type="button" data-shot="${esc(r.image)}"><img src="${esc(r.image)}" alt="" loading="lazy"></button>` : ''}
        <div class="foot">
          ${r.status !== 'approved' ? `<button class="btn good xs" type="button" data-st="approved" data-id="${r.id}">${icon.check}Approve</button>` : ''}
          ${r.status !== 'rejected' ? `<button class="btn ghost xs" type="button" data-st="rejected" data-id="${r.id}">${icon.x}${r.status === 'approved' ? 'Unpublish' : 'Decline'}</button>` : ''}
          <button class="btn danger xs" type="button" data-rdel="${r.id}">${I.trash}Delete</button>
          <span style="margin-left:auto" class="row">${copyId(r.userId)}<button class="icon-btn" type="button" data-rban="${r.userId}" data-name="${esc(r.username)}" title="Ban this user" aria-label="Ban this user" style="width:30px;height:30px">${I.ban}</button></span>
        </div>
      </article>`).join('')}</div>`;

    $$('[data-st]', view).forEach((b) => b.addEventListener('click', async () => {
      b.classList.add('loading');
      try { await post('review-status', { id: b.dataset.id, status: b.dataset.st }); MP.toast(b.dataset.st === 'approved' ? 'Review is live' : 'Review hidden'); reviews(); }
      catch (err) { MP.toast(err.message, 'bad'); b.classList.remove('loading'); }
    }));
    $$('[data-rdel]', view).forEach((b) => b.addEventListener('click', async () => {
      if (!(await MP.confirm('Delete this review?', 'It is removed for good, including any attached image.', { okLabel: 'Delete', danger: true }))) return;
      try { await post('review-delete', { id: b.dataset.rdel }); MP.toast('Review deleted'); reviews(); }
      catch (err) { MP.toast(err.message, 'bad'); }
    }));
    $$('[data-rban]', view).forEach((b) => b.addEventListener('click', () => banDialog(b.dataset.rban, b.dataset.name, reviews)));
  }

  let orderCache = [];
  async function orders() {
    actions.innerHTML = `<a class="btn ghost sm" href="/queue" target="_blank" rel="noopener">${I.ext}Public queue</a><button class="btn sm" type="button" id="new-order">${I.plus}New order</button>`;
    $('#new-order').addEventListener('click', () => editOrder());
    view.innerHTML = loading(4, 76);
    try { orderCache = (await A('orders')).orders; } catch (err) { view.innerHTML = errorBox(err); return; }
    if (state.tab !== 'orders') return;
    renderOrders();
  }

  function renderOrders() {
    const active = orderCache.filter((o) => o.status !== 'completed').sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.createdAt - b.createdAt);
    const done = orderCache.filter((o) => o.status === 'completed').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    const row = (o, i, isActive) => {
      const [label, tone] = ORDER_STATUS[o.status];
      return `
      <div class="a-row card" style="--i:${i}">
        ${isActive ? `<span class="pos">${i + 1}</span>` : `<span class="pos" style="background:var(--green-soft);color:var(--green)">${icon.check.replace('<svg', '<svg style="width:16px;height:16px"')}</span>`}
        <div style="min-width:0">
          <div class="title">${esc(o.title)}</div>
          <div class="meta"><span class="badge ${tone}">${label}</span><span>${esc(o.type)}</span><span>· ${esc(o.client || 'No client name')}${o.showClient ? '' : ' (hidden)'}</span>${isActive && o.status !== 'queued' ? `<span>· ${o.progress}%</span>` : ''}${o.eta ? `<span>· ETA ${esc(o.eta)}</span>` : ''}${!isActive ? `<span>· ${MP.date(o.completedAt)}</span>` : ''}</div>
        </div>
        <div class="actions">
          ${isActive ? `
            <select class="select" data-qs="${o.id}" aria-label="Status" style="height:34px;width:auto;font-size:13px;border-radius:10px">${Object.entries(ORDER_STATUS).map(([k, [l]]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <button class="icon-btn" type="button" data-om="-1" data-id="${o.id}" aria-label="Move up" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>${I.up}</button>
            <button class="icon-btn" type="button" data-om="1" data-id="${o.id}" aria-label="Move down" ${i === active.length - 1 ? 'disabled style="opacity:.3"' : ''}>${I.down}</button>` : `<button class="btn ghost xs" type="button" data-reopen="${o.id}">Reopen</button>`}
          <button class="icon-btn" type="button" data-oedit="${o.id}" aria-label="Edit">${I.edit}</button>
          <button class="icon-btn" type="button" data-odel="${o.id}" aria-label="Delete" style="color:#ff8a83">${I.trash}</button>
        </div>
      </div>`;
    };
    view.innerHTML = `
      <div class="a-card card a-section">
        <div class="a-card-head"><div><h3>Current queue</h3><div class="sub">${active.length} active · top of the list is worked on first</div></div></div>
        ${active.length ? `<div class="rows">${active.map((o, i) => row(o, i, true)).join('')}</div>` : '<div class="a-empty"><b>Queue is empty</b>Add an order when someone books you.</div>'}
      </div>
      <div class="a-card card a-section">
        <div class="a-card-head"><div><h3>Completed</h3><div class="sub">${done.length} total · the latest 40 show on the public page</div></div></div>
        ${done.length ? `<div class="rows">${done.map((o, i) => row(o, i, false)).join('')}</div>` : '<p class="muted small">Nothing completed yet.</p>'}
      </div>`;

    const save = async (o, patch, msg) => {
      try {
        const { order } = await post('order-save', { ...o, ...patch });
        Object.assign(o, order);
        MP.toast(msg);
        renderOrders();
      } catch (err) { MP.toast(err.message, 'bad'); }
    };
    $$('[data-qs]', view).forEach((sel) => sel.addEventListener('change', () => {
      const o = orderCache.find((x) => x.id === sel.dataset.qs);
      save(o, { status: sel.value, progress: sel.value === 'completed' ? 100 : o.progress }, sel.value === 'completed' ? 'Marked as completed' : 'Status updated');
    }));
    $$('[data-reopen]', view).forEach((b) => b.addEventListener('click', () => {
      const o = orderCache.find((x) => x.id === b.dataset.reopen);
      save(o, { status: 'in_progress' }, 'Order reopened');
    }));
    $$('[data-oedit]', view).forEach((b) => b.addEventListener('click', () => editOrder(orderCache.find((x) => x.id === b.dataset.oedit))));
    $$('[data-odel]', view).forEach((b) => b.addEventListener('click', async () => {
      const o = orderCache.find((x) => x.id === b.dataset.odel);
      if (!(await MP.confirm(`Delete "${o.title}"?`, 'It disappears from the queue and the completed list.', { okLabel: 'Delete', danger: true }))) return;
      try { await post('order-delete', { id: o.id }); orderCache = orderCache.filter((x) => x.id !== o.id); MP.toast('Order deleted'); renderOrders(); }
      catch (err) { MP.toast(err.message, 'bad'); }
    }));
    $$('[data-om]', view).forEach((b) => b.addEventListener('click', async () => {
      const list = orderCache.filter((o) => o.status !== 'completed').sort((a, c) => (a.position ?? 0) - (c.position ?? 0) || a.createdAt - c.createdAt);
      const i = list.findIndex((o) => o.id === b.dataset.id);
      const j = i + Number(b.dataset.om);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((o, k) => (o.position = k));
      renderOrders();
      try { await post('order-reorder', { ids: list.map((o) => o.id) }); } catch (err) { MP.toast(err.message, 'bad'); }
    }));
  }

  function editOrder(o) {
    const d = o || { title: '', type: 'Banner', client: '', clientId: '', showClient: false, status: 'queued', progress: 0, eta: '', note: '' };
    const m = MP.modal({
      label: o ? 'Edit order' : 'New order',
      className: 'editor',
      html: `
        <div class="modal-head"><h3>${o ? 'Edit order' : 'New order'}</h3><button class="icon-btn" data-close aria-label="Close">${icon.x}</button></div>
        <form id="of" novalidate>
          <div class="form-grid">
            <div class="field full"><label for="of-title">What's being made</label><input class="input" id="of-title" maxlength="90" value="${esc(d.title)}" placeholder="e.g. Ticket bot with transcripts" autofocus></div>
            <div class="field"><label for="of-type">Type</label><input class="input" id="of-type" list="of-types" maxlength="40" value="${esc(d.type)}"><datalist id="of-types"><option>Banner</option><option>Discord bot</option><option>Website</option><option>UI/UX design</option><option>Logo</option><option>Other</option></datalist></div>
            <div class="field"><label for="of-status">Status</label><select class="select" id="of-status">${Object.entries(ORDER_STATUS).map(([k, [l]]) => `<option value="${k}" ${d.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label for="of-client">Client name</label><input class="input" id="of-client" maxlength="60" value="${esc(d.client)}"></div>
            <div class="field"><label for="of-cid">Client Discord ID <span class="muted">(optional)</span></label><input class="input mono" id="of-cid" inputmode="numeric" maxlength="21" value="${esc(d.clientId || '')}"></div>
            <div class="field full"><label for="of-progress">Progress: <span id="of-pv">${d.progress}</span>%</label><input class="range" type="range" id="of-progress" min="0" max="100" step="5" value="${d.progress}"></div>
            <div class="field"><label for="of-eta">ETA <span class="muted">(optional)</span></label><input class="input" id="of-eta" maxlength="40" value="${esc(d.eta || '')}" placeholder="This week, Dec 4…"></div>
            <div class="field"><label for="of-note">Public note <span class="muted">(optional)</span></label><input class="input" id="of-note" maxlength="200" value="${esc(d.note || '')}" placeholder="Waiting on assets"></div>
            <label class="check-row full"><span class="grow"><b>Show client name publicly</b><small>Off shows "Private client" on the queue</small></span>${switchHtml('of-show', d.showClient)}</label>
          </div>
          <div class="modal-foot"><button class="btn ghost sm" type="button" data-close>Cancel</button><button class="btn sm" type="submit" id="of-save">${o ? 'Save changes' : 'Add to queue'}</button></div>
        </form>`,
    });
    const box = m.box;
    $('#of-progress', box).addEventListener('input', (e) => ($('#of-pv', box).textContent = e.target.value));
    $('#of', box).addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#of-save', box);
      btn.classList.add('loading');
      try {
        await post('order-save', {
          id: o?.id,
          title: $('#of-title', box).value,
          type: $('#of-type', box).value,
          status: $('#of-status', box).value,
          client: $('#of-client', box).value,
          clientId: $('#of-cid', box).value.trim(),
          progress: Number($('#of-progress', box).value),
          eta: $('#of-eta', box).value,
          note: $('#of-note', box).value,
          showClient: $('#of-show', box).checked,
        });
        MP.toast(o ? 'Order updated' : 'Added to the queue');
        m.close();
        orders();
      } catch (err) {
        MP.toast(err.message, 'bad');
        btn.classList.remove('loading');
      }
    });
  }

  function banDialog(userId = '', name = '', after) {
    const m = MP.modal({
      label: 'Ban a user',
      html: `
        <div class="modal-head"><h3>Ban a user</h3><button class="icon-btn" data-close aria-label="Close">${icon.x}</button></div>
        <p class="muted small" style="margin-bottom:16px">They're signed out on their next request and can't sign in again. Their pending reviews are declined.</p>
        <form id="bf" novalidate>
          <div class="field"><label for="bf-id">Discord user ID</label><input class="input mono" id="bf-id" inputmode="numeric" maxlength="21" value="${esc(userId)}" placeholder="123456789012345678" ${userId ? '' : 'autofocus'}>${name ? `<span class="hint">@${esc(name)}</span>` : ''}</div>
          <div class="field"><label for="bf-reason">Reason <span class="muted">(only you see this)</span></label><input class="input" id="bf-reason" maxlength="160" placeholder="Spam reviews" ${userId ? 'autofocus' : ''}></div>
          <div class="modal-foot"><button class="btn ghost sm" type="button" data-close>Cancel</button><button class="btn danger sm" type="submit" id="bf-save">${I.ban}Ban user</button></div>
        </form>`,
    });
    $('#bf', m.box).addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#bf-save', m.box);
      btn.classList.add('loading');
      try {
        await post('ban', { userId: $('#bf-id', m.box).value.trim(), reason: $('#bf-reason', m.box).value });
        MP.toast('User banned');
        m.close();
        after?.();
      } catch (err) { MP.toast(err.message, 'bad'); btn.classList.remove('loading'); }
    });
  }

  async function people() {
    actions.innerHTML = `<button class="btn danger sm" type="button" id="new-ban">${I.ban}Ban a user ID</button>`;
    $('#new-ban').addEventListener('click', () => banDialog('', '', people));
    view.innerHTML = loading(5, 64);
    let data;
    try { data = await A('people'); } catch (err) { view.innerHTML = errorBox(err); return; }
    if (state.tab !== 'people') return;
    const banned = new Set(data.bans.map((b) => b.userId));
    view.innerHTML = `
      <div class="a-card card a-section">
        <div class="a-card-head"><div><h3>Banned</h3><div class="sub">These Discord accounts can't sign in or leave reviews.</div></div></div>
        ${data.bans.length ? `<div class="rows">${data.bans.map((b, i) => `
          <div class="a-row card" style="--i:${i}">
            <span class="pos" style="background:var(--red-soft);color:#ff8a83">${I.ban.replace('<svg', '<svg style="width:16px;height:16px"')}</span>
            <div style="min-width:0"><div class="title">${esc(b.username || 'Unknown user')}</div><div class="meta">${copyId(b.userId)}<span>· ${MP.timeAgo(b.createdAt)}</span>${b.reason ? `<span>· ${esc(b.reason)}</span>` : ''}</div></div>
            <div class="actions"><button class="btn ghost xs" type="button" data-unban="${b.userId}">Unban</button></div>
          </div>`).join('')}</div>` : '<p class="muted small">Nobody is banned.</p>'}
      </div>
      <div class="a-card card a-section">
        <div class="a-card-head"><div><h3>Recent sign-ins</h3><div class="sub">${data.users.length} account${data.users.length === 1 ? '' : 's'}, newest first</div></div><input class="input" id="pf" placeholder="Search name or ID" style="width:220px;height:38px"></div>
        <div class="rows" id="plist">${data.users.length ? data.users.map((u, i) => `
          <div class="a-row card" style="--i:${Math.min(i, 20)}" data-q="${esc((u.name + ' ' + u.username + ' ' + u.id).toLowerCase())}">
            <img class="avatar" src="${esc(u.avatar)}" alt="" loading="lazy" onerror="this.src='/assets/icon-48.png'">
            <div style="min-width:0"><div class="title">${esc(u.name)} <span class="muted" style="font-weight:400">@${esc(u.username)}</span></div><div class="meta">${copyId(u.id)}<span>· last ${MP.timeAgo(u.lastLogin)}</span><span>· ${u.logins} sign-in${u.logins === 1 ? '' : 's'}</span>${u.id === MP.viewer?.id ? '<span class="badge dusk">You</span>' : ''}</div></div>
            <div class="actions">${banned.has(u.id) ? '<span class="badge red">Banned</span>' : u.id === MP.viewer?.id ? '' : `<button class="btn ghost xs" type="button" data-pban="${u.id}" data-name="${esc(u.username)}">${I.ban}Ban</button>`}</div>
          </div>`).join('') : '<p class="muted small">No one has signed in yet.</p>'}</div>
      </div>`;
    $$('[data-unban]', view).forEach((b) => b.addEventListener('click', async () => {
      try { await post('unban', { userId: b.dataset.unban }); MP.toast('User unbanned'); people(); } catch (err) { MP.toast(err.message, 'bad'); }
    }));
    $$('[data-pban]', view).forEach((b) => b.addEventListener('click', () => banDialog(b.dataset.pban, b.dataset.name, people)));
    $('#pf', view).addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      $$('#plist [data-q]', view).forEach((r) => (r.hidden = q && !r.dataset.q.includes(q)));
    });
  }

  async function settings() {
    view.innerHTML = loading(3, 140);
    let st;
    try { st = (await A('overview&days=7')).settings; } catch (err) { view.innerHTML = errorBox(err); return; }
    if (state.tab !== 'settings') return;
    state.settings = st;
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    view.innerHTML = `
      <div class="a-card card a-section">
        <div class="a-card-head"><div><h3>Availability</h3><div class="sub">Shown in the header, on the home page and on the queue.</div></div></div>
        <div class="toggle-row"><div><b id="q-available-label">${st.available ? 'Available for work' : 'Not available'}</b><span>Flip this when you're booked up</span></div>${switchHtml('q-available', st.available)}</div>
        <div class="field" style="margin-top:18px"><label for="st-note">Status note</label><input class="input" id="st-note" maxlength="80" value="${esc(st.statusNote)}" placeholder="Taking on new projects"><span class="hint">Shows next to "Right now" on the home page and under "Taking orders" on the queue.</span></div>
      </div>
      <div class="a-card card a-section">
        <div class="a-card-head"><div><h3>Maintenance</h3><div class="sub">You can still browse everything while it's on.</div></div></div>
        <div class="toggle-row"><div><b>Maintenance mode</b><span>Visitors are sent to /maintenance. Status, terms and privacy stay open.</span></div>${switchHtml('q-maint', st.maintenance, 'red')}</div>
        <div class="form-grid" style="margin-top:18px">
          <div class="field full"><label for="st-mmsg">Message</label><textarea class="textarea" id="st-mmsg" maxlength="240" style="min-height:80px">${esc(st.maintenanceMessage)}</textarea></div>
          <div class="field"><label for="st-meta">Expected back <span class="muted">(optional)</span></label><input class="input" type="date" id="st-meta" value="${esc(st.maintenanceEta)}"><span class="hint">Shown on the maintenance page. Leave empty to hide it.</span></div>
        </div>
      </div>
      <div class="a-card card a-section">
        <div class="a-card-head"><div><h3>Reviews &amp; contact</h3></div></div>
        <div class="toggle-row"><div><b>Accept new reviews</b><span>Turn off to close the review form</span></div>${switchHtml('st-rev', st.reviewsOpen)}</div>
        <div class="form-grid" style="margin-top:18px">
          <div class="field"><label for="st-tz">Your timezone</label><div class="row" style="flex-wrap:nowrap;gap:8px"><input class="input" id="st-tz" value="${esc(st.timezone)}" placeholder="${esc(localTz)}"><button class="btn ghost sm" type="button" id="st-tz-me" style="height:46px">Use mine</button></div><span class="hint">Shows your local time on the contact card. Leave empty to hide it.</span></div>
          <div class="field"><label for="st-inv">Discord server invite <span class="muted">(optional)</span></label><input class="input" id="st-inv" value="${esc(st.discordInvite)}" placeholder="https://discord.gg/…"></div>
        </div>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn" type="button" id="st-save">Save changes</button></div>
      <div class="a-card card a-section" style="margin-top:28px">
        <div class="a-card-head"><div><h3>Backup</h3><div class="sub">Download everything (settings, work, reviews, orders, bans, sign-ins) as one JSON file. Images stay in Blob storage.</div></div><a class="btn ghost sm" href="/api/admin?op=export" download>${I.download}Export JSON</a></div>
      </div>`;
    bindQuickToggles(view);
    $('#st-tz-me', view).addEventListener('click', () => ($('#st-tz', view).value = localTz));
    $('#st-rev', view).addEventListener('change', async (e) => {
      try { await saveSettings({ reviewsOpen: e.target.checked }, e.target.checked ? 'Reviews are open' : 'Reviews are closed'); }
      catch (err) { e.target.checked = !e.target.checked; MP.toast(err.message, 'bad'); }
    });
    $('#st-save', view).addEventListener('click', async (e) => {
      e.target.classList.add('loading');
      try {
        await saveSettings({
          statusNote: $('#st-note', view).value,
          maintenanceMessage: $('#st-mmsg', view).value,
          maintenanceEta: $('#st-meta', view).value,
          timezone: $('#st-tz', view).value.trim(),
          discordInvite: $('#st-inv', view).value.trim(),
        }, 'Settings saved');
      } catch (err) { MP.toast(err.message, 'bad'); }
      e.target.classList.remove('loading');
    });
  }
})();
