(() => {
  'use strict';
  const MP = window.MP;
  const { esc, icon } = MP;

  MP.CATEGORY = {
    banners: { label: 'Banners & graphics', short: 'Banner' },
    bots: { label: 'Discord bots', short: 'Discord bot' },
    web: { label: 'Side projects', short: 'Side project' },
    other: { label: 'Side projects', short: 'Side project' },
  };
  MP.catOf = (w) => (w.category === 'web' ? 'other' : w.category);

  const loaded = `this.closest('.media').classList.add('loaded')`;
  /* Cover media: a muted looping preview for videos, the image otherwise. */
  const coverHtml = (src, eager = true) => MP.isVideo(src)
    ? `<video src="${esc(src)}" muted loop autoplay playsinline preload="metadata" disablepictureinpicture controlslist="nodownload" onloadeddata="${loaded}"></video>`
    : `<img src="${esc(src)}" alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async" draggable="false" onload="${loaded}">`;
  const badgeHtml = (w) => {
    const hasVideo = w.images.some(MP.isVideo);
    if (w.images.length < 2 && !hasVideo) return '';
    const ic = (hasVideo ? icon.video : icon.image).replace('<svg', '<svg style="width:13px;height:13px"');
    return `<span class="badge multi${hasVideo ? ' has-video' : ''}">${ic}${w.images.length > 1 ? w.images.length : 'Video'}</span>`;
  };

  MP.workCard = (w, i = 0) => `
    <button class="work-card" type="button" data-work-id="${esc(w.id)}" data-reveal style="--delay:${Math.min(i, 6) * 60}ms" aria-label="Open ${esc(MP.CATEGORY[w.category]?.short || 'project')}">
      <div class="media">${coverHtml(w.images[0], i < 4)}</div>
      ${badgeHtml(w)}
    </button>`;

  /* Featured row: once the media knows its real size, the card takes that exact shape. */
  MP.fitMedia = (el) => {
    const w = el.naturalWidth || el.videoWidth;
    const h = el.naturalHeight || el.videoHeight;
    const media = el.closest('.media');
    if (w && h) media.closest('.feat-card')?.style.setProperty('--ar', (w / h).toFixed(4));
    media.classList.add('loaded');
  };
  const fitCover = (src) => MP.isVideo(src)
    ? `<video src="${esc(src)}" muted loop autoplay playsinline preload="metadata" disablepictureinpicture controlslist="nodownload" onloadedmetadata="MP.fitMedia(this)"></video>`
    : `<img src="${esc(src)}" alt="" loading="eager" decoding="async" draggable="false" onload="MP.fitMedia(this)">`;

  /* Latest projects (home): one row, each card is just its full image */
  MP.featuredCard = (w, i = 0) => `
    <button class="work-card feat-card" type="button" data-work-id="${esc(w.id)}" data-reveal style="--delay:${i * 90}ms" aria-label="Open ${esc(w.title || MP.CATEGORY[w.category]?.short || 'project')}">
      <div class="media">${fitCover(w.images[0])}</div>
      ${badgeHtml(w)}
    </button>`;

  MP.workSkeleton = (n = 6) => Array.from({ length: n }, () => '<div class="work-sk sk"></div>').join('');

  MP.openWork = (w) => {
    let idx = 0;
    const many = w.images.length > 1;
    const m = MP.modal({
      wide: true,
      className: 'lb',
      label: MP.CATEGORY[w.category]?.short || 'Project',
      html: `
        <button class="icon-btn lb-close" data-close aria-label="Close">${icon.x}</button>
        <div class="lb-stage">
          <img alt="" data-img draggable="false">
          <video data-vid controls playsinline preload="metadata" disablepictureinpicture controlslist="nodownload noremoteplayback noplaybackrate" hidden></video>
          ${many ? `<button class="lb-nav prev" data-prev aria-label="Previous">${icon.left}</button><button class="lb-nav next" data-next aria-label="Next">${icon.right}</button>
          <div class="lb-dots">${w.images.map((u) => `<span${MP.isVideo(u) ? ' class="v"' : ''}></span>`).join('')}</div>` : ''}
        </div>`,
    });
    const stage = m.box.querySelector('.lb-stage');
    const img = m.box.querySelector('[data-img]');
    const vid = m.box.querySelector('[data-vid]');
    const dots = m.box.querySelectorAll('.lb-dots span');
    const show = (n) => {
      idx = (n + w.images.length) % w.images.length;
      const src = w.images[idx];
      const isVid = MP.isVideo(src);
      vid.pause();
      img.hidden = isVid;
      vid.hidden = !isVid;
      const el = isVid ? vid : img;
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      if (isVid) {
        if (vid.getAttribute('src') !== src) vid.src = src;
        vid.currentTime = 0;
        vid.play().catch(() => {});
        img.removeAttribute('src');
      } else {
        vid.removeAttribute('src'); vid.load();
        img.src = src;
      }
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    };
    show(0);
    // Stop playback when the lightbox closes.
    m.el.addEventListener('transitionend', () => { if (!document.body.contains(m.el)) vid.pause(); });
    if (many) {
      m.box.querySelector('[data-prev]').addEventListener('click', () => show(idx - 1));
      m.box.querySelector('[data-next]').addEventListener('click', () => show(idx + 1));
      const onKey = (e) => {
        if (document.activeElement === vid) return;
        if (e.key === 'ArrowLeft') show(idx - 1);
        if (e.key === 'ArrowRight') show(idx + 1);
      };
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
      w.images.slice(1).filter((u) => !MP.isVideo(u)).forEach((src) => { const p = new Image(); p.src = src; });
    }
    stage.addEventListener('contextmenu', (e) => e.preventDefault());
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
