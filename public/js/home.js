(() => {
  'use strict';
  const MP = window.MP;
  const { $, $$ } = MP;
  const first = document.documentElement.classList.contains('first');
  const offset = first ? 1100 : 0;

  const title = $('#hero-title');
  setTimeout(() => title?.classList.add('in'), offset + 120);
  if (offset) $$('#hero-content [data-reveal]').forEach((el) => {
    const d = parseInt(getComputedStyle(el).getPropertyValue('--delay')) || 0;
    el.style.setProperty('--delay', `${d + offset}ms`);
  });

  /* ---------- Hero background: perspective wave of dots ---------- */
  const canvas = $('#hero-canvas');
  const hero = $('#hero');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const EMBER = [255, 116, 72];
    const DUSK = [139, 108, 255];
    let w = 0, h = 0, dpr = 1, running = true, visible = true, raf = 0;
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    const COLS = innerWidth < 700 ? 44 : 72;
    const ROWS = innerWidth < 700 ? 30 : 42;

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.75);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (MP.reduced) draw(8);
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
      const fov = Math.min(w, 1400) * 0.9;
      const horizon = h * (0.5 + my * 0.03);
      const camH = 2.4;
      const spread = 22;
      for (let r = 0; r < ROWS; r++) {
        const z = 2 + (ROWS - r) * 0.9;
        const depth = 1 - r / ROWS;
        for (let c = 0; c < COLS; c++) {
          const x = (c / (COLS - 1) - 0.5) * spread * 2 + mx * 2.5;
          const wave =
            Math.sin(x * 0.32 + t * 0.7) * 0.55 +
            Math.cos(z * 0.38 - t * 0.55) * 0.55 +
            Math.sin((x + z) * 0.18 + t * 0.35) * 0.45;
          const sx = w / 2 + (x * fov) / z;
          if (sx < -20 || sx > w + 20) continue;
          const sy = horizon + ((camH - wave * 0.6) * fov) / z * 0.45;
          if (sy > h + 10) continue;
          const lift = (wave + 1.5) / 3;
          const k = c / (COLS - 1);
          const col = EMBER.map((e, i) => Math.round(e + (DUSK[i] - e) * k + 60 * lift * lift));
          const a = Math.max(0, (1 - depth * 0.92)) * (0.35 + lift * 0.65);
          const size = Math.max(0.5, (2.6 * 6) / z);
          ctx.fillStyle = `rgba(${Math.min(col[0], 255)},${Math.min(col[1], 255)},${Math.min(col[2], 255)},${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, 6.2832);
          ctx.fill();
        }
      }
    };

    const loop = (now) => {
      raf = 0;
      if (!running || !visible) return;
      draw(now / 1000);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && running && visible && !MP.reduced) raf = requestAnimationFrame(loop); };

    resize();
    addEventListener('resize', resize, { passive: true });
    if (!MP.reduced) {
      addEventListener('pointermove', (e) => {
        tmx = (e.clientX / innerWidth - 0.5) * 2;
        tmy = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
      document.addEventListener('visibilitychange', () => { running = !document.hidden; start(); });
      start();
    }
  }

  /* ---------- Scroll effects ---------- */
  const bg = $('#hero-bg');
  const content = $('#hero-content');
  const meter = $('#scroll-meter');
  const scrub = $('#scrub');
  let words = [];
  if (scrub) {
    const highlight = new Set(['simple.', 'design,', 'code,', 'actually']);
    scrub.innerHTML = scrub.textContent.trim().split(/\s+/)
      .map((t) => `<span class="sw${highlight.has(t) ? ' hl' : ''}">${MP.esc(t)}</span>`).join(' ');
    words = $$('.sw', scrub);
  }

  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    meter?.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (MP.reduced) return;

    if (y < vh * 1.2 && bg && content) {
      const p = y / vh;
      bg.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 + p * 0.08})`;
      bg.style.opacity = String(Math.max(0, 1 - p * 0.9));
      content.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;
      content.style.opacity = String(Math.max(0, 1 - y / (vh * 0.7)));
    }

    if (words.length) {
      const r = scrub.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.4)));
      const lit = Math.round(prog * words.length);
      words.forEach((wd, i) => wd.classList.toggle('on', i < lit));
    }

    $$('[data-parallax]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(mid * (parseFloat(el.dataset.parallax) || 0.1)).toFixed(1)}px, 0)`;
    });
  };
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  onScroll();
  if (MP.reduced) words.forEach((wd) => wd.classList.add('on'));

  /* ---------- Data ---------- */
  const setFact = (id, value) => {
    const el = $(id);
    if (!el) return;
    el.classList.remove('sk');
    el.textContent = value;
  };

  let workList = [];
  const featured = $('#featured');
  MP.bindWorkGrid(featured, () => workList);
  MP.api('/api/site?op=work', { quiet: true })
    .then(({ work }) => {
      workList = work;
      const picks = [...work].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
      if (!picks.length) {
        featured.className = 'work-grid';
        featured.innerHTML = `<div class="empty" style="grid-column:1/-1">${MP.icon.image}<b>New work is on the way</b>Projects show up here as soon as they're uploaded.</div>`;
      } else {
        featured.innerHTML = picks.map((w, i) => MP.workCard(w, i)).join('');
      }
      MP.reveal(featured);
      const counts = work.reduce((m, w) => ((m[MP.catOf(w)] = (m[MP.catOf(w)] || 0) + 1), m), {});
      $$('[data-count]').forEach((el) => {
        const n = counts[el.dataset.count] || 0;
        el.textContent = n ? `${n} project${n === 1 ? '' : 's'} in the portfolio` : '';
      });
      setFact('#fact-work', work.length);
      queue();
    })
    .catch(() => {
      featured.className = 'work-grid';
      featured.innerHTML = `<div class="empty" style="grid-column:1/-1">${MP.icon.alert}<b>Couldn't load work</b>Refresh the page or check the <a href="/status" style="text-decoration:underline">status page</a>.</div>`;
      setFact('#fact-work', '—');
    });

  MP.api('/api/site?op=reviews', { quiet: true })
    .then(({ reviews, summary }) => {
      setFact('#fact-rating', summary.count ? summary.average.toFixed(1) : '—');
      if (!reviews.length) return;
      const section = $('#home-reviews');
      section.hidden = false;
      $('#home-avg').innerHTML = `<span class="pill">${MP.icon.star.replace('<svg', '<svg style="width:14px;height:14px;color:#ffcf4d"')}${summary.average.toFixed(1)} · ${summary.count} review${summary.count === 1 ? '' : 's'}</span>`;
      let items = reviews.slice(0, 12);
      while (items.length < 6) items = items.concat(items);
      const html = items.map((r) => MP.reviewCard(r, { reveal: false })).join('');
      const track = $('#marquee');
      track.innerHTML = html + html;
      track.style.setProperty('--dur', `${items.length * 7}s`);
      [...track.children].slice(items.length).forEach((c) => c.setAttribute('aria-hidden', 'true'));
      MP.reveal(section);
      queue();
    })
    .catch(() => setFact('#fact-rating', '—'));

  MP.api('/api/site?op=orders', { quiet: true })
    .then(({ totalCompleted }) => setFact('#fact-done', totalCompleted))
    .catch(() => setFact('#fact-done', '—'));
})();
