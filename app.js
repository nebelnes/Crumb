'use strict';

/* Crumb — книга рецептов и калькулятор теста.
   Рецепты лежат в recipes/*.json, их список — в recipes/index.json.
   Код приложения при добавлении рецепта не меняется. */

const view = document.getElementById('view');
const state = { recipes: [], byId: {}, q: '', cat: '' };

const STATUS = {
  verified: ['Проверено', 'ok'],
  draft: ['Черновик', 'draft'],
  placeholder: ['Заглушка — формулы нет', 'ph'],
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const num = (v, d = 0) => Number(v).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: 0 });
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
    } catch (e) { console.warn('Не удалось загрузить', f, e); return null; }
  }));
  state.recipes = list.filter(Boolean);
  state.byId = Object.fromEntries(state.recipes.map(r => [r.id, r]));
}

/* ---------- calculator ---------- */

function allIngredients(r) {
  return r.stages.flatMap(s => s.ingredients);
}

// Доля муки внутри ингредиента: мука = 1, закваска/опара = flourIn, остальное = 0
const flourShare = i => (i.flour ? 1 : (i.flourIn || 0));

function calc(r, c) {
  const ings = allIngredients(r);
  // ингредиенты с extra: true (соль, дрожжи «сверху») не входят в заданный вес
  const sumPct = ings.filter(i => !i.extra).reduce((a, i) => a + i.pct, 0);
  const flourPct = ings.filter(i => i.flour).reduce((a, i) => a + i.pct, 0);
  const target = c.mode === 'pieces' ? c.pieces * c.pieceWeight : c.total;
  const withLoss = target * (1 + (c.loss || 0) / 100);
  const base = sumPct > 0 ? withLoss / (sumPct / 100) : 0; // граммы на 100 %

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

function shoppingList(r, res, c) {
  const map = new Map();
  res.stages.forEach(s => s.rows.forEach(i => {
    const k = i.ru;
    map.set(k, (map.get(k) || 0) + i.g);
  }));
  const size = c.mode === 'pieces' ? `${c.pieces} × ${num(c.pieceWeight)} г` : `${num(c.total)} г`;
  const vlabel = r._variant ? ` (${r._variant.label})` : '';
  const lines = [`${r.name.ru}${vlabel} — ${size}${c.loss ? `, +${num(c.loss, 1)} % на потери` : ''}`];
  map.forEach((g, k) => lines.push(`• ${k}: ${grams(g)} г`));
  return lines.join('\n');
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

/* ---------- views ---------- */

function badge(status) {
  const [label, cls] = STATUS[status] || STATUS.draft;
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function sourceText(src) {
  if (!src) return '';
  const parts = [src.title];
  if (src.volume) parts.push(`т. ${src.volume}`);
  if (src.page) parts.push(`с. ${src.page}`);
  if (src.detail) parts.push(src.detail);
  const text = esc(parts.filter(Boolean).join(', '));
  return src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${text}</a>` : text;
}

function renderList() {
  document.title = 'Crumb';
  const cats = [...new Set(state.recipes.map(r => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  view.innerHTML = `
    <input class="search" id="q" type="search" placeholder="Поиск: название, тег…" value="${esc(state.q)}" autocomplete="off">
    <div class="chips" id="cats">
      <button class="chip" data-cat="" aria-pressed="${!state.cat}">Все</button>
      ${cats.map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c)}</button>`).join('')}
    </div>
    <div class="cards" id="cards"></div>
    <p class="count muted" id="count"></p>`;
  const draw = () => {
    const q = state.q.trim().toLowerCase();
    const items = state.recipes
      .filter(r => !state.cat || r.category === state.cat)
      .filter(r => !q || [r.name.ru, r.name.orig, r.category, ...(r.tags || [])].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.name.ru.localeCompare(b.name.ru, 'ru'));
    document.getElementById('cards').innerHTML = items.map(r => `
      <a class="rcard" href="#/r/${encodeURIComponent(r.id)}">
        <h2>${esc(r.name.ru)}</h2>
        ${r.name.orig && r.name.orig !== r.name.ru ? `<div class="orig">${esc(r.name.orig)}</div>` : ''}
        ${r.variants ? `<div class="orig">${esc(r.variantLabel || 'Варианты')}: ${r.variants.map(v => esc(v.label)).join(' · ')}</div>` : ''}
        <div class="meta">${badge(r.status)}${r.category ? `<span class="tag">${esc(r.category)}</span>` : ''}${(r.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      </a>`).join('') || '<p class="muted">Ничего не найдено.</p>';
    document.getElementById('count').textContent = `Рецептов: ${items.length} из ${state.recipes.length}`;
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
  if (!r0) { view.innerHTML = `<a class="back" href="#/">← Все рецепты</a><p>Рецепт не найден.</p>`; return; }
  document.title = r0.name.ru + ' — Crumb';
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

  // текущий рецепт = общие поля + выбранный вариант (пропорция)
  const cur = () => {
    if (!variants) return r0;
    const v = variants.find(x => x.id === c.variant) || variants[0];
    return { ...r0, ...v, id: r0.id, name: r0.name, yield: Object.assign({}, r0.yield, v.yield), _variant: v };
  };
  const save = () => store('calc:' + r0.id, c);

  view.innerHTML = `
    <a class="back" href="#/">← Все рецепты</a>
    <div class="rhead">
      <h1>${esc(r0.name.ru)}</h1>
      ${r0.name.orig && r0.name.orig !== r0.name.ru ? `<div class="orig">${esc(r0.name.orig)}</div>` : ''}
      <div class="meta">${badge(r0.status)}${r0.category ? `<span class="tag">${esc(r0.category)}</span>` : ''}${(r0.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      ${r0.source ? `<div class="source">Источник: ${sourceText(r0.source)}</div>` : ''}
      ${r0.status === 'placeholder' ? '<div class="placeholder-banner">Это заглушка: настоящей формулы из источника ещё нет. Цифры не использовать.</div>' : ''}
    </div>

    <div class="panel">
      ${variants ? `
        <div class="plabel">${esc(r0.variantLabel || 'Вариант')}</div>
        <div class="variants" id="variants" style="--n:${Math.min(variants.length, 4)}">
          ${variants.map(v => `<button data-v="${esc(v.id)}" aria-pressed="${v.id === c.variant}">
            <b>${esc(v.label)}</b>${v.sub ? `<span>${esc(v.sub)}</span>` : ''}</button>`).join('')}
        </div>` : ''}
      ${r0.yield?.mode === 'total' && !r0.yield?.allowPieces ? '' : `
        <div class="seg" id="mode">
          <button data-mode="pieces" aria-pressed="${c.mode === 'pieces'}">По штукам</button>
          <button data-mode="total" aria-pressed="${c.mode === 'total'}">По весу теста</button>
        </div>`}
      <div id="amount"></div>
      <div id="out"></div>
      <button class="btn" id="copy">Скопировать список покупок</button>
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
          <span class="amount-val"><input id="n-${key}" data-k="${key}" type="number" inputmode="decimal" min="0" step="any" value="${v}"> г</span>
        </div>
        <input class="slider" id="r-${key}" data-k="${key}" type="range" min="${sl.min}" max="${max}" step="${sl.step}" value="${v}"
          style="--p:${((v - sl.min) / (max - sl.min) * 100).toFixed(2)}%">
        <div class="range-ends"><span>${num(sl.min)} г</span><span>${num(max)} г</span></div>
        ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
      </div>`;
  };

  const drawAmount = () => {
    const y = cur().yield || {};
    const small = k => `<div class="field"><label for="f-${k}">${k === 'pieces' ? 'Штук' : 'Потери, %'}</label><input id="f-${k}" data-k="${k}" type="number" inputmode="decimal" min="0" step="${k === 'pieces' ? 1 : 'any'}" value="${c[k]}"></div>`;
    document.getElementById('amount').innerHTML = c.mode === 'pieces'
      ? slider('pieceWeight', 'Вес одной штуки') + `<div class="fields">${small('pieces')}${small('loss')}</div>`
      : slider('total', y.label || 'Вес теста', y.hint) + `<div class="fields">${small('loss')}</div>`;
  };

  const drawInfo = () => {
    const r = cur();
    document.getElementById('info').innerHTML = `
      ${r.method?.length ? `<div class="section"><h2>Как делать</h2><ol class="steps">${r.method.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
      ${r.notes ? `<div class="section"><h2>Заметки</h2><div class="notes">${esc(r.notes)}</div></div>` : ''}`;
  };

  const drawOut = () => {
    const r = cur();
    const res = calc(r, c);
    const cond = s => [s.time, s.temp].filter(Boolean).map(esc).join(' · ');
    const hasExtra = allIngredients(r).some(i => i.extra);
    document.getElementById('out').innerHTML = `
      ${!res.flourOk ? `<div class="warn">Мука в формуле даёт ${pct(res.flourPct)} %, а должна 100 %. Проверьте проценты.</div>` : ''}
      ${res.stages.map(s => `
        <div class="stage">
          <div class="stage-head"><h3>${esc(s.name)}</h3><span class="stage-cond">${cond(s)}</span></div>
          <table class="f">
            <thead><tr><th>Ингредиент</th><th class="n">%</th><th class="n">г</th></tr></thead>
            <tbody>
              ${s.rows.map(i => `<tr>
                <td class="ing">${esc(i.ru)}${i.flour ? '<span class="flag">мука</span>' : ''}${i.extra ? '<span class="flag">сверху</span>' : ''}${i.converted ? '<span class="flag">пересчитано</span>' : ''}
                  ${i.orig && i.orig !== i.ru ? `<small>${esc(i.orig)}</small>` : ''}${i.note ? `<small>${esc(i.note)}</small>` : ''}</td>
                <td class="n">${pct(i.pct)}</td>
                <td class="n g">${grams(i.g)}</td>
              </tr>`).join('')}
              ${res.stages.length > 1 ? `<tr class="sub"><td>Итого этап</td><td></td><td class="n">${grams(s.total)}</td></tr>` : ''}
            </tbody>
          </table>
          ${s.note ? `<p class="stage-cond">${esc(s.note)}</p>` : ''}
        </div>`).join('')}
      <div class="totals">
        <div class="tot"><div class="k">Всего${hasExtra ? ', с солью и дрожжами' : ''}</div><div class="v">${grams(res.dough)} г</div></div>
        <div class="tot"><div class="k">Мука в формуле (100 %)</div><div class="v">${grams(res.freshFlour)} г</div></div>
        <div class="tot"><div class="k">Мука всего, с заквасками</div><div class="v">${grams(res.allFlour)} г</div></div>
        <div class="tot"><div class="k">Гидратация эффективная</div><div class="v">${num(res.hydration, 1)} %</div></div>
      </div>
      <p class="muted" style="font-size:13px;margin:8px 0 0">Эффективная гидратация учитывает воду и муку внутри заквасок, молочных продуктов и яиц.</p>`;
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
    // слайдер и поле двигаются вместе
    const rng = document.getElementById('r-' + k), box = document.getElementById('n-' + k);
    if (rng && e.target !== rng) {
      if (v > Number(rng.max)) rng.max = v;
      rng.value = v;
    }
    if (box && e.target !== box) box.value = v;
    if (rng) rng.style.setProperty('--p', ((Number(rng.value) - rng.min) / (rng.max - rng.min) * 100).toFixed(2) + '%');
    save(); drawOut();
  });
  document.getElementById('copy').addEventListener('click', async () => {
    const r = cur();
    const ok = await copyText(shoppingList(r, calc(r, c), c));
    toast(ok ? 'Список скопирован' : 'Не удалось скопировать');
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
    view.innerHTML = '<p class="pad">Не удалось загрузить рецепты. Откройте приложение с интернетом хотя бы один раз.</p>';
  });
