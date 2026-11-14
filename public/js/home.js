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

  const bg = $('#hero-bg');
  const content = $('#hero-content');
  if (bg && !MP.reduced) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY;
      const h = innerHeight;
      if (y > h * 1.2) return;
      bg.style.transform = `translate3d(0, ${y * 0.32}px, 0) scale(${1 + (y / h) * 0.06})`;
      content.style.transform = `translate3d(0, ${y * 0.16}px, 0)`;
      content.style.opacity = String(Math.max(0, 1 - y / (h * 0.75)));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  }

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
      const picks = work.slice(0, 5);
      if (!picks.length) {
        featured.className = 'work-grid';
        featured.innerHTML = `<div class="empty" style="grid-column:1/-1">${MP.icon.image}<b>New work is on the way</b>Projects show up here as soon as they're uploaded.</div>`;
      } else {
        featured.innerHTML = picks.map((w, i) => MP.workCard(w, i)).join('');
      }
      MP.reveal(featured);
      const counts = work.reduce((m, w) => ((m[w.category] = (m[w.category] || 0) + 1), m), {});
      $$('[data-count]').forEach((el) => {
        const n = counts[el.dataset.count] || 0;
        el.textContent = n ? `${n} project${n === 1 ? '' : 's'} in the portfolio` : '';
      });
      setFact('#fact-work', work.length);
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
      track.children.length && [...track.children].slice(items.length).forEach((c) => c.setAttribute('aria-hidden', 'true'));
      MP.reveal(section);
    })
    .catch(() => setFact('#fact-rating', '—'));

  MP.api('/api/site?op=orders', { quiet: true })
    .then(({ totalCompleted }) => setFact('#fact-done', totalCompleted))
    .catch(() => setFact('#fact-done', '—'));

  MP.boot.then(() => $$('[data-work-note]').forEach((el) => el.classList.remove('sk')));
})();
