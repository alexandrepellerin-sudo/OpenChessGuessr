// Page « Catalogue » : toutes les ouvertures, groupées par famille, avec tes réussites et erreurs.
import { data } from '../data.js';
import { createPlayer, stepFor } from '../player.js';
import * as store from '../store.js';
import { $, $$, esc, fmt, pct, nameHtml, scoreBar, normalize } from '../ui.js';

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'seen', label: 'Vues' },
  { id: 'review', label: 'À revoir' },
  { id: 'unseen', label: 'Jamais vues' },
];

let filter = 'all';
let query = '';
let stats = {};
const open = new Set();
const closed = new Set();
let sheetPlayer = null;

const statOf = (o) => stats[o.name] ?? { ok: 0, ko: 0 };
const needsReview = (st) => st.ko > 0 && (st.lastOk === false || st.ko >= st.ok);

function matches(o) {
  const st = statOf(o);
  if (filter === 'seen' && !(st.ok + st.ko)) return false;
  if (filter === 'review' && !needsReview(st)) return false;
  if (filter === 'unseen' && st.ok + st.ko) return false;
  if (query && !normalize(`${o.name} ${o.eco}`).includes(query)) return false;
  return true;
}

export function initCatalogue() {
  $('#cat-filters').innerHTML = FILTERS.map((f) => `<button class="chip" data-f="${f.id}">${f.label}</button>`).join('');
  $('#cat-filters').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    filter = b.dataset.f;
    renderCatalogue();
  });
  let t;
  $('#cat-search').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      query = normalize(e.target.value.trim());
      renderCatalogue();
    }, 120);
  });
  $('#cat-list').addEventListener('click', (e) => {
    const item = e.target.closest('.cat-item');
    if (item) return openSheet(item.dataset.name);
    const head = e.target.closest('.fam-head');
    if (head) {
      const name = head.dataset.family;
      const wasOpen = head.getAttribute('aria-expanded') === 'true';
      (wasOpen ? open : closed).delete(name);
      (wasOpen ? closed : open).add(name);
      renderCatalogue();
    }
  });

  sheetPlayer = createPlayer($('#sheet-board'), $('#sheet-moves'), {
    onState: () => ($('#s-play').textContent = sheetPlayer?.playing ? '||' : '▶'),
  });
  $('#s-first').addEventListener('click', () => sheetPlayer.goTo(0));
  $('#s-prev').addEventListener('click', () => sheetPlayer.step(-1));
  $('#s-next').addEventListener('click', () => sheetPlayer.step(1));
  $('#s-last').addEventListener('click', () => sheetPlayer.end());
  $('#s-play').addEventListener('click', () => (sheetPlayer.playing ? sheetPlayer.stop() : sheetPlayer.play()));
  $('#sheet').addEventListener('click', (e) => {
    if (e.target.id === 'sheet' || e.target.closest('#sheet-close')) closeSheet();
  });
}

export function renderCatalogue() {
  stats = store.load().openings;
  $$('#cat-filters .chip').forEach((b) => b.classList.toggle('active', b.dataset.f === filter));

  let total = 0;
  let seen = 0;
  let review = 0;
  for (const o of data.openings) {
    const st = statOf(o);
    total += 1;
    if (st.ok + st.ko) seen += 1;
    if (needsReview(st)) review += 1;
  }
  $('#cat-summary').innerHTML = `<b>${fmt.format(total)}</b> ouvertures · <b>${fmt.format(seen)}</b> vues · <b>${fmt.format(review)}</b> à revoir`;

  const filtering = query || filter !== 'all';
  const html = [];
  for (const f of data.families) {
    const items = f.items.filter(matches);
    if (!items.length) continue;
    let ok = 0;
    let ko = 0;
    let seenIn = 0;
    for (const o of f.items) {
      const st = statOf(o);
      ok += st.ok;
      ko += st.ko;
      if (st.ok + st.ko) seenIn += 1;
    }
    const expanded = open.has(f.name) || (!closed.has(f.name) && !!query && items.length <= 30);
    html.push(`<section class="fam ${expanded ? 'open' : ''}">
      <button class="fam-head" data-family="${esc(f.name)}" aria-expanded="${expanded}">
        <span class="fam-title">${esc(f.name)}</span>
        <span class="fam-meta">${filtering ? `${items.length}/` : ''}${f.items.length} ${f.items.length > 1 ? 'lignes' : 'ligne'} · ${seenIn} vue${seenIn > 1 ? 's' : ''}</span>
        <span class="fam-score">${ok + ko ? `<span class="n-ok">${ok}</span><span class="n-ko">${ko}</span>` : ''}${scoreBar(ok, ko)}</span>
        <span class="chev" aria-hidden="true"></span>
      </button>
      ${expanded ? `<ul class="cat-items">${items.map(itemHtml).join('')}</ul>` : ''}
    </section>`);
  }
  $('#cat-list').innerHTML = html.join('') || '<p class="empty">Aucune ouverture ne correspond.</p>';
}

function itemHtml(o) {
  const st = statOf(o);
  const n = st.ok + st.ko;
  return `<li><button class="cat-item ${needsReview(st) ? 'review' : ''}" data-name="${esc(o.name)}">
    <span class="cat-name">${o.variation ? esc(o.variation) : '<i>Ligne principale</i>'}</span>
    <span class="cat-meta">${o.eco} · n°${o.rank + 1} · ${o.moves.length} dc</span>
    <span class="cat-score">${n ? `<span class="n-ok">${st.ok}</span><span class="n-ko">${st.ko}</span>` : '<span class="n-none">—</span>'}</span>
  </button></li>`;
}

function openSheet(name) {
  const o = data.byName.get(name);
  if (!o) return;
  const st = statOf(o);
  $('#sheet-name').innerHTML = nameHtml(o);
  $('#sheet-meta').textContent = `${o.eco} · n°${o.rank + 1} en popularité · ${pct.format(o.games / data.totalGames)} des parties Lichess`;
  const conf = Object.entries(st.conf ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  $('#sheet-stats').innerHTML = `
    <div class="sheet-counts">
      <div><b>${st.ok}</b><span>réussite${st.ok > 1 ? 's' : ''}</span></div>
      <div class="ko"><b>${st.ko}</b><span>erreur${st.ko > 1 ? 's' : ''}</span></div>
    </div>
    ${scoreBar(st.ok, st.ko)}
    ${conf.length ? `<p class="conf">Confondue avec ${conf.map(([n, c]) => `<b>${esc(n)}</b>${c > 1 ? ` (${c})` : ''}`).join(', ')}</p>` : ''}`;
  $('#sheet').hidden = false;
  document.body.classList.add('sheet-open');
  sheetPlayer.load(o, { ply: 0 });
  setTimeout(() => !$('#sheet').hidden && sheetPlayer.play({ from: 0, step: stepFor(o.moves.length) }), 250);
}

export function closeSheet() {
  sheetPlayer?.stop();
  $('#sheet').hidden = true;
  document.body.classList.remove('sheet-open');
}
