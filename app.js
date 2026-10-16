'use strict';

/* Crumb: bread recipe library and dough calculator.
   Recipes live in recipes/*.json, listed in recipes/index.json.
   Adding a recipe never changes the app code. */

const view = document.getElementById('view');
const state = { recipes: [], byId: {}, q: '', cat: '' };

/* ---------- language ---------- */

let LANG = 'en';
try { LANG = localStorage.getItem('crumb:lang') === 'ru' ? 'ru' : 'en'; } catch (e) {}

const UI = {
  en: {
    verified: 'Verified', draft: 'Draft', placeholder: 'Placeholder: no formula yet',
    search: 'Search: name, tag…', all: 'All', variants: 'Variants', nothing: 'Nothing found.',
    count: (n, t) => `${n} of ${t} recipes`, back: '← All recipes', notFound: 'Recipe not found.',
    source: 'Source', vol: 'vol.', page: 'p.',
    phBanner: 'Placeholder: the real formula from the source isn’t here yet. Don’t use these numbers.',
    variant: 'Variant', byPieces: 'By pieces', byWeight: 'By dough weight', g: 'g',
    pieces: 'Pieces', loss: 'Loss, %', perPiece: 'Weight per piece', doughWeight: 'Dough weight',
    method: 'Method', notes: 'Notes',
    flourWarn: p => `Flour rows add up to ${p} % instead of 100 %. Check the percentages.`,
    ingredient: 'Ingredient', flour: 'flour', onTop: 'on top', converted: 'converted', stageTotal: 'Stage total',
    total: 'Total', with: ', with ', and: ' and ', formulaFlour: 'Formula flour (100 %)',
    allFlour: 'Total flour, incl. starters', hydration: 'Effective hydration',
    hydNote: 'Effective hydration counts the water and flour inside starters, dairy and eggs.',
    hydShort: 'hydration',
    loadErr: 'Couldn’t load recipes. Open the app with an internet connection at least once.',
    offline: 'offline', switchTo: 'Русский', refPhotos: 'Reference photos', tapToEnlarge: 'Tap a photo to enlarge', close: 'Close',
  },
  ru: {
    verified: 'Проверено', draft: 'Черновик', placeholder: 'Заглушка: формулы ещё нет',
    search: 'Поиск: название, тег…', all: 'Все', variants: 'Варианты', nothing: 'Ничего не найдено.',
    count: (n, t) => `Рецептов: ${n} из ${t}`, back: '← Все рецепты', notFound: 'Рецепт не найден.',
    source: 'Источник', vol: 'т.', page: 'с.',
    phBanner: 'Заглушка: настоящей формулы из источника ещё нет. Эти цифры не использовать.',
    variant: 'Вариант', byPieces: 'По штукам', byWeight: 'По весу теста', g: 'г',
    pieces: 'Штук', loss: 'Потери, %', perPiece: 'Вес одной штуки', doughWeight: 'Вес теста',
    method: 'Как делать', notes: 'Заметки',
    flourWarn: p => `Мука в формуле даёт ${p} %, а должна 100 %. Проверьте проценты.`,
    ingredient: 'Ингредиент', flour: 'мука', onTop: 'сверху', converted: 'пересчитано', stageTotal: 'Итого этап',
    total: 'Всего', with: ', с ', and: ' и ', formulaFlour: 'Мука в формуле (100 %)',
    allFlour: 'Мука всего, с заквасками', hydration: 'Гидратация эффективная',
    hydNote: 'Эффективная гидратация учитывает воду и муку внутри заквасок, молочных продуктов и яиц.',
    hydShort: 'гидратация',
    loadErr: 'Не удалось загрузить рецепты. Откройте приложение с интернетом хотя бы один раз.',
    offline: 'офлайн', switchTo: 'English', refPhotos: 'Фото для справки', tapToEnlarge: 'Нажмите на фото, чтобы увеличить', close: 'Закрыть',
  },
};
const T = k => UI[LANG][k];

// Localised field: obj.key_ru in Russian mode when present, otherwise obj.key.
// Short time/temperature strings without a _ru version get their units translated.
const RU_UNITS = [[/\bh\b/g, 'ч'], [/\bmin\b/g, 'мин'], [/\bd\b/g, 'дн'], [/autolyse/g, 'автолиз'],
  [/room temp/g, 'комнатная'], [/then/g, 'затем'], [/\bDDT\b/g, 'Т теста'], [/best/g, 'лучший'], [/\bp\./g, 'с.']];
