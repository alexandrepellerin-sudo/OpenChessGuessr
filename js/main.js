import { createBoard, positionsFor } from './board.js';
import { POOLS, TIERS, QUESTIONS_PER_GAME, prepareOpenings, createGame, answer, multiplierFor } from './game.js';
import * as store from './store.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = new Intl.NumberFormat('fr-FR');
const pct = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 2 });

let openings = [];
let totalGames = 1;
let game = null;
let renderBoard = null;
let replay = { positions: [], moves: [], sans: [], ply: 0, timer: null };

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  window.scrollTo(0, 0);
}

function nameHtml(o) {
  return `<span class="family">${esc(o.family)}</span>${o.variation ? `<span class="variation">${esc(o.variation)}</span>` : ''}`;
}

/* ---------- Accueil ---------- */

function renderHome() {
  const s = store.load();
  $('#pools').innerHTML = POOLS.map((p) => {
    const count = Math.min(p.size, openings.length);
    const best = s.best[p.id];
    return `<label class="pool">
      <input type="radio" name="pool" value="${p.id}" ${s.pool === p.id ? 'checked' : ''}>
      <span class="pool-body">
        <span class="pool-label">${p.label}</span>
        <span class="pool-hint">${p.hint} · ${fmt.format(count)} ouvertures</span>
        <span class="pool-best${best ? ' has' : ''}">${best ? `Record ${fmt.format(best)}` : 'Pas encore joué'}</span>
      </span>
    </label>`;
  }).join('');

  const { games, questions, correct } = s.totals;
  $('#stats').innerHTML = games
    ? `<div><b>${games}</b><span>parties</span></div>
       <div><b>${Math.round((100 * correct) / questions)} %</b><span>de réussite</span></div>
       <div><b>${fmt.format(Math.max(...Object.values(s.best), 0))}</b><span>meilleur score</span></div>`
    : '';

  const poolLabel = (id) => POOLS.find((p) => p.id === id)?.label ?? id;
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  $('#history').innerHTML = s.history.length
    ? s.history.slice(0, 8).map((h) => `<li>
        <span class="h-date">${dateFmt.format(new Date(h.date))}</span>
        <span class="h-pool">${poolLabel(h.pool)}</span>
        <span class="h-correct">${h.correct}/${h.total}</span>
        <span class="h-score">${fmt.format(h.score)}</span>
      </li>`).join('')
    : '<li class="empty">Aucune partie pour l’instant.</li>';
  $('#history-block').hidden = !s.history.length;
  show('home');
}

/* ---------- Partie ---------- */

function startGame() {
  const pool = document.querySelector('input[name=pool]:checked')?.value ?? 'top50';
  store.setPool(pool);
  game = createGame(openings, pool);
  show('play');
  renderQuestion();
}

function renderQuestion() {
  stopReplay();
  const q = game.questions[game.index];
  const tier = TIERS[q.tier];
  const plies = q.target.moves.length;

  $('#q-num').textContent = `${game.index + 1}/${QUESTIONS_PER_GAME}`;
  $('#progress-bar').style.width = `${(100 * game.index) / QUESTIONS_PER_GAME}%`;
  $('#score').textContent = fmt.format(game.score);
  $('#tier').className = `tier tier-${q.tier}`;
  $('#tier').textContent = `${tier.label} · ${tier.points} pts`;
  renderCombo();
  $('#turn').textContent = `Trait aux ${plies % 2 ? 'Noirs' : 'Blancs'} · coup ${Math.floor(plies / 2) + 1}`;

  loadLine(q.target, plies);
  $('#choices').innerHTML = q.choices
    .map((o, i) => `<button class="choice" data-i="${i}">${nameHtml(o)}</button>`)
    .join('');
  $('#choices').classList.remove('answered');
  $('#turn').hidden = false;
  $('#feedback').hidden = true;
  $('#next-bar').hidden = true;
}

function renderCombo() {
  const el = $('#combo');
  el.hidden = game.streak < 1;
  el.textContent = `🔥 ${game.streak} · prochain x${multiplierFor(game.streak + 1).toString().replace('.', ',')}`;
}

function onChoice(i) {
  const q = game.questions[game.index];
  if (q.picked === null) {
    const lostStreak = game.streak;
    const pts = answer(game, i);
    const good = pts > 0;
    const buttons = [...document.querySelectorAll('.choice')];
    buttons.forEach((b, j) => {
      b.classList.toggle('correct', j === q.answer);
      b.classList.toggle('wrong', j === i && !good);
    });
    $('#choices').classList.add('answered');
    $('#score').textContent = fmt.format(game.score);
    $('#progress-bar').style.width = `${(100 * (game.index + 1)) / QUESTIONS_PER_GAME}%`;
    renderCombo();

    const head = $('#fb-head');
    head.className = `fb-head ${good ? 'good' : 'bad'}`;
    head.innerHTML = good
      ? `✓ Bien vu ! <b>+${pts}</b>${q.multiplier > 1 ? ` <small>(x${String(q.multiplier).replace('.', ',')})</small>` : ''}`
      : `✗ Raté${lostStreak > 1 ? ` · série de ${lostStreak} perdue` : ''}`;
    $('#next').textContent = game.index + 1 < QUESTIONS_PER_GAME ? 'Question suivante' : 'Voir le résultat';
    $('#turn').hidden = true;
    $('#feedback').hidden = false;
    $('#next-bar').hidden = false;
    explain(q.answer);
    return;
  }
  // Après la réponse : toucher une proposition affiche sa ligne pour comparer.
  explain(i);
}

