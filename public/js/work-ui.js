(() => {
  'use strict';
  const MP = window.MP;
  const { esc, icon } = MP;

  MP.CATEGORY = {
    banners: { label: 'Banners & graphics', short: 'Banner' },
    bots: { label: 'Discord bots', short: 'Discord bot' },
    web: { label: 'Website UI/UX', short: 'Web UI/UX' },
    other: { label: 'Other', short: 'Other' },
  };

  MP.workCard = (w, i = 0) => `
    <button class="work-card spot" type="button" data-work-id="${esc(w.id)}" data-reveal style="--delay:${Math.min(i, 6) * 70}ms" aria-label="Open ${esc(w.title)}">
      <div class="media"><img src="${esc(w.images[0])}" alt="" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async" onload="this.classList.add('loaded')"></div>
      ${w.images.length > 1 ? `<span class="badge multi" style="background:rgba(10,10,12,.6);backdrop-filter:blur(12px)">${icon.image.replace('<svg', '<svg style="width:13px;height:13px"')}${w.images.length}</span>` : ''}
      <div class="meta">
        <div style="min-width:0"><b>${esc(w.title)}</b><span>${esc(MP.CATEGORY[w.category]?.short || 'Other')}${w.year ? ' · ' + esc(w.year) : ''}</span></div>
        <span class="arrow">${icon.arrowUR}</span>
      </div>
    </button>`;

  MP.workSkeleton = (n = 6) => Array.from({ length: n }, () => '<div class="work-sk sk"></div>').join('');

  MP.openWork = (w) => {
    let idx = 0;
    const many = w.images.length > 1;
    const m = MP.modal({
      wide: true,
      label: w.title,
      html: `
        <button class="icon-btn lb-close" data-close aria-label="Close">${icon.x}</button>
        <div class="lb-stage">
          <img alt="${esc(w.title)}" data-img>
          ${many ? `<button class="lb-nav prev" data-prev aria-label="Previous image">${icon.left}</button><button class="lb-nav next" data-next aria-label="Next image">${icon.right}</button>
          <div class="lb-dots">${w.images.map(() => '<span></span>').join('')}</div>` : ''}
        </div>
        <div class="lb-info">
          <div class="row"><span class="badge dusk">${esc(MP.CATEGORY[w.category]?.label || 'Other')}</span>${w.year ? `<span class="badge">${esc(w.year)}</span>` : ''}</div>
          <h3>${esc(w.title)}</h3>
          ${w.client ? `<div class="small muted">For ${esc(w.client)}</div>` : ''}
          ${w.description ? `<p>${esc(w.description)}</p>` : '<p class="muted">No write-up for this one. The pictures say it.</p>'}
          ${w.tags?.length ? `<div class="row" style="gap:6px">${w.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          <div style="margin-top:auto;display:grid;gap:10px">
            ${w.link ? `<a class="btn" href="${esc(w.link)}" target="_blank" rel="noopener">View live ${icon.arrowUR}</a>` : ''}
            <a class="btn ghost" href="https://discord.com/users/${MP.DISCORD_ID}" target="_blank" rel="noopener">${icon.discord}Want something like this?</a>
          </div>
        </div>`,
    });
    const img = m.box.querySelector('[data-img]');
    const dots = m.box.querySelectorAll('.lb-dots span');
    const show = (n) => {
      idx = (n + w.images.length) % w.images.length;
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      img.src = w.images[idx];
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    };
    show(0);
    if (many) {
      m.box.querySelector('[data-prev]').addEventListener('click', () => show(idx - 1));
      m.box.querySelector('[data-next]').addEventListener('click', () => show(idx + 1));
      const onKey = (e) => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); };
      document.addEventListener('keydown', onKey);
      m.el.addEventListener('transitionend', () => !document.body.contains(m.el) && document.removeEventListener('keydown', onKey));
      let sx = null;
      img.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
      img.addEventListener('touchend', (e) => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
        sx = null;
      });
      w.images.slice(1).forEach((src) => { const p = new Image(); p.src = src; });
    }
  };

  MP.bindWorkGrid = (grid, getList) => {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-work-id]');
      if (!card) return;
      const item = getList().find((w) => w.id === card.dataset.workId);
      if (item) MP.openWork(item);
    });
  };
})();