// Sources and page references are hidden for now. They stay in the recipe files;
// set SHOW_SOURCES to true to bring them all back.
const SHOW_SOURCES = false;
const PAGE = '(?<!\\p{L})(?:pp?|с)\\.\\s*\\d[\\d·–-]*';
const HIDE_REFS = [
  new RegExp(`\\s*\\([^()]*${PAGE}[^()]*\\)`, 'gu'),                  // "(book p. 132)", "(книга, с. 3·20)"
  new RegExp(`[;,]?\\s*(?:book|книга),?\\s*${PAGE}`, 'giu'),            // "; book p. 119"
  new RegExp(`\\s*·?\\s*${PAGE}`, 'gu'),                               // "· p. 87", "p. 113"
];
function hideRefs(t) {
  if (SHOW_SOURCES || typeof t !== 'string') return t;
  return HIDE_REFS.reduce((a, re) => a.replace(re, ''), t)
    .replace(/\s+([.,;])/g, '$1').replace(/^[\s·;,]+|[\s·;,]+$/g, '').replace(/ {2,}/g, ' ');
}
function L(obj, key, units = false) {
  if (!obj) return '';
  let v = (LANG === 'ru' && obj[key + '_ru'] != null) ? obj[key + '_ru'] : obj[key];
  if (LANG === 'ru' && units && obj[key + '_ru'] == null && typeof v === 'string') v = RU_UNITS.reduce((a, [re, to]) => a.replace(re, to), v);
  return Array.isArray(v) ? v.map(hideRefs) : hideRefs(v);
}
const ingName = i => (LANG === 'ru' ? (i.ru || i.en) : i.en);
// second line under a name: the other language / original
const ingAlt = i => {
  const shown = ingName(i);
  const alt = LANG === 'ru' ? i.en : i.orig;
  return alt && alt !== shown ? alt : '';
};
const recName = r => (LANG === 'ru' ? (r.name.ru || r.name.en) : r.name.en);
const recAlt = r => {
  const alt = LANG === 'ru' ? r.name.en : r.name.orig;
  return alt && alt !== recName(r) ? alt : '';
};

const STATUS = {
  verified: ['verified', 'ok'],
  draft: ['draft', 'draft'],
  placeholder: ['placeholder', 'ph'],
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const num = (v, d = 0) => Number(v).toLocaleString(LANG === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const grams = g => num(g, g < 1 ? 2 : g < 10 ? 1 : 0);
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
      // Versions marked "hidden" stay in the file but are not shown for now.
      if (r.variants) r.variants = r.variants.filter(v => !v.hidden);
      return r;
    } catch (e) { console.warn('Could not load', f, e); return null; }
  }));
  state.recipes = list.filter(Boolean);
  state.byId = Object.fromEntries(state.recipes.map(r => [r.id, r]));
}

/* ---------- calculator ---------- */

// Ingredients of the dough itself. Stages marked topping: true (sauce, cheese, ghee)
// scale with the dough but stay out of the dough weight, flour and hydration.
function allIngredients(r) {
  return r.stages.filter(s => !s.topping).flatMap(s => s.ingredients);
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

  const dough = stages.filter(s => !s.topping).reduce((a, s) => a + s.total, 0);

  return {
    stages, target, withLoss, dough, freshFlour, allFlour, water,
    hydration: allFlour > 0 ? water / allFlour * 100 : 0,
    flourPct,
    flourOk: Math.abs(flourPct - 100) < 0.05,
  };
}

/* ---------- views ---------- */

// The Draft / Verified label is hidden for now; statuses stay in the recipe files.
// Set SHOW_STATUS to true to bring the label back. (A placeholder recipe still shows its red warning banner.)
const SHOW_STATUS = false;
function badge(status) {
  if (!SHOW_STATUS) return '';
  const [label, cls] = STATUS[status] || STATUS.draft;
  return `<span class="badge ${cls}">${esc(T(label))}</span>`;
}

