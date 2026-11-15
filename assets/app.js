(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https:\/\//.test(u || '') ? esc(u) : '#');
  const link = (u, text, cls = '') => `<a ${cls ? `class="${cls}" ` : ''}href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  const day = (d) => new Date(d + 'T12:00:00');
  const fmtMonth = (d) => day(d).toLocaleDateString('en', { month: 'short', year: 'numeric' });
  const fmtDay = (d) => day(d).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = (d) => day(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  const load = (name) => fetch(`data/${name}.json?v=${Date.now()}`, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`${name}: ${r.status}`);
    return r.json();
  });
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* ---------- tabs ---------- */
  const TABS = ['glossary', 'brief', 'showcase'];
  function showTab(name) {
    if (!TABS.includes(name)) name = 'glossary';
    for (const t of TABS) {
      $(`#panel-${t}`).hidden = t !== name;
      $(`#tab-${t}`).setAttribute('aria-selected', String(t === name));
    }
  }
  document.querySelectorAll('.tabs button').forEach((b) =>
    b.addEventListener('click', () => { location.hash = b.dataset.tab; }));
  const route = () => {
    const [tab, arg] = location.hash.slice(1).split('/');
    showTab(tab);
    if (tab === 'brief' && arg) renderIssue(arg);
    if (tab === 'glossary' && arg) { $('#q').value = decodeURIComponent(arg); renderTerms(); }
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', route);

  /* ---------- glossary ---------- */
  let terms = [];
  let cat = 'All';
  const NEW_DAYS = 21;
  const isNew = (d) => (Date.now() - day(d).getTime()) / 864e5 <= NEW_DAYS;
  const hl = (text, q) => {
    const safe = esc(text);
    if (!q) return safe;
    const re = new RegExp(`(${esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    return safe.replace(re, '<mark>$1</mark>');
  };
  function renderChips() {
    const cats = ['All', ...[...new Set(terms.map((t) => t.cat))].sort()];
    $('#chips').innerHTML = cats.map((c) =>
      `<button class="chip" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  }
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    cat = b.dataset.cat;
    renderChips();
    renderTerms();
  });
  function renderTerms() {
    const q = $('#q').value.trim();
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = terms.filter((t) => {
      if (cat !== 'All' && t.cat !== cat) return false;
      const hay = `${t.term} ${t.cat} ${t.def} ${t.why || ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    // While searching, terms whose name matches float above ones that only mention it.
    const inName = (t) => (q && t.term.toLowerCase().includes(q.toLowerCase()) ? 0 : 1);
    if (q) list.sort((a, b) => inName(a) - inName(b));
    $('#count').textContent = `${list.length} of ${terms.length}`;
    $('#empty').hidden = list.length > 0;
    const mark = words.length === 1 ? words[0] : '';
    $('#terms').innerHTML = list.map((t) => `
      <article class="term">
        <div class="meta">
          ${isNew(t.date) ? '<span class="badge new">New</span>' : ''}
          <span class="badge">${esc(t.cat)}</span>
          <span>${fmtMonth(t.date)}</span>
        </div>
        <h3>${hl(t.term, mark)}</h3>
        <p>${hl(t.def, mark)}</p>
        ${t.why ? `<p class="why">${hl(t.why, mark)}</p>` : ''}
        ${t.url ? `<div class="more">${link(t.url, 'Read more →')}</div>` : ''}
      </article>`).join('');
  }
  $('#q').addEventListener('input', renderTerms);
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && !$('#panel-glossary').hidden) {
      e.preventDefault();
      $('#q').focus();
    }
  });

  /* ---------- daily brief ---------- */
  let issues = [];
  function renderIssue(date) {
    const it = issues.find((i) => i.date === date) || issues[0];
    if (!it) { $('#issue').innerHTML = '<p class="empty">No issues yet.</p>'; return; }
    $('#issue').innerHTML = `
      <header class="issue-head">
        <div class="kicker">Daily Brief · ${fmtDay(it.date)}</div>
        <h1>${esc(it.title)}</h1>
        ${it.intro ? `<p>${esc(it.intro)}</p>` : ''}
      </header>
      <section class="tldr"><h2>TL;DR</h2><ul>${(it.tldr || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
      ${(it.items || []).map((s) => `
        <article class="story">
          <h3>${esc(s.headline)}</h3>
          <p>${esc(s.summary)}</p>
          ${s.try ? `<p class="try"><b>Try it:</b> ${esc(s.try)}</p>` : ''}
          ${link(s.url, `Read the full article · ${esc(s.source)} →`, 'readmore')}
          <span class="tags">${(s.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</span>
        </article>`).join('')}
      ${it.quickHits?.length ? `<h2 class="section-h">Quick hits</h2><ul class="hits">${it.quickHits.map((h) =>
        `<li>${esc(h.text)} ${link(h.url, 'Link →')}</li>`).join('')}</ul>` : ''}
      ${it.newTerms?.length ? `<h2 class="section-h">New in the glossary</h2><div class="newterms">${it.newTerms.map((t) =>
        `<a class="chip" href="#glossary/${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>` : ''}`;
    $('#archive').innerHTML = issues.length > 1
      ? `<h2 class="section-h">Past issues</h2>${issues.map((i) =>
        `<button data-date="${esc(i.date)}" aria-current="${i.date === it.date}"><span>${fmtShort(i.date)}</span>${esc(i.title)}</button>`).join('')}`
      : '';
  }
  $('#archive').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) location.hash = `brief/${b.dataset.date}`;
  });

  /* ---------- showcase ---------- */
  let posts = [];
  let lab = 'All';
  const GRADS = {
    Anthropic: 'linear-gradient(140deg,#d97706,#b91c1c)',
    OpenAI: 'linear-gradient(140deg,#059669,#0e7490)',
    Google: 'linear-gradient(140deg,#2563eb,#7c3aed)',
    'Open source': 'linear-gradient(140deg,#7c3aed,#be185d)',
  };
  const grad = (l) => GRADS[l] || 'linear-gradient(140deg,#475569,#0f172a)';
  function renderLabs() {
    const labs = ['All', ...new Set(posts.map((p) => p.lab))];
    $('#labchips').innerHTML = labs.map((l) =>
      `<button class="chip" aria-pressed="${l === lab}" data-lab="${esc(l)}">${esc(l)}</button>`).join('');
  }
  $('#labchips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    lab = b.dataset.lab;
    renderLabs();
    renderPosts();
  });
  function renderPosts() {
    const liked = store.get('likes', []);
    $('#posts').innerHTML = posts.filter((p) => lab === 'All' || p.lab === lab).map((p) => `
      <article class="post" style="--g:${grad(p.lab)}">
        <div class="post-head">
          <div class="avatar" aria-hidden="true">${esc((p.lab || '?')[0])}</div>
          <div class="who"><b>${esc(p.model)}</b><span>${esc(p.creator)} · ${fmtShort(p.date)}</span></div>
        </div>
        <a class="poster${p.image ? ' has-img' : ''}" href="${safeUrl(p.url)}" target="_blank" rel="noopener noreferrer">
          ${p.image ? `<img src="${safeUrl(p.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : ''}
          <span class="pill">${esc(p.lab)}</span>
          <span class="emoji" aria-hidden="true">${esc(p.emoji || '✨')}</span>
          <h3>${esc(p.title)}</h3>
        </a>
        <div class="post-body">
          <div class="actions">
            <button class="like" data-id="${esc(p.id)}" aria-pressed="${liked.includes(p.id)}" aria-label="Like">${liked.includes(p.id) ? '♥' : '♡'}</button>
            ${link(p.url, `${esc(p.source)} →`)}
          </div>
          <p>${esc(p.blurb)}</p>
          <div class="hash">${(p.tags || []).map((t) => `#${esc(t)}`).join(' ')}${p.via ? ` · via ${link(p.viaUrl, esc(p.via))}` : ''}</div>
        </div>
      </article>`).join('');
  }
  $('#posts').addEventListener('click', (e) => {
    const b = e.target.closest('.like');
    if (!b) return;
    const liked = new Set(store.get('likes', []));
    liked.has(b.dataset.id) ? liked.delete(b.dataset.id) : liked.add(b.dataset.id);
    store.set('likes', [...liked]);
    const on = liked.has(b.dataset.id);
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? '♥' : '♡';
  });

  /* ---------- boot ---------- */
  const byNewest = (a, b) => b.date.localeCompare(a.date);
  Promise.all([load('glossary'), load('digests'), load('showcase')]).then(([g, d, s]) => {
    terms = (g.terms || []).sort((a, b) => byNewest(a, b) || a.term.localeCompare(b.term));
    issues = (d.issues || []).sort(byNewest);
    posts = (s.posts || []).sort(byNewest);
    renderChips();
    renderTerms();
    renderIssue();
    renderLabs();
    renderPosts();
    const last = [g.updated, s.updated, issues[0]?.date].filter(Boolean).sort().pop();
    if (last) $('#updated').textContent = `Last updated ${fmtShort(last)}`;
    route();
  }).catch((err) => {
    showTab('glossary');
    $('#terms').innerHTML = `<p class="empty">Couldn't load the content (${esc(err.message)}). Try refreshing.</p>`;
  });
})();
