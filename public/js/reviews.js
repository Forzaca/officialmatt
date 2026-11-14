(() => {
  'use strict';
  const MP = window.MP;
  const { $, $$, esc, icon } = MP;

  const list = $('#list');
  const write = $('#write');
  list.innerHTML = Array.from({ length: 6 }, (_, i) => `
    <div class="review card"><div class="review-head"><span class="sk" style="width:40px;height:40px;border-radius:12px"></span><div style="flex:1;display:grid;gap:7px"><span class="sk sk-line" style="width:45%"></span><span class="sk sk-line" style="width:30%"></span></div></div>
    <span class="sk sk-line" style="width:${70 + (i % 3) * 10}%"></span><span class="sk sk-line" style="width:90%"></span><span class="sk sk-line" style="width:60%"></span></div>`).join('');

  const loadList = () => MP.api('/api/site?op=reviews')
    .then(({ reviews, summary }) => {
      $('#avg').textContent = summary.count ? summary.average.toFixed(1) : '–';
      $('#avg-stars').outerHTML = `<div id="avg-stars">${MP.stars(Math.round(summary.average))}</div>`;
      $('#avg-count').textContent = `${summary.count} review${summary.count === 1 ? '' : 's'}`;
      $$('#summary .sk').forEach((el) => el.classList.remove('sk'));
      const max = Math.max(1, ...summary.breakdown.map((b) => b.count));
      $('#bars').innerHTML = summary.breakdown.map((b) => `
        <div class="bar-row"><span>${b.stars}★</span><div class="track"><div class="fill" data-w="${(b.count / max) * 100}"></div></div><span style="text-align:right">${b.count}</span></div>`).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => $$('#bars .fill').forEach((f) => (f.style.width = f.dataset.w + '%'))));

      list.innerHTML = reviews.length
        ? reviews.map((r, i) => MP.reviewCard(r, { i })).join('')
        : `<div class="empty">${icon.star.replace('<svg', '<svg style="width:30px;height:30px;margin:0 auto 12px;color:#ffcf4d"')}<b>No reviews yet</b>Worked with me? You could be the first.</div>`;
      MP.reveal(list);
    })
    .catch(() => {
      list.innerHTML = `<div class="empty">${icon.alert}<b>Couldn't load reviews</b>Try refreshing the page.</div>`;
    });
  loadList();

  const signInCard = () => `
    <h2 class="h3" style="font-size:21px">Leave a review</h2>
    <p class="muted" style="margin:8px 0 18px;font-size:15px">Sign in with Discord to leave a review. You don't need to join any server.</p>
    <a class="btn block" href="${MP.loginUrl('/reviews#write')}">${icon.discord}Sign in with Discord</a>
    <p class="small" style="margin-top:12px;color:var(--text-4)">I only see your Discord name and avatar. <a href="/privacy" style="text-decoration:underline">Privacy</a></p>`;

  const pendingCard = (r) => `
    <h2 class="h3" style="font-size:21px">Thanks for the review</h2>
    <div class="notice amber" style="margin:14px 0">${icon.clock}<span>It's waiting for approval. It'll show up here once I've read it.</span></div>
    <div class="card" style="padding:16px;border-radius:16px">${MP.stars(r.rating)}<p style="margin-top:8px;color:var(--text-2);font-size:14.5px;white-space:pre-line">${esc(r.text)}</p></div>
    <button class="btn ghost sm block" style="margin-top:14px" type="button" data-withdraw="${esc(r.id)}">Withdraw review</button>`;

  const formCard = (viewer, last) => `
    <div class="row" style="gap:12px;margin-bottom:18px">
      <img src="${esc(viewer.avatar)}" alt="" width="40" height="40" style="border-radius:12px">
      <div style="min-width:0"><b style="display:block;font-size:15px">${esc(viewer.name)}</b><span class="small muted">Posting as @${esc(viewer.username)}</span></div>
    </div>
    ${last?.status === 'approved' ? `<div class="notice green" style="margin-bottom:16px">${icon.check}<span>Your last review is live. Thanks!</span></div>` : ''}
    ${last?.status === 'rejected' ? `<div class="notice" style="margin-bottom:16px">${icon.info}<span>Your last review wasn't approved. You're welcome to write another.</span></div>` : ''}
    <form id="review-form" novalidate>
      <div class="field">
        <span class="label" id="rating-label">Rating</span>
        <div class="star-input" role="radiogroup" aria-labelledby="rating-label">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}" data-star="${n}">${icon.star}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label for="r-project">What did I make for you? <span class="muted">(optional)</span></label><input class="input" id="r-project" maxlength="80" placeholder="Server banner, ticket bot, website…"></div>
      <div class="field"><label for="r-text">Your review</label><textarea class="textarea" id="r-text" maxlength="800" placeholder="How was it working together? How did it turn out?" required></textarea><div class="counter"><span id="r-count">0</span>/800</div></div>
      <div class="field">
        <span class="label">Image <span class="muted">(optional)</span></span>
        <label class="drop" id="r-drop">${icon.image}<span>Drop a screenshot or <u>browse</u></span><span class="small" style="color:var(--text-4)">PNG, JPG, WebP or GIF</span><input type="file" id="r-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label>
        <div class="drop-preview" id="r-preview" hidden><img alt="Attached image preview"><button class="icon-btn" type="button" id="r-remove" aria-label="Remove image">${icon.x}</button></div>
      </div>
      <button class="btn block" type="submit" id="r-submit">Submit review</button>
      <p class="small" style="margin-top:10px;color:var(--text-4);text-align:center">Reviews show up after approval. <a href="/terms#reviews" style="text-decoration:underline">Guidelines</a></p>
    </form>`;

  function bindForm() {
    const form = $('#review-form');
    let rating = 0;
    let image = null;
    const stars = $$('[data-star]', form);
    const paint = (n) => stars.forEach((s) => s.classList.toggle('on', Number(s.dataset.star) <= n));
    stars.forEach((s) => {
      s.addEventListener('mouseenter', () => paint(Number(s.dataset.star)));
      s.addEventListener('mouseleave', () => paint(rating));
      s.addEventListener('click', () => {
        rating = Number(s.dataset.star);
        paint(rating);
        stars.forEach((x) => x.setAttribute('aria-checked', String(x === s)));
        s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
        setTimeout(() => s.classList.remove('pop'), 300);
      });
    });
    const text = $('#r-text');
    text.addEventListener('input', () => ($('#r-count').textContent = text.value.length));

    const drop = $('#r-drop');
    const file = $('#r-file');
    const preview = $('#r-preview');
    const setFile = async (f) => {
      if (!f) return;
      try {
        const blob = await MP.compressImage(f, { max: 1600, quality: 0.84 });
        if (blob.size > 3 * 1024 * 1024) throw new Error('That image is too big. Keep it under 3 MB.');
        image = await MP.blobToDataUrl(blob);
        $('img', preview).src = image;
        preview.hidden = false;
        drop.hidden = true;
      } catch (err) {
        MP.toast(err.message, 'bad');
      }
    };
    file.addEventListener('change', () => setFile(file.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0]));
    $('#r-remove').addEventListener('click', () => { image = null; file.value = ''; preview.hidden = true; drop.hidden = false; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!rating) return MP.toast('Pick a star rating first.', 'bad');
      if (text.value.trim().length < 10) return MP.toast('Write at least a sentence.', 'bad');
      const btn = $('#r-submit');
      btn.classList.add('loading');
      try {
        await MP.api('/api/reviews?op=submit', { body: { rating, text: text.value, project: $('#r-project').value, image } });
        MP.toast('Review sent. It will show up once approved.');
        renderWrite();
      } catch (err) {
        MP.toast(err.message, 'bad', 5000);
        if (err.status === 401) setTimeout(() => (location.href = MP.loginUrl('/reviews#write')), 900);
      } finally {
        btn.classList.remove('loading');
      }
    });
  }

  async function renderWrite() {
    const { settings, viewer } = await MP.boot;
    if (settings.reviewsOpen === false) {
      write.innerHTML = `<h2 class="h3" style="font-size:21px">Reviews are closed</h2><p class="muted" style="margin-top:8px">I'm not taking new reviews right now. Check back later.</p>`;
      return;
    }
    if (!viewer) { write.innerHTML = signInCard(); return; }
    try {
      const { reviews: mine } = await MP.api('/api/reviews?op=mine', { quiet: true });
      const pending = mine.find((r) => r.status === 'pending');
      if (pending) {
        write.innerHTML = pendingCard(pending);
        $('[data-withdraw]', write).addEventListener('click', async (e) => {
          if (!(await MP.confirm('Withdraw review?', 'Your pending review will be deleted.', { okLabel: 'Withdraw', danger: true }))) return;
          e.target.classList.add('loading');
          try {
            await MP.api('/api/reviews?op=withdraw', { body: { id: pending.id } });
            MP.toast('Review withdrawn.');
            renderWrite();
          } catch (err) { MP.toast(err.message, 'bad'); e.target.classList.remove('loading'); }
        });
        return;
      }
      write.innerHTML = formCard(viewer, mine[0]);
      bindForm();
    } catch (err) {
      write.innerHTML = err.status === 401 || err.status === 403 ? signInCard() : `<div class="notice red">${icon.alert}<span>${esc(err.message)}</span></div>`;
    }
  }
  const toWrite = () => {
    if (location.hash !== '#write') return;
    write.classList.add('in');
    write.scrollIntoView({ behavior: MP.reduced ? 'auto' : 'smooth', block: 'start' });
  };
  renderWrite().then(toWrite);
  addEventListener('hashchange', toWrite);
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href="/reviews#write"], a[href="#write"]');
    if (a && location.pathname.replace(/\/$/, '') === '/reviews') { e.preventDefault(); history.replaceState(null, '', '#write'); toWrite(); }
  });
})();