function sourceText(src) {
  if (!src) return '';
  const parts = [L(src, 'title')];
  if (src.volume) parts.push(`${T('vol')} ${src.volume}`);
  if (src.page) parts.push(`${T('page')} ${src.page}`);
  if (src.detail) parts.push(L(src, 'detail'));
  const text = esc(parts.filter(Boolean).join(', '));
  return src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${text}</a>` : text;
}

function renderList() {
  document.title = 'Crumb';
  const catOf = r => L(r, 'category');
  const tagsOf = r => L(r, 'tags') || [];
  const cats = [...new Set(state.recipes.map(catOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, LANG));
  if (state.cat && !cats.includes(state.cat)) state.cat = '';
  view.innerHTML = `
    <input class="search" id="q" type="search" placeholder="${esc(T('search'))}" value="${esc(state.q)}" autocomplete="off">
    <div class="chips" id="cats">
      <button class="chip" data-cat="" aria-pressed="${!state.cat}">${esc(T('all'))}</button>
      ${cats.map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c)}</button>`).join('')}
    </div>
    <div class="cards" id="cards"></div>
    <p class="count muted" id="count"></p>`;
  const draw = () => {
    const q = state.q.trim().toLowerCase();
    const items = state.recipes
      .filter(r => !state.cat || catOf(r) === state.cat)
      .filter(r => !q || [r.name.en, r.name.ru, r.name.orig, r.category, r.category_ru, ...(r.tags || []), ...(r.tags_ru || [])].join(' ').toLowerCase().includes(q))
      .sort((a, b) => recName(a).localeCompare(recName(b), LANG));
    document.getElementById('cards').innerHTML = items.map(r => `
      <a class="rcard" href="#/r/${encodeURIComponent(r.id)}">
        <h2>${esc(recName(r))}</h2>
        ${recAlt(r) ? `<div class="orig">${esc(recAlt(r))}</div>` : ''}
        ${r.groups ? `<div class="orig">${r.groups.map(g => esc(L(g, 'label'))).join(' · ')}</div>` : r.variants ? `<div class="orig">${esc(L(r, 'variantLabel') || T('variants'))}: ${r.variants.map(v => esc(L(v, 'label', true))).join(' · ')}</div>` : ''}
        <div class="meta">${badge(r.status)}${catOf(r) ? `<span class="tag">${esc(catOf(r))}</span>` : ''}${tagsOf(r).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      </a>`).join('') || `<p class="muted">${esc(T('nothing'))}</p>`;
    document.getElementById('count').textContent = T('count')(items.length, state.recipes.length);
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
  if (!r0) { view.innerHTML = `<a class="back" href="#/">${esc(T('back'))}</a><p>${esc(T('notFound'))}</p>`; return; }
  document.title = recName(r0) + ' — Crumb';
  window.scrollTo(0, 0);

  const variants = r0.variants || null;
  // groups: optional tabs above the version buttons (e.g. КМКЗ: start / refresh / ripe dough)
  const groups = r0.groups || null;
  const groupOf = id => groups ? groups.find(g => g.id === id) : null;
  const saved = store('calc:' + r0.id) || {};
  const firstV = variants ? (variants.find(v => v.id === saved.variant) || variants[0]) : null;
  const y0 = Object.assign({}, r0.yield, groupOf(firstV?.group)?.yield, firstV?.yield);
  const c = Object.assign({
    variant: firstV?.id,
    mode: y0.mode || 'pieces',
    pieces: y0.pieces || 1,
    pieceWeight: y0.pieceWeight || 500,
    total: y0.total || (y0.pieces || 1) * (y0.pieceWeight || 500),
    loss: y0.loss || 0,
  }, saved);
  c.byGroup = c.byGroup || {};   // per tab: last version and amount

  // current recipe = shared fields + selected variant (ratio)
  const cur = () => {
    if (!variants) return r0;
    const v = variants.find(x => x.id === c.variant) || variants[0];
    const g = groupOf(v.group) || {};
    return { ...r0, ...v, id: r0.id, name: r0.name, status: v.status || g.status || r0.status,
      yield: Object.assign({}, r0.yield, g.yield, v.yield), _variant: v, _group: g };
  };
  const save = () => store('calc:' + r0.id, c);

  view.innerHTML = `
    <section class="card hero">
      <a class="back" href="#/">${esc(T('back'))}</a>
      ${(r0.images || []).filter(im => im.kind === 'photo').slice(0, 1).map(im => `
        <button type="button" class="hero-photo" data-img="recipes/${esc(im.src)}" aria-label="${esc(L(im, 'caption') || recName(r0))}">
          <img src="recipes/${esc(im.src)}" alt="${esc(L(im, 'caption') || recName(r0))}" loading="lazy">
        </button>`).join('')}
      <div>
        <h1>${esc(recName(r0))}</h1>
        ${recAlt(r0) ? `<div class="orig">${esc(recAlt(r0))}</div>` : ''}
        <div class="summary" id="summary"></div>
      </div>
      ${groups ? `
        <div class="tabs" id="tabs" role="tablist" style="--n:${groups.length}">
          ${groups.map(g => `<button type="button" role="tab" data-g="${esc(g.id)}">${esc(L(g, 'label'))}</button>`).join('')}
        </div>` : ''}
      ${variants ? `<div class="variants" id="variants" role="group" aria-label="${esc(L(r0, 'variantLabel') || T('variant'))}"></div>` : ''}
      <div class="meta"><span id="badge"></span>${L(r0, 'category') ? `<span class="tag">${esc(L(r0, 'category'))}</span>` : ''}${(L(r0, 'tags') || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      ${r0.source && SHOW_SOURCES ? `<div class="source">${esc(T('source'))}: ${sourceText(r0.source)}</div>` : ''}
      <div id="phbanner"></div>
    </section>

    <section class="card amount-card">
      ${r0.yield?.mode === 'total' && !r0.yield?.allowPieces ? '' : `
        <div class="seg" id="mode" role="group">
          <button type="button" data-mode="pieces" aria-pressed="${c.mode === 'pieces'}">${esc(T('byPieces'))}</button>
          <button type="button" data-mode="total" aria-pressed="${c.mode === 'total'}">${esc(T('byWeight'))}</button>
        </div>`}
      <div id="amount"></div>
    </section>
    <div id="out"></div>
    <div id="info"></div>
  `;

  // slider ranges: yield.slider for the main amount, yield.pieceSlider for weight per piece
  const ranges = () => {
    const y = cur().yield || {};
    return {
      total: Object.assign({ min: 50, max: 2500, step: 5 }, y.slider),
      pieceWeight: Object.assign({ min: 50, max: 250, step: 5 }, y.pieceSlider),
    };
  };

  const slider = (key, label, hint) => {
    const sl = ranges()[key];
    const v = c[key];
    const max = Math.max(sl.max, v);
    return `
      <div class="amount">
        <div class="amount-head">
          <label for="r-${key}">${esc(label)}</label>
          <span class="amount-val"><input id="n-${key}" data-k="${key}" type="number" inputmode="decimal" min="0" step="any" value="${v}"> ${T('g')}</span>
        </div>
        <input class="slider" id="r-${key}" data-k="${key}" type="range" min="${sl.min}" max="${max}" step="${sl.step}" value="${v}"
          style="--p:${((v - sl.min) / (max - sl.min) * 100).toFixed(2)}%">
        <div class="range-ends"><span>${num(sl.min)} ${T('g')}</span><span>${num(max)} ${T('g')}</span></div>
        ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
      </div>`;
  };

  const drawAmount = () => {
    const y = cur().yield || {};
    const small = k => `<div class="field"><label for="f-${k}">${k === 'pieces' ? T('pieces') : T('loss')}</label><input id="f-${k}" data-k="${k}" type="number" inputmode="decimal" min="0" step="${k === 'pieces' ? 1 : 'any'}" value="${c[k]}"></div>`;
    document.getElementById('amount').innerHTML = c.mode === 'pieces'
      ? slider('pieceWeight', T('perPiece')) + `<div class="fields">${small('pieces')}${small('loss')}</div>`
      : slider('total', L(y, 'label') || T('doughWeight'), L(y, 'hint')) + `<div class="fields">${small('loss')}</div>`;
  };

  const drawInfo = () => {
    const r = cur();
    const method = L(r, 'method') || [];
    const notes = L(r, 'notes');
    document.getElementById('info').innerHTML = `
      ${method.length ? `<section class="card"><h2>${esc(T('method'))}</h2><ol class="steps">${method.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>` : ''}
      ${notes ? `<section class="card"><h2>${esc(T('notes'))}</h2><div class="notes">${esc(notes)}</div></section>` : ''}
      ${(r.images || []).length ? `<section class="card"><h2>${esc(T('refPhotos'))}</h2>
        <div class="ref-photos">${r.images.map(im => `
          <button type="button" class="ref ${esc(im.kind || '')}" data-img="recipes/${esc(im.src)}">
            <img src="recipes/${esc(im.src)}" alt="${esc(L(im, 'caption') || '')}" loading="lazy">
            ${L(im, 'caption') ? `<span>${esc(L(im, 'caption'))}</span>` : ''}
          </button>`).join('')}</div>
        <p class="fine">${esc(T('tapToEnlarge'))}</p></section>` : ''}`;
  };

  const drawOut = () => {
    const r = cur();
    const res = calc(r, c);
    const cond = s => [L(s, 'time', true), L(s, 'temp', true)].filter(Boolean).map(esc).join(' · ');
    const extras = allIngredients(r).filter(i => i.extra).map(i => ingName(i).split(',')[0].toLowerCase());
    const summary = (c.mode === 'pieces' ? `${num(c.pieces)} × ${num(c.pieceWeight)} ${T('g')}` : `${grams(res.dough)} ${T('g')}`)
      + ` · ${num(res.hydration, 1)} % ${T('hydShort')}`;
    document.getElementById('summary').textContent = summary;
    document.getElementById('out').innerHTML = `
      ${!res.flourOk ? `<div class="warn">${esc(T('flourWarn')(pct(res.flourPct)))}</div>` : ''}
      <section class="card totals-card">
        <div class="totals">
          <div class="tot"><div class="k">${esc(T('total'))}${extras.length ? esc(T('with') + extras.join(T('and'))) : ''}</div><div class="v">${grams(res.dough)} ${T('g')}</div></div>
          <div class="tot"><div class="k">${esc(T('hydration'))}</div><div class="v">${num(res.hydration, 1)} %</div></div>
          <div class="tot"><div class="k">${esc(T('formulaFlour'))}</div><div class="v">${grams(res.freshFlour)} ${T('g')}</div></div>
          <div class="tot"><div class="k">${esc(T('allFlour'))}</div><div class="v">${grams(res.allFlour)} ${T('g')}</div></div>
        </div>
        <p class="fine">${esc(T('hydNote'))}</p>
      </section>
      ${res.stages.map(s => `
        <section class="card stage${s.topping ? ' topping' : ''}">
          <div class="stage-head"><h3>${s.link ? `<a class="rlink" href="#/r/${esc(s.link)}">${esc(L(s, 'name'))}&nbsp;<span aria-hidden="true">→</span></a>` : esc(L(s, 'name'))}</h3><span class="stage-cond">${cond(s)}</span></div>
          <div class="ings-head" aria-hidden="true"><span>${esc(T('ingredient'))}</span><span>%</span><span>${T('g')}</span></div>
          <ul class="ings">
            ${s.rows.map(i => `<li>
              <div class="ing-top">
                <span class="ing-name">${i.link ? `<a class="rlink" href="#/r/${esc(i.link)}">${esc(ingName(i))}&nbsp;<span aria-hidden="true">→</span></a>` : esc(ingName(i))}${i.flour ? `<span class="flag flour">${T('flour')}</span>` : ''}${i.extra ? `<span class="flag">${T('onTop')}</span>` : ''}${i.converted ? `<span class="flag">${T('converted')}</span>` : ''}</span>
                <span class="ing-pct">${pct(i.pct)} %</span>
                <b class="ing-g">${grams(i.g)} ${T('g')}</b>
              </div>
              ${ingAlt(i) ? `<small>${esc(ingAlt(i))}</small>` : ''}${L(i, 'note') ? `<small>${esc(L(i, 'note'))}</small>` : ''}
            </li>`).join('')}
          </ul>
          ${res.stages.length > 1 ? `<div class="stage-total"><span>${esc(T('stageTotal'))}</span><b>${grams(s.total)} ${T('g')}</b></div>` : ''}
          ${L(s, 'note') ? `<p class="fine">${esc(L(s, 'note'))}</p>` : ''}
        </section>`).join('')}
`;
  };

  // version buttons (only the current tab's) and tab state
  const drawVariants = () => {
    if (!variants) return;
    const r = cur();
    const list = groups ? variants.filter(v => v.group === r._variant.group) : variants;
    const box = document.getElementById('variants');
    box.dataset.count = list.length;
    box.innerHTML = list.map(v => `<button type="button" data-v="${esc(v.id)}" aria-pressed="${v.id === c.variant}">
      <b>${esc(L(v, 'label', true))}</b>${L(v, 'sub', true) ? `<span>${esc(L(v, 'sub', true))}</span>` : ''}</button>`).join('');
    document.querySelectorAll('#tabs button').forEach(t => t.setAttribute('aria-selected', t.dataset.g === r._variant.group));
  };
  const drawStatus = () => {
    const r = cur();
    document.getElementById('badge').outerHTML = `<span id="badge">${badge(r.status)}</span>`;
    document.getElementById('phbanner').innerHTML = r.status === 'placeholder' ? `<div class="placeholder-banner">${esc(T('phBanner'))}</div>` : '';
  };

  drawVariants(); drawStatus(); drawAmount(); drawOut(); drawInfo();

  document.getElementById('tabs')?.addEventListener('click', e => {
    const t = e.target.closest('button[data-g]'); if (!t) return;
    const from = cur()._variant.group, to = t.dataset.g;
    if (from === to) return;
    c.byGroup[from] = { variant: c.variant, total: c.total };   // remember this tab
    const back = c.byGroup[to] || {};
    const first = variants.find(v => v.group === to);
    c.variant = (back.variant && variants.some(v => v.id === back.variant)) ? back.variant : first.id;
    const y = cur().yield || {};
    c.total = back.total ?? y.total ?? c.total;
    if (y.mode) c.mode = y.mode;
    save(); drawVariants(); drawStatus(); drawAmount(); drawOut(); drawInfo();
  });

  document.getElementById('variants')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    c.variant = b.dataset.v;
    // a style with its own piece size (e.g. pizza) sets pieces and weight
    const vy = (variants.find(x => x.id === c.variant) || {}).yield || {};
    if (vy.pieceWeight) { c.pieceWeight = vy.pieceWeight; if (vy.pieces) c.pieces = vy.pieces; drawAmount(); }
    else if (vy.total && vy.applyTotal && c.mode === 'total') { c.total = vy.total; drawAmount(); }
    document.querySelectorAll('#variants button').forEach(x => x.setAttribute('aria-pressed', x === b));
    save(); drawStatus(); drawOut(); drawInfo();
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

// full-screen photo viewer
function openPhoto(src, alt) {
  let d = document.getElementById('lightbox');
  if (!d) {
    d = document.createElement('dialog'); d.id = 'lightbox'; d.className = 'lightbox';
    d.innerHTML = '<img alt=""><button type="button" class="lb-close"></button>';
    d.addEventListener('click', () => d.close());
    document.body.appendChild(d);
  }
  d.querySelector('img').src = src; d.querySelector('img').alt = alt || '';
  d.querySelector('.lb-close').textContent = '✕'; d.querySelector('.lb-close').setAttribute('aria-label', T('close'));
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
}
view.addEventListener('click', e => {
  const b = e.target.closest('[data-img]'); if (!b) return;
  openPhoto(b.dataset.img, b.querySelector('img')?.alt);
});

function route() {
  const m = location.hash.match(/^#\/r\/(.+)$/);
  if (m) renderRecipe(decodeURIComponent(m[1])); else renderList();
}

/* ---------- start ---------- */

function netStatus() { document.getElementById('net').hidden = navigator.onLine; }

function applyLang() {
  document.documentElement.lang = LANG;
  document.getElementById('net').textContent = T('offline');
  document.querySelectorAll('#lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === LANG));
}
document.getElementById('lang').addEventListener('click', e => {
  const b = e.target.closest('button[data-lang]');
  if (!b || b.dataset.lang === LANG) return;
  LANG = b.dataset.lang;
  try { localStorage.setItem('crumb:lang', LANG); } catch (e) {}
  applyLang();
  if (state.recipes.length) {
    const y = scrollY; route(); scrollTo(0, y);
  }
});
applyLang();
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
    view.innerHTML = `<p class="pad">${esc(T('loadErr'))}</p>`;
  });
