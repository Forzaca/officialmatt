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

  /* ---------- Hero photo: gentle parallax ---------- */
  const photo = $('#hero-bg img');
  if (photo && !MP.reduced) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY;
      if (y > innerHeight * 1.2) return;
      photo.style.transform = `translate3d(0, ${(y * 0.25).toFixed(1)}px, 0)`;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  }

  /* ---------- Statement: words light up as you scroll ---------- */
  const scrub = $('#scrub');
  if (scrub) {
    const hl = new Set(['simple.', 'design,', 'code,', 'actually']);
    scrub.innerHTML = scrub.textContent.trim().split(/\s+/)
      .map((t) => `<span class="sw${hl.has(t) ? ' hl' : ''}">${MP.esc(t)}</span>`).join(' ');
    const words = $$('.sw', scrub);
    if (MP.reduced) words.forEach((w) => w.classList.add('on'));
    else {
      let pending = false;
      const light = () => {
        pending = false;
        const r = scrub.getBoundingClientRect();
        const vh = innerHeight;
        const prog = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
        const lit = Math.round(prog * words.length);
        words.forEach((w, i) => w.classList.toggle('on', i < lit));
      };
      const queue = () => { if (!pending) { pending = true; requestAnimationFrame(light); } };
      addEventListener('scroll', queue, { passive: true });
      addEventListener('resize', queue, { passive: true });
      light();
    }
  }

  /* ---------- Data ---------- */
  const setFact = (id, value) => {
    const el = $(id);
    if (!el) return;
    el.classList.remove('sk');
    const target = Number(value);
    const decimals = String(value).includes('.') ? 1 : 0;
    if (!Number.isFinite(target) || MP.reduced || target === 0) { el.textContent = value; return; }
    const start = performance.now();
    const dur = 1100;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  let workList = [];
  const featured = $('#featured');
  MP.bindWorkGrid(featured, () => workList);
  MP.api('/api/site?op=work', { quiet: true })
    .then(({ work }) => {
      workList = work;
      const newest = [...work].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const picks = [...newest.filter((w) => w.featured), ...newest.filter((w) => !w.featured)].slice(0, 3);
      if (!picks.length) {
        featured.className = 'work-grid';
        featured.innerHTML = `<div class="empty" style="grid-column:1/-1">${MP.icon.image}<b>New work is on the way</b>Projects show up here as soon as they're uploaded.</div>`;
      } else {
        featured.innerHTML = picks.map((w, i) => MP.featuredCard(w, i)).join('');
      }
      MP.reveal(featured);
      const counts = work.reduce((m, w) => ((m[MP.catOf(w)] = (m[MP.catOf(w)] || 0) + 1), m), {});
      $$('[data-count]').forEach((el) => {
        const n = counts[el.dataset.count] || 0;
        el.textContent = n ? `${n} project${n === 1 ? '' : 's'}` : '';
      });
      setFact('#fact-work', work.length);
    })
    .catch(() => {
      featured.className = 'work-grid';
      featured.innerHTML = `<div class="empty" style="grid-column:1/-1">${MP.icon.alert}<b>Couldn't load work</b>Refresh the page or check the <a href="/status" style="text-decoration:underline">status page</a>.</div>`;
      setFact('#fact-work', '—');
    });

  const reviewsEmpty = (title, text) => {
    const box = $('#reviews-empty');
    $('#home-marquee').hidden = true;
    box.hidden = false;
    box.innerHTML = `<div class="reviews-empty card"><div><b>${title}</b><p>${text}</p></div><a class="btn sm" href="/reviews#write">Leave a review</a></div>`;
  };
  MP.api('/api/site?op=reviews', { quiet: true })
    .then(({ reviews = [], summary = { count: 0, average: 0 } }) => {
      setFact('#fact-rating', summary.count ? summary.average.toFixed(1) : '—');
      if (summary.count) $('#fact-rating-label').textContent = `From ${summary.count} client review${summary.count === 1 ? '' : 's'}`;
      if (!reviews.length) return reviewsEmpty('No reviews yet', 'Worked with me? You could be the first.');
      $('#home-avg').innerHTML = `<span class="pill">${MP.icon.star.replace('<svg', '<svg style="width:14px;height:14px;color:#ffcf4d"')}${summary.average.toFixed(1)} · ${summary.count} review${summary.count === 1 ? '' : 's'}</span>`;
      let items = reviews.slice(0, 12);
      while (items.length < 6) items = items.concat(items);
      const html = items.map((r) => MP.reviewCard(r, { reveal: false })).join('');
      const track = $('#marquee');
      track.innerHTML = html + html;
      track.style.setProperty('--dur', `${items.length * 7}s`);
      [...track.children].slice(items.length).forEach((c) => c.setAttribute('aria-hidden', 'true'));
    })
    .catch(() => {
      setFact('#fact-rating', '—');
      reviewsEmpty("Couldn't load reviews", 'Refresh the page to try again.');
    });

  MP.api('/api/site?op=orders', { quiet: true })
    .then(({ totalCompleted = 0, active }) => { setFact('#fact-done', totalCompleted); setFact('#fact-queue', (active || []).length); })
    .catch(() => { setFact('#fact-done', '—'); setFact('#fact-queue', '—'); });
})();
