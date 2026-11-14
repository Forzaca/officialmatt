(() => {
  'use strict';
  const MP = window.MP;
  const { $, $$ } = MP;

  const grid = $('#grid');
  const filters = $('#filters');
  const glider = $('.filter-glider', filters);
  const count = $('#work-count');
  let all = [];
  let cat = new URLSearchParams(location.search).get('c') || 'all';
  if (!['all', 'banners', 'bots', 'web', 'other'].includes(cat)) cat = 'all';

  grid.innerHTML = MP.workSkeleton(6);
  MP.bindWorkGrid(grid, () => all);

  const moveGlider = () => {
    const active = $(`.filter[data-cat="${cat}"]`, filters);
    if (!active) return;
    glider.style.width = `${active.offsetWidth}px`;
    glider.style.transform = `translateX(${active.offsetLeft - 4}px)`;
    glider.style.left = '4px';
  };

  const render = () => {
    $$('.filter', filters).forEach((b) => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    moveGlider();
    const list = cat === 'all' ? all : all.filter((w) => w.category === cat);
    count.textContent = `${list.length} project${list.length === 1 ? '' : 's'}`;
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${MP.icon.image}<b>Nothing here yet</b>${cat === 'all' ? 'New work is on the way.' : 'No projects in this category yet. Try another one.'}</div>`;
      return;
    }
    grid.innerHTML = list.map((w, i) => MP.workCard(w, i)).join('');
    MP.reveal(grid);
  };

  filters.addEventListener('click', (e) => {
    const b = e.target.closest('.filter');
    if (!b || b.dataset.cat === cat) return;
    cat = b.dataset.cat;
    const url = new URL(location.href);
    if (cat === 'all') url.searchParams.delete('c'); else url.searchParams.set('c', cat);
    history.replaceState(null, '', url.pathname + url.search);
    if (document.startViewTransition && !MP.reduced) document.startViewTransition(render);
    else render();
  });
  addEventListener('resize', moveGlider);
  document.fonts?.ready.then(moveGlider);

  MP.api('/api/site?op=work')
    .then(({ work }) => {
      all = work;
      const counts = work.reduce((m, w) => ((m[w.category] = (m[w.category] || 0) + 1), m), {});
      $$('.filter', filters).forEach((b) => {
        const n = b.dataset.cat === 'all' ? work.length : counts[b.dataset.cat] || 0;
        b.insertAdjacentHTML('beforeend', `<span class="n">${n}</span>`);
      });
      render();
      const deep = location.hash.slice(1);
      const hit = deep && all.find((w) => w.id === deep);
      if (hit) setTimeout(() => MP.openWork(hit), 300);
    })
    .catch(() => {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${MP.icon.alert}<b>Couldn't load work</b>Refresh the page or check the <a href="/status" style="text-decoration:underline">status page</a>.</div>`;
    });
  moveGlider();
})();
