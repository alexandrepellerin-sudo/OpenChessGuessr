// Petits utilitaires d'affichage partagés par les vues.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const fmt = new Intl.NumberFormat('fr-FR');
export const pct = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 2 });
export const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
export const decimal = (n) => String(n).replace('.', ',');

export function nameHtml(o) {
  return `<span class="family">${esc(o.family)}</span>${o.variation ? `<span class="variation">${esc(o.variation)}</span>` : ''}`;
}

/** Motif associé à un niveau : pointillé (facile), hachuré (moyen), plein (difficile). */
export function swatch(level) {
  if (level === 'progressive') return `<span class="swatches">${swatch('easy')}${swatch('medium')}${swatch('hard')}</span>`;
  return `<span class="swatch swatch-${level}" aria-hidden="true"></span>`;
}

/** Barre réussites (plein) / erreurs (hachuré). */
export function scoreBar(ok, ko) {
  const n = ok + ko;
  if (!n) return '<span class="bar empty"></span>';
  return `<span class="bar"><span class="bar-ok" style="width:${(100 * ok) / n}%"></span><span class="bar-ko" style="width:${(100 * ko) / n}%"></span></span>`;
}

export const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
