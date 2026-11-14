(() => {
  'use strict';
  const MP = window.MP;
  const { $, esc, icon } = MP;

  const STATUS = {
    queued: ['Queued', ''],
    in_progress: ['In progress', 'blue'],
    review: ['With client', 'amber'],
    completed: ['Completed', 'green'],
  };
  const set = (id, v) => { const el = $(id); el.classList.remove('sk'); el.textContent = v; };

  const activeEl = $('#active');
  const doneEl = $('#done');
  let lastJson = '';

  async function load(first) {
    try {
      const data = await MP.api('/api/site?op=orders', { quiet: !first });
      $('#q-updated').textContent = `Updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      const json = JSON.stringify(data);
      if (json === lastJson) return;
      lastJson = json;
      const { active, completed, totalCompleted } = data;

      set('#s-queued', active.filter((o) => o.status === 'queued').length);
      set('#s-progress', active.filter((o) => o.status !== 'queued').length);
      set('#s-done', totalCompleted);

      activeEl.innerHTML = active.length
        ? active.map((o, i) => {
            const [label, tone] = STATUS[o.status] || STATUS.queued;
            const current = o.status !== 'queued';
            return `
            <div class="q-item card ${current ? 'current' : ''}" data-reveal style="--delay:${Math.min(i, 6) * 60}ms">
              <div class="q-pos" aria-label="Position ${i + 1}">${i + 1}</div>
              <div style="min-width:0">
                <div class="q-title">${esc(o.title)}</div>
                <div class="q-sub"><span>${esc(o.type)}</span><span>·</span><span>${esc(o.client)}</span>${o.eta ? `<span>·</span><span>ETA ${esc(o.eta)}</span>` : ''}</div>
                ${o.note ? `<div class="small" style="margin-top:6px;color:var(--text-2)">${esc(o.note)}</div>` : ''}
                ${current ? `<div class="q-progress" role="progressbar" aria-valuenow="${o.progress}" aria-valuemin="0" aria-valuemax="100"><span data-w="${o.progress}"></span></div>` : ''}
              </div>
              <div class="row" style="gap:8px">${current ? `<span class="small muted" style="font-variant-numeric:tabular-nums">${o.progress}%</span>` : ''}<span class="badge ${tone}">${label}</span></div>
            </div>`;
          }).join('')
        : `<div class="empty">${icon.check}<b>The queue is empty</b>${MP.settings?.available ? "Now's a good time to get something started." : "I'm not taking new orders right now."}</div>`;

      doneEl.innerHTML = completed.length
        ? completed.map((o, i) => `
            <div class="done-item card" data-reveal style="--delay:${Math.min(i, 8) * 40}ms">
              <span class="check">${icon.check}</span>
              <div style="min-width:0"><b>${esc(o.title)}</b><span>${esc(o.type)} · ${esc(o.client)} · ${MP.date(o.completedAt, { month: 'short', day: 'numeric' })}</span></div>
            </div>`).join('')
        : `<div class="empty" style="grid-column:1/-1">Nothing finished yet. Check back soon.</div>`;

      MP.reveal(activeEl);
      MP.reveal(doneEl);
      setTimeout(() => activeEl.querySelectorAll('[data-w]').forEach((s) => (s.style.width = s.dataset.w + '%')), 250);
    } catch {
      if (first) {
        activeEl.innerHTML = `<div class="empty">${icon.alert}<b>Couldn't load the queue</b>Try again in a moment.</div>`;
        doneEl.innerHTML = '';
      }
    }
  }

  load(true);
  setInterval(() => document.visibilityState === 'visible' && load(false), 60000);

  MP.boot.then(({ settings }) => set('#s-open', settings.available ? 'Yes' : 'Not now'));
})();
