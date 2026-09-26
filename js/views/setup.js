// Page « Jouer » : choix du répertoire et de la difficulté.
import { POOLS, DIFFICULTIES } from '../game.js';
import { data } from '../data.js';
import * as store from '../store.js';
import { $, fmt, swatch } from '../ui.js';

let onStart = () => {};

export function initSetup({ start }) {
  onStart = start;
  $('#pool-picker').addEventListener('change', (e) => {
    store.setConfig({ pool: e.target.value });
    renderSetup();
  });
  $('#difficulty-picker').addEventListener('change', (e) => {
    store.setConfig({ difficulty: e.target.value });
    renderSetup();
  });
  $('#start').addEventListener('click', () => {
    const { config } = store.load();
    onStart(config.pool, config.difficulty);
  });
}

export function renderSetup() {
  const s = store.load();
  const { pool, difficulty } = s.config;

  $('#pool-picker').innerHTML = POOLS.map((p) => `
    <label class="seg">
      <input type="radio" name="pool" value="${p.id}" ${p.id === pool ? 'checked' : ''}>
      <span>${p.label}</span>
    </label>`).join('');
  const poolDef = POOLS.find((p) => p.id === pool) ?? POOLS[1];
  $('#pool-hint').textContent = poolDef.size === Infinity
    ? `${poolDef.hint.replace('Toutes les ouvertures', `Les ${fmt.format(data.openings.length)} ouvertures`)}`
    : poolDef.hint;

  $('#difficulty-picker').innerHTML = DIFFICULTIES.map((d) => `
    <label class="option">
      <input type="radio" name="difficulty" value="${d.id}" ${d.id === difficulty ? 'checked' : ''}>
      <span class="option-body">
        ${swatch(d.id)}
        <span class="option-text"><b>${d.label}</b><small>${d.hint}</small></span>
      </span>
    </label>`).join('');

  const best = s.best[store.configKey(pool, difficulty)];
  $('#config-record').innerHTML = best
    ? `Record pour ce réglage <b>${fmt.format(best)}</b>`
    : 'Pas encore de record pour ce réglage';
  $('#start').disabled = !data.openings.length;
}
