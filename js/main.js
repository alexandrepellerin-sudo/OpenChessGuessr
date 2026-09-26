// Point d'entrée : navigation entre les pages et démarrage.
import { loadData } from './data.js';
import { initSetup, renderSetup } from './views/setup.js';
import { initPlay, startGame, stopPlay } from './views/play.js';
import { renderRanking } from './views/ranking.js';
import { initCatalogue, renderCatalogue, closeSheet } from './views/catalogue.js';
import { $, $$ } from './ui.js';

const TABS = { jouer: renderSetup, classement: renderRanking, catalogue: renderCatalogue };

/** Affiche une vue ; `game` et `result` masquent la barre d'onglets. */
function show(view) {
  for (const v of $$('.view')) v.hidden = v.id !== `view-${view}`;
  document.body.classList.toggle('in-game', view === 'game' || view === 'result');
  $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === view));
  window.scrollTo(0, 0);
}

function route() {
  stopPlay();
  closeSheet();
  const tab = location.hash.replace('#/', '');
  const view = tab in TABS ? tab : 'jouer';
  TABS[view]();
  show(view);
}

function home() {
  if (location.hash === '#/jouer') route();
  else location.hash = '#/jouer';
}

async function init() {
  initSetup({ start: startGame });
  initPlay({ home, show });
  initCatalogue();
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSheet());

  try {
    await loadData();
  } catch {
    $('#load-error').hidden = false;
  }
  route();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js');
  }
}

init();
