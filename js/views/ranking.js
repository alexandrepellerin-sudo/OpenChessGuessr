// Page « Classement » : meilleures parties et records par réglage (sur cet appareil).
import { POOLS, DIFFICULTIES, poolLabel, difficultyLabel } from '../game.js';
import * as store from '../store.js';
import { $, fmt, dateFmt, swatch } from '../ui.js';

const shortDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });

export function renderRanking() {
  const s = store.load();
  const { games, questions, correct } = s.totals;
  const bestStreak = Math.max(0, ...s.history.map((h) => h.bestStreak ?? 0));
  const seen = Object.keys(s.openings).length;

  $('#rank-stats').innerHTML = `
    <div><b>${fmt.format(games)}</b><span>parties</span></div>
    <div><b>${questions ? Math.round((100 * correct) / questions) : 0}<small>%</small></b><span>réussite</span></div>
    <div><b>${bestStreak}</b><span>meilleure série</span></div>
    <div><b>${fmt.format(seen)}</b><span>ouvertures vues</span></div>`;

  const top = [...s.history].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, 10);
  $('#rank-top').innerHTML = top.length
    ? top.map((h, i) => `<li>
        <span class="rank-n">${String(i + 1).padStart(2, '0')}</span>
        <span class="rank-body">
          <b>${fmt.format(h.score)}</b>
          <small>${poolLabel(h.pool)} · ${difficultyLabel(h.difficulty)} · ${h.correct}/${h.total} · ${dateFmt.format(new Date(h.date))}</small>
        </span>
        ${swatch(h.difficulty)}
      </li>`).join('')
    : '<li class="empty">Aucune partie terminée pour l’instant. Lance-toi depuis l’onglet Jouer.</li>';

  $('#rank-table').innerHTML = `
    <thead><tr><th></th>${DIFFICULTIES.map((d) => `<th title="${d.label}">${swatch(d.id)}<span>${d.short}</span></th>`).join('')}</tr></thead>
    <tbody>${POOLS.map((p) => `<tr>
      <th>${poolLabel(p.id)}</th>
      ${DIFFICULTIES.map((d) => {
        const v = s.best[store.configKey(p.id, d.id)];
        return `<td class="${v ? '' : 'none'}">${v ? fmt.format(v) : '·'}</td>`;
      }).join('')}
    </tr>`).join('')}</tbody>`;

  $('#rank-recent').innerHTML = s.history.length
    ? s.history.slice(0, 10).map((h) => `<li>
        <span>${shortDate.format(new Date(h.date))}</span>
        <span>${poolLabel(h.pool)} · ${difficultyLabel(h.difficulty)}</span>
        <span>${h.correct}/${h.total}</span>
        <b>${fmt.format(h.score)}</b>
      </li>`).join('')
    : '<li class="empty">—</li>';
}
