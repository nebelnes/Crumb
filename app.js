'use strict';

/* Crumb: bread recipe library and dough calculator.
   Recipes live in recipes/*.json, listed in recipes/index.json.
   Adding a recipe never changes the app code. */

const view = document.getElementById('view');
const state = { recipes: [], byId: {}, q: '', cat: '' };

const STATUS = {
  verified: ['Verified', 'ok'],
  draft: ['Draft', 'draft'],
  placeholder: ['Placeholder: no formula yet', 'ph'],
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const num = (v, d = 0) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const grams = g => num(g, g < 10 ? 1 : 0);
const pct = p => num(p, 2);

function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem('crumb:' + key) || 'null');
    localStorage.setItem('crumb:' + key, JSON.stringify(val));
  } catch (e) { return null; }
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ---------- data ---------- */

async function loadRecipes() {
  const idx = await (await fetch('recipes/index.json')).json();
  const list = await Promise.all((idx.recipes || []).map(async f => {
    try {
      const r = await (await fetch('recipes/' + f)).json();
      r._file = f;
      return r;
    } catch (e) { console.warn('Could not load', f, e); return null; }
  }));
  state.recipes = list.filter(Boolean);
  state.byId = Object.fromEntries(state.recipes.map(r => [r.id, r]));
}

/* ---------- calculator ---------- */

function allIngredients(r) {
  return r.stages.flatMap(s => s.ingredients);
}

// Flour share inside an ingredient: flour = 1, starter/preferment = flourIn, everything else = 0
const flourShare = i => (i.flour ? 1 : (i.flourIn || 0));

function calc(r, c) {
  const ings = allIngredients(r);
  // ingredients with extra: true (salt, yeast added on top) don't count toward the target amount
  const sumPct = ings.filter(i => !i.extra).reduce((a, i) => a + i.pct, 0);
  const flourPct = ings.filter(i => i.flour).reduce((a, i) => a + i.pct, 0);
  const target = c.mode === 'pieces' ? c.pieces * c.pieceWeight : c.total;
  const withLoss = target * (1 + (c.loss || 0) / 100);
  const base = sumPct > 0 ? withLoss / (sumPct / 100) : 0; // grams per 100 %

  const g = i => base * i.pct / 100;
  const stages = r.stages.map(s => ({
    ...s,
    rows: s.ingredients.map(i => ({ ...i, g: g(i) })),
    total: s.ingredients.reduce((a, i) => a + g(i), 0),
  }));
  const freshFlour = ings.filter(i => i.flour).reduce((a, i) => a + g(i), 0);
  const allFlour = ings.reduce((a, i) => a + g(i) * flourShare(i), 0);
  const water = ings.reduce((a, i) => a + g(i) * (i.water || 0), 0);

  const dough = stages.reduce((a, s) => a + s.total, 0);

  return {
    stages, target, withLoss, dough, freshFlour, allFlour, water,
    hydration: allFlour > 0 ? water / allFlour * 100 : 0,
    flourPct,
    flourOk: Math.abs(flourPct - 100) < 0.05,
  };
}

/* ---------- views ---------- */

function badge(status) {
  const [label, cls] = STATUS[status] || STATUS.draft;
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function sourceText(src) {
  if (!src) return '';
  const parts = [src.title];
  if (src.volume) parts.push(`vol. ${src.volume}`);
  if (src.page) parts.push(`p. ${src.page}`);
  if (src.detail) parts.push(src.detail);
  const text = esc(parts.filter(Boolean).join(', '));
  return src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${text}</a>` : text;
}

function renderList() {
  document.title = 'Crumb';
  const cats = [...new Set(state.recipes.map(r => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en'));
  view.innerHTML = `
    <input class="search" id="q" type="search" placeholder="Search: name, tag…" value="${esc(state.q)}" autocomplete="off">
    <div class="chips" id="cats">
      <button class="chip" data-cat="" aria-pressed="${!state.cat}">All</button>
      ${cats.map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c)}</button>`).join('')}
    </div>
    <div class="cards" id="cards"></div>
    <p class="count muted" id="count"></p>`;
  const draw = () => {
    const q = state.q.trim().toLowerCase();
    const items = state.recipes
      .filter(r => !state.cat || r.category === state.cat)
      .filter(r => !q || [r.name.en, r.name.orig, r.category, ...(r.tags || [])].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.name.en.localeCompare(b.name.en, 'en'));
    document.getElementById('cards').innerHTML = items.map(r => `
      <a class="rcard" href="#/r/${encodeURIComponent(r.id)}">
        <h2>${esc(r.name.en)}</h2>
        ${r.name.orig && r.name.orig !== r.name.en ? `<div class="orig">${esc(r.name.orig)}</div>` : ''}
        ${r.variants ? `<div class="orig">${esc(r.variantLabel || 'Variants')}: ${r.variants.map(v => esc(v.label)).join(' · ')}</div>` : ''}
        <div class="meta">${badge(r.status)}${r.category ? `<span class="tag">${esc(r.category)}</span>` : ''}${(r.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      </a>`).join('') || '<p class="muted">Nothing found.</p>';
    document.getElementById('count').textContent = `${items.length} of ${state.recipes.length} recipes`;
  };
  document.getElementById('q').addEventListener('input', e => { state.q = e.target.value; draw(); });
  document.getElementById('cats').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat;
    document.querySelectorAll('#cats .chip').forEach(x => x.setAttribute('aria-pressed', x === b));
    draw();
  });
  draw();
}

