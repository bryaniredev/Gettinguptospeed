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
  const TABS = ['glossary', 'brief', 'showcase', 'cheatsheet'];
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
    if (tab === 'cheatsheet' && arg) {
      const el = document.getElementById(`cs-${arg}`);
      if (el) { el.scrollIntoView(); return; }
    }
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

  /* ---------- cheatsheet ---------- */
  let sheet = { sections: [] };
  const done = new Set(store.get('cheat-done', []));
  const rich = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>');
  const section = (id) => sheet.sections.find((x) => x.id === id);
  function updateProgress() {
    const ids = sheet.sections.map((x) => x.id);
    const n = ids.filter((id) => done.has(id)).length;
    $('#progress-text').textContent = `${n} of ${ids.length} done`;
    $('#progress-bar').style.width = `${ids.length ? (n / ids.length) * 100 : 0}%`;
    for (const id of ids) {
      document.getElementById(`cs-${id}`)?.classList.toggle('is-done', done.has(id));
      document.getElementById(`toc-${id}`)?.classList.toggle('is-done', done.has(id));
    }
  }
  function markDone(id) {
    done.add(id);
    store.set('cheat-done', [...done]);
    updateProgress();
  }
  function exerciseHtml(x) {
    const e = x.exercise;
    if (!e) return '';
    let inner = '';
    if (e.type === 'choice') {
      inner = `<div class="opts">${e.options.map((o, i) =>
        `<button type="button" class="opt" data-i="${i}">${rich(o.t)}</button>`).join('')}</div>`;
    } else if (e.type === 'fill') {
      const size = Math.max(...e.answers.map((a) => a.length)) + 2;
      inner = `<pre class="code fill"><code>${esc(e.before)}<input class="blank" size="${size}" aria-label="Your answer" autocomplete="off" autocapitalize="off" spellcheck="false">${esc(e.after)}</code></pre>
        <div class="ex-actions">
          <button type="button" class="btn check">Check</button>
          <button type="button" class="btn ghost hint">Hint</button>
          <button type="button" class="btn ghost solve">Show answer</button>
        </div>`;
    } else if (e.type === 'classify') {
      inner = `<ul class="cls">${e.items.map((it, i) => `
        <li data-i="${i}">
          <span class="cls-t">${rich(it.t)}</span>
          <span class="cls-b">${e.buckets.map((b, j) =>
            `<button type="button" class="opt pick" data-b="${j}">${esc(b)}</button>`).join('')}</span>
          <span class="cls-why"></span>
        </li>`).join('')}</ul>`;
    }
    return `<div class="ex" data-type="${esc(e.type)}">
      <div class="ex-h">Try it</div>
      <p class="ex-q">${rich(e.q)}</p>
      ${inner}
      <p class="fb" aria-live="polite"></p>
    </div>`;
  }
  function renderSheet() {
    const groups = [...new Set(sheet.sections.map((x) => x.group))];
    $('#toc-links').innerHTML = groups.map((g) => `
      <div class="toc-g">${esc(g)}</div>
      ${sheet.sections.filter((x) => x.group === g).map((x) =>
        `<a id="toc-${esc(x.id)}" href="#cheatsheet/${esc(x.id)}"><span class="tick" aria-hidden="true"></span>${esc(x.title)}</a>`).join('')}`).join('');
    let num = 0;
    $('#sheet-body').innerHTML = `
      <header class="sheet-head">
        <div class="kicker">Cheatsheet · as of ${fmtShort(sheet.asOf)}</div>
        <h1>Claude Code best practices</h1>
        <p>${esc(sheet.intro || '')} ${sheet.source ? link(sheet.source, 'Based on Anthropic’s best practices guide →') : ''}</p>
      </header>
      ${groups.map((g) => `
        <h2 class="group-h">${esc(g)}</h2>
        ${sheet.sections.filter((x) => x.group === g).map((x) => `
          <article class="cs" id="cs-${esc(x.id)}" data-id="${esc(x.id)}">
            <h3><span class="num">${++num}</span>${esc(x.title)}<span class="donemark" aria-label="Completed">✓</span></h3>
            ${(x.body || []).map((p) => `<p>${rich(p)}</p>`).join('')}
            ${x.example ? `<figure class="eg">
              <figcaption><span>${esc(x.example.label || 'Example')}</span><button type="button" class="copy">Copy</button></figcaption>
              <pre class="code"><code>${esc(x.example.code)}</code></pre>
            </figure>` : ''}
            ${x.tip ? `<p class="tip"><b>Tip</b> ${rich(x.tip)}</p>` : ''}
            ${exerciseHtml(x)}
            ${x.url ? `<div class="more">${link(x.url, 'Read the docs →')}</div>` : ''}
          </article>`).join('')}`).join('')}`;
    updateProgress();
  }
  function checkFill(ex, e, id) {
    const input = ex.querySelector('.blank');
    const val = input.value.trim().replace(/^["'`]|["'`]$/g, '').toLowerCase();
    const fb = ex.querySelector('.fb');
    if (!val) { fb.className = 'fb'; fb.textContent = 'Type an answer first.'; return; }
    const ok = e.answers.some((a) => a.toLowerCase() === val);
    input.classList.toggle('right', ok);
    input.classList.toggle('wrong', !ok);
    fb.className = `fb ${ok ? 'good' : 'bad'}`;
    fb.innerHTML = ok ? `Correct. ${rich(e.why || '')}` : 'Not quite. Try again, or ask for a hint.';
    if (ok) markDone(id);
  }
  $('#sheet-body').addEventListener('click', (ev) => {
    const copy = ev.target.closest('.copy');
    if (copy) {
      const text = copy.closest('.eg').querySelector('code').textContent;
      (navigator.clipboard?.writeText(text) || Promise.reject()).then(
        () => { copy.textContent = 'Copied'; },
        () => { copy.textContent = 'Select and copy'; },
      ).finally(() => setTimeout(() => { copy.textContent = 'Copy'; }, 1500));
      return;
    }
    const btn = ev.target.closest('button');
    const ex = ev.target.closest('.ex');
    if (!btn || !ex) return;
    const id = ex.closest('.cs').dataset.id;
    const e = section(id).exercise;
    const fb = ex.querySelector('.fb');
    if (e.type === 'choice' && btn.classList.contains('opt')) {
      const o = e.options[+btn.dataset.i];
      ex.querySelectorAll('.opt').forEach((b) => b.classList.remove('right', 'wrong'));
      btn.classList.add(o.ok ? 'right' : 'wrong');
      fb.className = `fb ${o.ok ? 'good' : 'bad'}`;
      fb.innerHTML = `${o.ok ? 'Correct.' : 'Not quite.'} ${rich(o.why || '')}`;
      if (o.ok) markDone(id);
    } else if (e.type === 'fill') {
      if (btn.classList.contains('check')) checkFill(ex, e, id);
      if (btn.classList.contains('hint')) { fb.className = 'fb'; fb.innerHTML = `Hint: ${rich(e.hint || '')}`; }
      if (btn.classList.contains('solve')) {
        ex.querySelector('.blank').value = e.answers[0];
        fb.className = 'fb';
        fb.innerHTML = `The answer is <code>${esc(e.answers[0])}</code>. ${rich(e.why || '')}`;
      }
    } else if (e.type === 'classify' && btn.classList.contains('pick')) {
      const li = btn.closest('li');
      const it = e.items[+li.dataset.i];
      const ok = +btn.dataset.b === it.b;
      li.querySelectorAll('.pick').forEach((b) => b.classList.remove('wrong'));
      btn.classList.add(ok ? 'right' : 'wrong');
      const why = li.querySelector('.cls-why');
      why.className = `cls-why ${ok ? 'good' : 'bad'}`;
      why.innerHTML = ok ? rich(it.why || '') : 'Not quite. Think again.';
      if (ok) {
        li.classList.add('ok');
        li.querySelectorAll('.pick').forEach((b) => { b.disabled = true; });
        const left = ex.querySelectorAll('li:not(.ok)').length;
        fb.className = 'fb good';
        fb.textContent = left ? `${left} to go.` : 'All sorted.';
        if (!left) markDone(id);
      }
    }
  });
  $('#sheet-body').addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' || !ev.target.classList.contains('blank')) return;
    const ex = ev.target.closest('.ex');
    const id = ex.closest('.cs').dataset.id;
    checkFill(ex, section(id).exercise, id);
  });
  $('#reset').addEventListener('click', () => {
    done.clear();
    store.set('cheat-done', []);
    renderSheet();
  });
  const wide = window.matchMedia('(min-width: 900px)');
  const syncToc = () => { $('#toc').open = wide.matches; };
  wide.addEventListener('change', syncToc);
  syncToc();
  $('#toc-links').addEventListener('click', (ev) => {
    if (ev.target.closest('a') && !wide.matches) $('#toc').open = false;
  });

  /* ---------- boot ---------- */
  const byNewest = (a, b) => b.date.localeCompare(a.date);
  Promise.all([load('glossary'), load('digests'), load('showcase'), load('cheatsheet')]).then(([g, d, s, c]) => {
    terms = (g.terms || []).sort((a, b) => byNewest(a, b) || a.term.localeCompare(b.term));
    issues = (d.issues || []).sort(byNewest);
    posts = (s.posts || []).sort(byNewest);
    sheet = c;
    renderChips();
    renderTerms();
    renderIssue();
    renderLabs();
    renderPosts();
    renderSheet();
    const last = [g.updated, s.updated, c.asOf, issues[0]?.date].filter(Boolean).sort().pop();
    if (last) $('#updated').textContent = `Last updated ${fmtShort(last)}`;
    route();
  }).catch((err) => {
    showTab('glossary');
    $('#terms').innerHTML = `<p class="empty">Couldn't load the content (${esc(err.message)}). Try refreshing.</p>`;
  });
})();
