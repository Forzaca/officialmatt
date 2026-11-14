(() => {
  'use strict';

  const MP = (window.MP = window.MP || {});
  const DISCORD_ID = '1272978844248178730';
  MP.DISCORD_ID = DISCORD_ID;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  MP.$ = $; MP.$$ = $$; MP.sleep = sleep;

  const page = document.body.dataset.page || '';
  MP.page = page;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  MP.reduced = reduced;

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  MP.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

  MP.timeAgo = (ts) => {
    if (!ts) return '';
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 45) return 'just now';
    const units = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [604800, 'week'], [2629800, 'month'], [31557600, 'year']];
    let unit = units[0];
    for (const u of units) if (s >= u[0]) unit = u;
    const n = Math.floor(s / unit[0]);
    return `${n} ${unit[1]}${n === 1 ? '' : 's'} ago`;
  };
  MP.date = (ts, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => (ts ? new Date(ts).toLocaleDateString(undefined, opts) : '');

  const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  MP.icon = {
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    arrowUR: svg('<path d="M7 17 17 7M8 7h9v9"/>'),
    left: svg('<path d="m15 6-6 6 6 6"/>'),
    right: svg('<path d="m9 6 6 6-6 6"/>'),
    x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    alert: svg('<path d="M12 8v5M12 16.5v.01"/><circle cx="12" cy="12" r="9"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    out: svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>'),
    shield: svg('<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>'),
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/></svg>',
    image: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
    upload: svg('<path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
    music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    game: svg('<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3M15 12h.01M18 13.5h.01"/>'),
    chat: svg('<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.2-4.4A8 8 0 1 1 21 12z"/>'),
    moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    discord: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 5.6A17 17 0 0 0 15.4 4.3l-.5 1.1a15.7 15.7 0 0 0-5.8 0l-.5-1.1a17 17 0 0 0-4.2 1.3C1.8 9.6 1.1 13.5 1.4 17.3a17 17 0 0 0 5.2 2.6l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.2 12.2 0 0 0 11.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17 17 0 0 0 5.2-2.6c.4-4.4-.7-8.3-3-11.7zM8.7 15c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg>',
  };

  MP.stars = (n, size) => {
    let out = '<span class="stars" aria-label="' + n + ' out of 5 stars">';
    for (let i = 1; i <= 5; i++) out += `<span class="${i <= n ? '' : 'off'}">${MP.icon.star}</span>`;
    return out + '</span>';
  };

  MP.reviewCard = (r, { reveal = true, i = 0 } = {}) => `
    <article class="review card spot"${reveal ? ` data-reveal style="--delay:${Math.min(i, 5) * 60}ms"` : ''}>
      <div class="review-head">
        <img src="${MP.esc(r.avatar)}" alt="" width="40" height="40" loading="lazy" onerror="this.src='/assets/icon-48.png'">
        <div style="min-width:0"><b>${MP.esc(r.name)}</b><span>@${MP.esc(r.username)}</span></div>
      </div>
      ${MP.stars(r.rating)}
      <p>${MP.esc(r.text)}</p>
      ${r.image ? `<button class="shot" type="button" data-shot="${MP.esc(r.image)}" aria-label="View attached image"><img src="${MP.esc(r.image)}" alt="" loading="lazy"></button>` : ''}
      <div class="review-foot"><span>${r.project ? MP.esc(r.project) : ''}</span><span>${MP.timeAgo(r.createdAt)}</span></div>
    </article>`;

  document.addEventListener('click', (e) => {
    const shot = e.target.closest?.('[data-shot]');
    if (!shot) return;
    MP.modal({
      label: 'Image',
      className: 'shot-modal',
      html: `<button class="icon-btn lb-close" data-close aria-label="Close" style="position:absolute;top:10px;right:10px">${MP.icon.x}</button><img src="${MP.esc(shot.dataset.shot)}" alt="" style="width:100%;border-radius:14px">`,
    });
  });

  MP.compressImage = async (file, { max = 2000, quality = 0.86 } = {}) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) throw new Error('Use a PNG, JPG, WebP or GIF image.');
    if (file.type === 'image/gif') return file;
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) throw new Error("Couldn't read that image.");
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
    if (blob && blob.type === 'image/webp') return blob;
    return new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  };
  MP.blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

  const startBar = () => {};
  const endBar = () => {};

  MP.api = async (url, { method, body, raw, quiet } = {}) => {
    if (!quiet) startBar();
    try {
      const headers = {};
      let payload;
      if (raw) { headers['Content-Type'] = 'application/octet-stream'; payload = raw; }
      else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const res = await fetch(url, { method: method || (payload ? 'POST' : 'GET'), headers, body: payload, credentials: 'same-origin' });
      let data = {};
      try { data = await res.json(); } catch {  }
      if (!res.ok || data.ok === false) {
        const err = new Error(data.error || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } finally {
      if (!quiet) endBar();
    }
  };

  let toastBox;
  MP.toast = (msg, type = 'good', ms = 3600) => {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('role', 'status'); document.body.appendChild(toastBox); }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = (type === 'bad' ? MP.icon.alert : type === 'info' ? MP.icon.info : MP.icon.check) + `<span>${MP.esc(msg)}</span>`;
    toastBox.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
  };

  MP.modal = ({ html, wide = false, className = '', onClose, label = 'Dialog' } = {}) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-box glass ${wide ? 'wide' : ''} ${className}" role="dialog" aria-modal="true" aria-label="${MP.esc(label)}">${html}</div>`;
    const prevFocus = document.activeElement;
    document.body.appendChild(wrap);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => wrap.classList.add('open'));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      wrap.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        wrap.remove();
        if (!$('.modal')) document.documentElement.style.overflow = '';
        prevFocus?.focus?.();
      }, 350);
      onClose?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = $$('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])', wrap).filter((x) => !x.disabled && x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    setTimeout(() => (wrap.querySelector('[autofocus]') || wrap.querySelector('.modal-box button, .modal-box input'))?.focus({ preventScroll: true }), 60);
    return { el: wrap, box: wrap.firstElementChild, close };
  };

  MP.confirm = (title, text, { okLabel = 'Confirm', danger = false } = {}) =>
    new Promise((resolve) => {
      let answered = false;
      const m = MP.modal({
        label: title,
        html: `<div class="modal-head"><h3>${MP.esc(title)}</h3></div><p class="muted">${MP.esc(text)}</p>
          <div class="row" style="margin-top:22px;justify-content:flex-end"><button class="btn ghost sm" data-close>Cancel</button><button class="btn sm ${danger ? 'danger' : ''}" data-ok>${MP.esc(okLabel)}</button></div>`,
        onClose: () => { if (!answered) resolve(false); },
      });
      m.box.querySelector('[data-ok]').addEventListener('click', () => { answered = true; resolve(true); m.close(); });
    });

  MP.split = (el) => {
    if (!el || el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    let i = 0;
    const walk = (node, grad) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const part of parts) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            if (grad) inner.className = 'grad-text';
            inner.style.setProperty('--i', i++);
            w.appendChild(inner);
            frag.appendChild(w);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          const isGrad = grad || child.classList.contains('grad-text');
          if (child.classList.contains('grad-text')) child.classList.remove('grad-text');
          walk(child, isGrad);
        }
      }
    };
    walk(el, false);
    el.classList.add('split');
  };

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  MP.reveal = (root = document) => {
    $$('[data-split]', root).forEach((el) => MP.split(el));
    $$('[data-reveal]:not(.in), .split:not(.in):not([data-manual])', root).forEach((el) => {
      if (!io || reduced) el.classList.add('in');
      else io.observe(el);
    });
  };

  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.spot');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  const toc = $('.toc');
  if (toc && io) {
    const links = new Map($$('a[href^="#"]', toc).map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a, id) => a.classList.toggle('on', id === e.target.id));
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    links.forEach((_, id) => { const h = document.getElementById(id); if (h) spy.observe(h); });
  }

  const top = $('#top');
  if (top) {
    const onScroll = () => top.classList.toggle('scrolled', scrollY > 12);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    const btn = $('#menu-btn');
    const setMenu = (open) => {
      top.classList.toggle('menu-open', open);
      btn?.setAttribute('aria-expanded', String(open));
    };
    btn?.addEventListener('click', () => setMenu(!top.classList.contains('menu-open')));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
    $$('.top-nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    matchMedia('(min-width: 901px)').addEventListener('change', () => setMenu(false));
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === page));
  }
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

  (async () => {
    const base = document.title;
    if (reduced || page === 'admin') return;
    const phrases = [...new Set([base, "Matt's Portfolio"])];
    const type = async (text) => {
      for (let i = 1; i <= text.length; i++) {
        document.title = text.slice(0, i) + (i < text.length ? '▍' : '');
        await sleep(55 + Math.random() * 55);
      }
    };
    const erase = async (text) => {
      for (let i = text.length; i >= 1; i--) { document.title = text.slice(0, i) + '▍'; await sleep(26); }
      document.title = '▍';
      await sleep(260);
    };
    let n = 0;
    await sleep(300);
    for (;;) {
      const t = phrases[n % phrases.length];
      await type(t);
      await sleep(n % phrases.length === 0 ? 9000 : 4500);
      if (phrases.length < 2) { await sleep(20000); }
      await erase(t);
      n++;
    }
  })();

  (() => {
    const url = new URL(location.href);
    const auth = url.searchParams.get('auth');
    if (!auth) return;
    const msgs = {
      ok: ['Signed in with Discord.', 'good'],
      cancelled: ['Sign-in cancelled.', 'info'],
      expired: ['That sign-in link expired. Try again.', 'bad'],
      failed: ["Discord didn't let us sign you in. Try again.", 'bad'],
      banned: ['This Discord account is not allowed to sign in.', 'bad'],
      unconfigured: ['Discord sign-in is not set up yet.', 'bad'],
    };
    const m = msgs[auth];
    if (m) setTimeout(() => MP.toast(m[0], m[1], 4200), 400);
    url.searchParams.delete('auth');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  })();

  MP.loginUrl = (next = location.pathname + location.hash) => `/api/auth/login?next=${encodeURIComponent(next)}`;
  MP.logout = async () => {
    try { await MP.api('/api/auth/logout', { method: 'POST', body: {} }); } catch {  }
    sessionStorage.removeItem('mp_boot');
    location.reload();
  };

  const OPEN_DURING_MAINTENANCE = ['admin', 'maintenance', 'status', 'terms', 'privacy'];

  MP.boot = MP.api('/api/site?op=bootstrap', { quiet: true })
    .catch(() => ({ settings: { available: true, maintenance: false, reviewsOpen: true, statusNote: '' }, viewer: null, isAdmin: false, offline: true }))
    .then((data) => {
      MP.settings = data.settings;
      MP.viewer = data.viewer;
      MP.isAdmin = data.isAdmin;
      const s = data.settings;

      if (s.maintenance && !data.isAdmin && !OPEN_DURING_MAINTENANCE.includes(page)) {
        location.replace('/maintenance');
        return new Promise(() => {});
      }
      if (page === 'maintenance' && !s.maintenance && !data.offline) {
        location.replace('/');
        return new Promise(() => {});
      }
      if (s.maintenance && data.isAdmin && page !== 'admin') {
        const b = document.createElement('div');
        b.className = 'notice amber';
        b.style.cssText = 'position:fixed;z-index:60;left:50%;bottom:16px;translate:-50% 0;width:max-content;max-width:calc(100% - 32px)';
        b.innerHTML = `${MP.icon.alert}<span>Maintenance mode is on. Only you can see the site. <a href="/admin" style="text-decoration:underline">Admin</a></span>`;
        document.body.appendChild(b);
      }

      renderWorkStatus(s);
      renderUser(data);
      return data;
    });

  function renderWorkStatus(s) {
    $$('[data-work-status]').forEach((el) => {
      const on = s.available;
      el.classList.remove('sk');
      el.innerHTML = `<span class="dot ${on ? 'green pulse' : 'red'}"></span>${on ? 'Available for work' : 'Not available'}`;
      el.title = s.statusNote || '';
    });
    $$('[data-work-note]').forEach((el) => {
      el.textContent = s.statusNote || (s.available ? 'Open to new projects.' : 'Booked up for now.');
      el.classList.remove('sk');
    });
  }

  function renderUser({ viewer, isAdmin }) {
    const box = $('#top-user');
    if (!box) return;
    if (!viewer) {
      box.innerHTML = `<a class="btn sm ghost" href="${MP.loginUrl()}">${MP.icon.discord}<span>Sign in</span></a>`;
      return;
    }
    box.innerHTML = `
      <div class="user-menu">
        <button class="user-btn" type="button" aria-haspopup="true" aria-expanded="false">
          <img src="${MP.esc(viewer.avatar)}" alt="" width="30" height="30"><span>${MP.esc(viewer.name)}</span>
        </button>
        <div class="user-pop glass" role="menu">
          <div class="who"><b>${MP.esc(viewer.name)}</b><span>@${MP.esc(viewer.username)}</span></div>
          ${isAdmin ? `<a class="pop-item" href="/admin" role="menuitem">${MP.icon.shield}Admin panel</a>` : ''}
          <a class="pop-item" href="/reviews#write" role="menuitem">${MP.icon.star}Leave a review</a>
          <button class="pop-item" type="button" data-logout role="menuitem">${MP.icon.out}Sign out</button>
        </div>
      </div>`;
    const menu = box.firstElementChild;
    const btn = menu.querySelector('.user-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
    menu.querySelector('[data-logout]').addEventListener('click', MP.logout);
  }

  (() => {
    if (page === 'admin' || navigator.webdriver) return;
    const path = page === '404' ? '/404' : location.pathname;
    const key = 'mp_tr:' + path;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {  }
    let newVisitor = false;
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem('mp_day') !== today) { localStorage.setItem('mp_day', today); newVisitor = true; }
    } catch {  }
    const send = () => fetch('/api/site?op=track', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, ref: document.referrer, newVisitor }),
    }).catch(() => {});
    MP.boot.then(() => (window.requestIdleCallback || setTimeout)(send, { timeout: 3000 }));
  })();

  let lanyardPromise;
  MP.lanyard = (fresh) => {
    if (fresh) lanyardPromise = null;
    lanyardPromise ||= fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
      .then((r) => r.json())
      .then((j) => (j.success ? j.data : null))
      .catch(() => null);
    return lanyardPromise;
  };

  const avatarFor = (u) => {
    if (!u?.avatar) return '/assets/icon-180.png';
    const ext = u.avatar.startsWith('a_') ? 'gif' : 'webp';
    return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext}?size=256`;
  };

  function activityHtml(d) {
    if (!d) return `<span class="act-ico">${MP.icon.chat}</span><div><small>Discord</small><b>Message me any time</b></div>`;
    if (d.listening_to_spotify && d.spotify) {
      const s = d.spotify;
      return `${s.album_art_url ? `<img src="${MP.esc(s.album_art_url)}" alt="">` : `<span class="act-ico">${MP.icon.music}</span>`}
        <div style="min-width:0"><small>Listening to Spotify</small><b>${MP.esc(s.song)}</b><small>${MP.esc((s.artist || '').replace(/;/g, ','))}</small></div>`;
    }
    const acts = d.activities || [];
    const custom = acts.find((a) => a.type === 4 && (a.state || a.emoji));
    const game = acts.find((a) => a.type === 0 || a.type === 1 || a.type === 3 || a.type === 5);
    if (game) {
      const verb = { 0: 'Playing', 1: 'Streaming', 3: 'Watching', 5: 'Competing in' }[game.type];
      return `<span class="act-ico">${MP.icon.game}</span><div style="min-width:0"><small>${verb}</small><b>${MP.esc(game.name)}</b>${game.details ? `<small>${MP.esc(game.details)}</small>` : ''}</div>`;
    }
    if (custom) {
      return `<span class="act-ico">${custom.emoji && !custom.emoji.id ? MP.esc(custom.emoji.name) : MP.icon.chat}</span><div style="min-width:0"><small>Status</small><b>${MP.esc(custom.state || '')}</b></div>`;
    }
    const label = { online: 'Online now', idle: 'Away right now', dnd: 'Focused, replies may be slow', offline: 'Offline, I\'ll reply later' }[d.discord_status] || 'Message me any time';
    return `<span class="act-ico">${d.discord_status === 'idle' ? MP.icon.moon : MP.icon.chat}</span><div><small>Discord</small><b>${label}</b></div>`;
  }

  MP.renderContact = async (el) => {
    const d = await MP.lanyard();
    const u = d?.discord_user;
    const name = u?.global_name || u?.display_name || 'Matt';
    const handle = u?.username ? '@' + u.username : 'Discord';
    const status = d?.discord_status || 'offline';
    const statusLabel = { online: 'Online', idle: 'Idle', dnd: 'Do not disturb', offline: 'Offline' }[status];
    el.innerHTML = `
      <div class="contact-top">
        <div class="lan-avatar"><img src="${MP.esc(avatarFor(u))}" alt="${MP.esc(name)}'s Discord avatar" width="72" height="72"><span class="presence ${d ? status : ''}" title="${d ? statusLabel : ''}"></span></div>
        <div style="min-width:0">
          <span class="lan-name">${MP.esc(name)}</span>
          <span class="lan-handle">${MP.esc(handle)}${d ? ` · ${statusLabel}` : ''}</span>
        </div>
      </div>
      <div class="lan-activity">${activityHtml(d)}</div>
      <div class="local-time muted small" data-local-time hidden></div>
      <div class="contact-actions">
        <a class="btn discord" href="https://discord.com/users/${DISCORD_ID}" target="_blank" rel="noopener">${MP.icon.discord}Message me</a>
        <button class="btn ghost" type="button" data-copy-username>${u?.username ? `Copy @${MP.esc(u.username)}` : 'Copy username'}</button>
      </div>`;
    MP.boot.then(({ settings }) => {
      const t = el.querySelector('[data-local-time]');
      if (!settings?.timezone || !t) return;
      const tick = () => {
        const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: settings.timezone });
        t.innerHTML = `${MP.icon.clock.replace('<svg', '<svg style="width:14px;height:14px;display:inline;vertical-align:-2px;margin-right:6px"')}It's ${time} for me right now`;
      };
      tick();
      t.hidden = false;
      setInterval(tick, 30000);
    });
  };

  $$('[data-lanyard]').forEach((el) => MP.renderContact(el));

  MP.copyUsername = async () => {
    const d = await MP.lanyard();
    const name = d?.discord_user?.username;
    const text = name || DISCORD_ID;
    try {
      await navigator.clipboard.writeText(text);
      MP.toast(name ? `Copied @${name}. Add me on Discord!` : 'Copied my Discord ID');
    } catch {
      MP.toast('Could not copy', 'bad');
    }
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('[data-copy-username]')) MP.copyUsername();
  });
  if ($('[data-copy-username]')) MP.lanyard().then((d) => {
    const name = d?.discord_user?.username;
    if (name) $$('[data-copy-username] span').forEach((s) => (s.textContent = `Copy @${name}`));
  });

  const pre = $('#preload');
  if (pre && document.documentElement.classList.contains('first')) {
    try { sessionStorage.setItem('mp_pre', '1'); } catch {  }
    setTimeout(() => {
      pre.classList.add('done');
      setTimeout(() => pre.remove(), 1100);
    }, 1050);
  } else pre?.remove();

  MP.reveal();
})();