function renderRecipe(id) {
  const r0 = state.byId[id];
  if (!r0) { view.innerHTML = `<a class="back" href="#/">← All recipes</a><p>Recipe not found.</p>`; return; }
  document.title = r0.name.en + ' — Crumb';
  window.scrollTo(0, 0);

  const variants = r0.variants || null;
  const saved = store('calc:' + r0.id) || {};
  const firstV = variants ? (variants.find(v => v.id === saved.variant) || variants[0]) : null;
  const y0 = Object.assign({}, r0.yield, firstV?.yield);
  const c = Object.assign({
    variant: firstV?.id,
    mode: y0.mode || 'pieces',
    pieces: y0.pieces || 1,
    pieceWeight: y0.pieceWeight || 500,
    total: y0.total || (y0.pieces || 1) * (y0.pieceWeight || 500),
    loss: y0.loss || 0,
  }, saved);

  // current recipe = shared fields + selected variant (ratio)
  const cur = () => {
    if (!variants) return r0;
    const v = variants.find(x => x.id === c.variant) || variants[0];
    return { ...r0, ...v, id: r0.id, name: r0.name, yield: Object.assign({}, r0.yield, v.yield), _variant: v };
  };
  const save = () => store('calc:' + r0.id, c);

  view.innerHTML = `
    <a class="back" href="#/">← All recipes</a>
    <div class="rhead">
      <h1>${esc(r0.name.en)}</h1>
      ${r0.name.orig && r0.name.orig !== r0.name.en ? `<div class="orig">${esc(r0.name.orig)}</div>` : ''}
      <div class="meta">${badge(r0.status)}${r0.category ? `<span class="tag">${esc(r0.category)}</span>` : ''}${(r0.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      ${r0.source ? `<div class="source">Source: ${sourceText(r0.source)}</div>` : ''}
      ${r0.status === 'placeholder' ? '<div class="placeholder-banner">Placeholder: the real formula from the source isn’t here yet. Don’t use these numbers.</div>' : ''}
    </div>

    <div class="panel">
      ${variants ? `
        <div class="plabel">${esc(r0.variantLabel || 'Variant')}</div>
        <div class="variants" id="variants" style="--n:${Math.min(variants.length, 4)}">
          ${variants.map(v => `<button data-v="${esc(v.id)}" aria-pressed="${v.id === c.variant}">
            <b>${esc(v.label)}</b>${v.sub ? `<span>${esc(v.sub)}</span>` : ''}</button>`).join('')}
        </div>` : ''}
      ${r0.yield?.mode === 'total' && !r0.yield?.allowPieces ? '' : `
        <div class="seg" id="mode">
          <button data-mode="pieces" aria-pressed="${c.mode === 'pieces'}">By pieces</button>
          <button data-mode="total" aria-pressed="${c.mode === 'total'}">By dough weight</button>
        </div>`}
      <div id="amount"></div>
      <div id="out"></div>
    </div>
    <div id="info"></div>
  `;

  const sl = Object.assign({ min: 50, max: 2000, step: 5 }, r0.yield?.slider);

  const slider = (key, label, hint) => {
    const v = c[key];
    const max = Math.max(sl.max, v);
    return `
      <div class="amount">
        <div class="amount-head">
          <label for="r-${key}">${esc(label)}</label>
          <span class="amount-val"><input id="n-${key}" data-k="${key}" type="number" inputmode="decimal" min="0" step="any" value="${v}"> g</span>
        </div>
        <input class="slider" id="r-${key}" data-k="${key}" type="range" min="${sl.min}" max="${max}" step="${sl.step}" value="${v}"
          style="--p:${((v - sl.min) / (max - sl.min) * 100).toFixed(2)}%">
        <div class="range-ends"><span>${num(sl.min)} g</span><span>${num(max)} g</span></div>
        ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
      </div>`;
  };

  const drawAmount = () => {
    const y = cur().yield || {};
    const small = k => `<div class="field"><label for="f-${k}">${k === 'pieces' ? 'Pieces' : 'Loss, %'}</label><input id="f-${k}" data-k="${k}" type="number" inputmode="decimal" min="0" step="${k === 'pieces' ? 1 : 'any'}" value="${c[k]}"></div>`;
    document.getElementById('amount').innerHTML = c.mode === 'pieces'
      ? slider('pieceWeight', 'Weight per piece') + `<div class="fields">${small('pieces')}${small('loss')}</div>`
      : slider('total', y.label || 'Dough weight', y.hint) + `<div class="fields">${small('loss')}</div>`;
  };

  const drawInfo = () => {
    const r = cur();
    document.getElementById('info').innerHTML = `
      ${r.method?.length ? `<div class="section"><h2>Method</h2><ol class="steps">${r.method.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
      ${r.notes ? `<div class="section"><h2>Notes</h2><div class="notes">${esc(r.notes)}</div></div>` : ''}`;
  };

  const drawOut = () => {
    const r = cur();
    const res = calc(r, c);
    const cond = s => [s.time, s.temp].filter(Boolean).map(esc).join(' · ');
    const extras = allIngredients(r).filter(i => i.extra).map(i => i.en.split(',')[0].toLowerCase());
    document.getElementById('out').innerHTML = `
      ${!res.flourOk ? `<div class="warn">Flour rows add up to ${pct(res.flourPct)} % instead of 100 %. Check the percentages.</div>` : ''}
      ${res.stages.map(s => `
        <div class="stage">
          <div class="stage-head"><h3>${esc(s.name)}</h3><span class="stage-cond">${cond(s)}</span></div>
          <table class="f">
            <thead><tr><th>Ingredient</th><th class="n">%</th><th class="n">g</th></tr></thead>
            <tbody>
              ${s.rows.map(i => `<tr>
                <td class="ing">${esc(i.en)}${i.flour ? '<span class="flag">flour</span>' : ''}${i.extra ? '<span class="flag">on top</span>' : ''}${i.converted ? '<span class="flag">converted</span>' : ''}
                  ${i.orig && i.orig !== i.en ? `<small>${esc(i.orig)}</small>` : ''}${i.note ? `<small>${esc(i.note)}</small>` : ''}</td>
                <td class="n">${pct(i.pct)}</td>
                <td class="n g">${grams(i.g)}</td>
              </tr>`).join('')}
              ${res.stages.length > 1 ? `<tr class="sub"><td>Stage total</td><td></td><td class="n">${grams(s.total)}</td></tr>` : ''}
            </tbody>
          </table>
          ${s.note ? `<p class="stage-cond">${esc(s.note)}</p>` : ''}
        </div>`).join('')}
      <div class="totals">
        <div class="tot"><div class="k">Total${extras.length ? ', with ' + extras.join(' and ') : ''}</div><div class="v">${grams(res.dough)} g</div></div>
        <div class="tot"><div class="k">Formula flour (100 %)</div><div class="v">${grams(res.freshFlour)} g</div></div>
        <div class="tot"><div class="k">Total flour, incl. starters</div><div class="v">${grams(res.allFlour)} g</div></div>
        <div class="tot"><div class="k">Effective hydration</div><div class="v">${num(res.hydration, 1)} %</div></div>
      </div>
      <p class="muted" style="font-size:13px;margin:8px 0 0">Effective hydration counts the water and flour inside starters, dairy and eggs.</p>`;
  };

  drawAmount(); drawOut(); drawInfo();

  document.getElementById('variants')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    c.variant = b.dataset.v;
    document.querySelectorAll('#variants button').forEach(x => x.setAttribute('aria-pressed', x === b));
    save(); drawOut(); drawInfo();
  });
  document.getElementById('mode')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode === 'total' && c.mode === 'pieces') c.total = Math.round(c.pieces * c.pieceWeight);
    c.mode = b.dataset.mode;
    document.querySelectorAll('#mode button').forEach(x => x.setAttribute('aria-pressed', x === b));
    save(); drawAmount(); drawOut();
  });
  document.getElementById('amount').addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    const v = parseFloat(String(e.target.value).replace(',', '.'));
    if (!isFinite(v) || v < 0) return;
    c[k] = v;
    // slider and number box move together
    const rng = document.getElementById('r-' + k), box = document.getElementById('n-' + k);
    if (rng && e.target !== rng) {
      if (v > Number(rng.max)) rng.max = v;
      rng.value = v;
    }
    if (box && e.target !== box) box.value = v;
    if (rng) rng.style.setProperty('--p', ((Number(rng.value) - rng.min) / (rng.max - rng.min) * 100).toFixed(2) + '%');
    save(); drawOut();
  });
}

function route() {
  const m = location.hash.match(/^#\/r\/(.+)$/);
  if (m) renderRecipe(decodeURIComponent(m[1])); else renderList();
}

/* ---------- start ---------- */

function netStatus() { document.getElementById('net').hidden = navigator.onLine; }
addEventListener('online', netStatus);
addEventListener('offline', netStatus);
netStatus();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
}

loadRecipes()
  .then(() => { addEventListener('hashchange', route); route(); })
  .catch(e => {
    console.error(e);
    view.innerHTML = '<p class="pad">Couldn’t load recipes. Open the app with an internet connection at least once.</p>';
  });