function explain(i) {
  const q = game.questions[game.index];
  const o = q.choices[i];
  document.querySelectorAll('.choice').forEach((b, j) => b.classList.toggle('viewing', j === i));
  $('#fb-name').innerHTML = `${i === q.answer ? '' : '<span class="fb-tag">Autre proposition</span>'}${nameHtml(o)}`;
  $('#fb-meta').textContent =
    `ECO ${o.eco} · n°${o.rank + 1} en popularité · ${pct.format(o.games / totalGames)} des parties Lichess`;
  loadLine(o, o.moves.length);
  renderMoves();
}

/* ---------- Relecture des coups ---------- */

function loadLine(o, ply) {
  stopReplay();
  replay.moves = o.moves;
  replay.sans = o.pgn.split(' ').filter((t) => !/^\d+\.$/.test(t));
  replay.positions = positionsFor(o.moves);
  goTo(ply);
}

function goTo(ply) {
  replay.ply = Math.max(0, Math.min(ply, replay.moves.length));
  renderBoard(replay.positions[replay.ply], replay.moves[replay.ply - 1]);
  document.querySelectorAll('#moves .mv').forEach((b) => b.classList.toggle('current', Number(b.dataset.ply) === replay.ply));
}

function renderMoves() {
  $('#moves').innerHTML = replay.sans
    .map((san, k) => `${k % 2 === 0 ? `<span class="num">${k / 2 + 1}.</span>` : ''}<button class="mv" data-ply="${k + 1}">${esc(san)}</button>`)
    .join('');
  goTo(replay.ply);
}

function stopReplay() {
  clearInterval(replay.timer);
  replay.timer = null;
  $('#r-play').textContent = '▶';
}

function togglePlay() {
  if (replay.timer) return stopReplay();
  if (replay.ply >= replay.moves.length) goTo(0);
  $('#r-play').textContent = '⏸';
  replay.timer = setInterval(() => {
    if (replay.ply >= replay.moves.length) return stopReplay();
    goTo(replay.ply + 1);
  }, 650);
}

/* ---------- Fin de partie ---------- */

function nextQuestion() {
  if (game.index + 1 < QUESTIONS_PER_GAME) {
    game.index += 1;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    finishGame();
  }
}

function finishGame() {
  stopReplay();
  const { isRecord, previous } = store.recordGame(game);
  const pool = POOLS.find((p) => p.id === game.poolId);
  $('#r-score').textContent = fmt.format(game.score);
  $('#r-pool').textContent = pool.label;
  $('#r-record').hidden = !isRecord;
  $('#r-record').textContent = previous ? `Nouveau record ! (ancien : ${fmt.format(previous)})` : 'Premier record !';
  $('#r-correct').textContent = `${game.correct}/${QUESTIONS_PER_GAME}`;
  $('#r-streak').textContent = game.bestStreak;
  $('#r-list').innerHTML = game.questions
    .map((q) => `<li class="${q.points ? 'ok' : 'ko'}">
        <span class="r-mark">${q.points ? '✓' : '✗'}</span>
        <span class="r-name">${nameHtml(q.target)}</span>
        <span class="r-pts">${q.points ? `+${q.points}` : TIERS[q.tier].label}</span>
      </li>`)
    .join('');
  show('result');
}

/* ---------- Démarrage ---------- */

async function init() {
  renderBoard = createBoard($('#board'));
  $('#start').addEventListener('click', startGame);
  $('#choices').addEventListener('click', (e) => {
    const b = e.target.closest('.choice');
    if (b) onChoice(Number(b.dataset.i));
  });
  $('#moves').addEventListener('click', (e) => {
    const b = e.target.closest('.mv');
    if (b) {
      stopReplay();
      goTo(Number(b.dataset.ply));
    }
  });
  $('#r-first').addEventListener('click', () => (stopReplay(), goTo(0)));
  $('#r-prev').addEventListener('click', () => (stopReplay(), goTo(replay.ply - 1)));
  $('#r-next').addEventListener('click', () => (stopReplay(), goTo(replay.ply + 1)));
  $('#r-last').addEventListener('click', () => (stopReplay(), goTo(replay.moves.length)));
  $('#r-play').addEventListener('click', togglePlay);
  $('#next').addEventListener('click', nextQuestion);
  $('#quit').addEventListener('click', () => {
    if (confirm('Abandonner la partie en cours ?')) {
      stopReplay();
      renderHome();
    }
  });
  $('#again').addEventListener('click', startGame);
  $('#home-btn').addEventListener('click', renderHome);

  try {
    const data = await fetch('data/openings.json').then((r) => r.json());
    openings = prepareOpenings(data);
    totalGames = data.totalGames;
    $('#start').disabled = false;
    renderHome();
  } catch {
    $('#pools').innerHTML = '<p class="error">Impossible de charger les ouvertures. Vérifie ta connexion puis recharge la page.</p>';
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js');
  }
}

init();
