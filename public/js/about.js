(() => {
  'use strict';
  const MP = window.MP;
  const { $, esc } = MP;

  /* ---------- Right now: live Discord activity ---------- */
  const nowEl = $('#now');
  const CODE = /visual studio code|vs ?code|code - oss|vscodium|cursor|webstorm|intellij|sublime|zed|neovim/i;
  const codeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>';
  const STATUS = { online: 'Online', idle: 'Away', dnd: 'Do not disturb', offline: 'Offline' };

  const assetUrl = (a) => {
    const img = a?.assets?.large_image;
    if (!img) return '';
    if (img.startsWith('mp:')) return `https://media.discordapp.net/${img.slice(3)}`;
    if (a.application_id && !img.includes(':')) return `https://cdn.discordapp.com/app-assets/${a.application_id}/${img}.png`;
    return '';
  };
  const since = (start) => {
    if (!start) return '';
    const m = Math.max(0, Math.floor((Date.now() - start) / 60000));
    if (m < 1) return 'just started';
    if (m < 60) return `for ${m} min`;
    const h = Math.floor(m / 60);
    return `for ${h} h${m % 60 ? ` ${m % 60} min` : ''}`;
  };
  const clock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  // Image art sits on top of the icon tile, so a broken image just reveals the icon.
  const art = (src, fallback) => `<span class="now-art ico">${fallback}${src ? `<img src="${esc(src)}" alt="" onerror="this.remove()">` : ''}</span>`;

  function body(d) {
    if (!d) return `<div class="now-row">${art('', MP.icon.chat)}<div class="now-text"><small>Discord</small><b>Message me any time</b></div></div>`;
    const acts = d.activities || [];
    if (d.listening_to_spotify && d.spotify) {
      const s = d.spotify;
      const t = s.timestamps || {};
      return `<div class="now-row">${art(s.album_art_url, MP.icon.music)}<div class="now-text"><small class="spotify">Listening to Spotify</small><b>${esc(s.song)}</b><span>${esc((s.artist || '').replace(/;/g, ','))}</span></div></div>
        ${t.start && t.end ? `<div class="now-bar" data-start="${t.start}" data-end="${t.end}"><span class="cur"></span><div class="track"><i></i></div><span class="len">${clock(t.end - t.start)}</span></div>` : ''}`;
    }
    const code = acts.find((a) => a.type === 0 && CODE.test(a.name));
    if (code) {
      const name = /visual studio code|vs ?code/i.test(code.name) ? 'VS Code' : code.name;
      return `<div class="now-row">${art(assetUrl(code), codeIcon)}<div class="now-text"><small class="coding">Coding in ${esc(name)}</small><b>${esc(code.details || 'Building something')}</b><span>${esc(code.state || '')}${code.state ? ' · ' : ''}<span data-since="${code.timestamps?.start || ''}">${since(code.timestamps?.start)}</span></span></div></div>`;
    }
    const game = acts.find((a) => [0, 1, 3, 5].includes(a.type));
    if (game) {
      const verb = { 0: 'Playing', 1: 'Streaming', 3: 'Watching', 5: 'Competing in' }[game.type];
      return `<div class="now-row">${art(assetUrl(game), MP.icon.game)}<div class="now-text"><small>${verb}</small><b>${esc(game.name)}</b><span>${esc(game.details || '')}${game.details ? ' · ' : ''}<span data-since="${game.timestamps?.start || ''}">${since(game.timestamps?.start)}</span></span></div></div>`;
    }
    const custom = acts.find((a) => a.type === 4 && a.state);
    const label = { online: 'Around and replying', idle: 'Away from the keyboard', dnd: 'Heads down, replies may be slow', offline: "Offline, I'll reply later" }[d.discord_status] || 'Message me any time';
    return `<div class="now-row">${art('', d.discord_status === 'idle' ? MP.icon.moon : MP.icon.chat)}<div class="now-text"><small>${STATUS[d.discord_status] || 'Discord'}</small><b>${esc(custom ? custom.state : label)}</b>${custom ? `<span>${label}</span>` : ''}</div></div>`;
  }

  let lastKey = '';
  async function renderNow(fresh) {
    const d = await MP.lanyard(fresh);
    const status = d?.discord_status || 'offline';
    const key = JSON.stringify([status, d?.spotify?.track_id, (d?.activities || []).map((a) => [a.name, a.details, a.state])]);
    if (key === lastKey) return;
    lastKey = key;
    nowEl.dataset.status = status;
    nowEl.innerHTML = `
      <div class="now-head"><span class="now-dot"></span><b>Right now</b><span class="now-status">${d ? STATUS[status] : ''}</span></div>
      <div class="now-body">${body(d)}</div>`;
    tick();
  }
  function tick() {
    const bar = $('.now-bar', nowEl);
    if (bar) {
      const start = Number(bar.dataset.start);
      const end = Number(bar.dataset.end);
      const pos = Math.min(end - start, Date.now() - start);
      bar.querySelector('i').style.width = `${(pos / (end - start)) * 100}%`;
      bar.querySelector('.cur').textContent = clock(pos);
      if (Date.now() > end + 1500) renderNow(true);
    }
    nowEl.querySelectorAll('[data-since]').forEach((el) => { if (el.dataset.since) el.textContent = since(Number(el.dataset.since)); });
  }
  if (nowEl) {
    renderNow();
    setInterval(tick, 1000);
    setInterval(() => document.visibilityState === 'visible' && renderNow(true), 30000);
  }

  /* ---------- Servers I've worked with ---------- */
  const sec = $('#servers');
  if (sec) {
    MP.api('/api/site?op=servers', { quiet: true }).then(({ servers }) => {
      if (!servers?.length) return;
      const item = (s, hidden) => `<div class="logo-item"${hidden ? ' aria-hidden="true"' : ''}><img src="${esc(s.logo)}" alt="" loading="lazy" decoding="async">${s.name ? `<span>${esc(s.name)}</span>` : ''}</div>`;
      // Repeat the list so one half is always wider than the screen, then double it for a seamless loop.
      const reps = Math.max(1, Math.ceil(10 / servers.length));
      const half = (hidden) => Array.from({ length: reps }, (_, r) => servers.map((s) => item(s, hidden || r > 0)).join('')).join('');
      const track = $('.logo-track', sec);
      track.innerHTML = half(false) + half(true);
      track.style.setProperty('--dur', `${Math.max(20, servers.length * reps * 3.2)}s`);
      $('.logo-list', sec).innerHTML = servers.map((s) => `<li>${esc(s.name || 'Server')}</li>`).join('');
      sec.hidden = false;
      MP.reveal(sec);
    }).catch(() => {});
  }
})();
