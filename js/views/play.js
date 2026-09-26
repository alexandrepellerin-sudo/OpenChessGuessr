// Partie en cours : les coups sont joués, puis la question est posée.
import { TIERS, QUESTIONS_PER_GAME, createGame, answer, multiplierFor, poolLabel, difficultyLabel } from '../game.js';
import { createPlayer, stepFor } from '../player.js';
import { data } from '../data.js';
import * as store from '../store.js';
import { $, $$, fmt, pct, decimal, nameHtml, swatch } from '../ui.js';

const LETTERS = 'ABCD';
let game = null;
let player = null;
let phase = 'intro'; // intro → ask → answered
let nav = { home: () => {}, show: () => {} };

export function initPlay(navigation) {
  nav = navigation;
  player = createPlayer($('#board'), $('#moves'), { onState: syncReplayButtons });

  $('#choices').addEventListener('click', (e) => {
    const b = e.target.closest('.choice');
    if (b) onChoice(Number(b.dataset.i));
  });
  $('#skip').addEventListener('click', skipIntro);
  $('#board').addEventListener('click', () => phase === 'intro' && skipIntro());
  $('#r-first').addEventListener('click', () => player.goTo(0));
  $('#r-prev').addEventListener('click', () => player.step(-1));
  $('#r-next').addEventListener('click', () => player.step(1));
  $('#r-last').addEventListener('click', () => player.end());
  $('#r-play').addEventListener('click', () => (player.playing ? player.stop() : player.play()));
  $('#next').addEventListener('click', nextQuestion);
  $('#quit').addEventListener('click', () => {
    if (confirm('Abandonner la partie en cours ?')) {
      player.stop();
      nav.home();
    }
  });
  $('#again').addEventListener('click', () => startGame(game.poolId, game.difficultyId));
  $('#result-home').addEventListener('click', () => nav.home());
}

export function startGame(poolId, difficultyId) {
  game = createGame(data.openings, poolId, difficultyId);
  nav.show('game');
  renderQuestion();
}

export const stopPlay = () => player?.stop();

function renderPips() {
  $('#pips').innerHTML = game.questions
    .map((q, i) => {
      const state = q.picked === null ? (i === game.index ? 'current' : '') : q.points ? 'ok' : 'ko';
      return `<li class="${state}"></li>`;
    })
    .join('');
}

function renderQuestion() {
  const q = game.questions[game.index];
  const tier = TIERS[q.tier];
  phase = 'intro';

  $('#q-num').innerHTML = `Question <b>${game.index + 1}</b><span>/${QUESTIONS_PER_GAME}</span>`;
  $('#tier').innerHTML = `${swatch(q.tier)} ${tier.label} · ${tier.points}`;
  $('#score').textContent = fmt.format(game.score);
  renderPips();
  renderCombo();

  $('#choices').innerHTML = q.choices
    .map((o, i) => `<button class="choice" data-i="${i}" tabindex="-1"><span class="letter">${LETTERS[i]}</span><span class="choice-name">${nameHtml(o)}</span></button>`)
    .join('');
  $('#choices').className = 'choices pending';
  $('#feedback').hidden = true;
  $('#replay').hidden = true;
  $('#next-bar').hidden = true;
  $('#prompt').hidden = false;
  $('#prompt-text').textContent = 'Regarde les coups…';
  $('#skip').hidden = false;

  player.load(q.target, { ply: 0, hideFuture: true });
  setTimeout(() => {
    if (phase !== 'intro' || game.questions[game.index] !== q) return;
    player.play({ from: 0, step: stepFor(q.target.moves.length), onDone: ask });
  }, 350);
}

function skipIntro() {
  if (phase !== 'intro') return;
  player.end();
  ask();
}

function ask() {
  if (phase !== 'intro') return;
  phase = 'ask';
  const plies = game.questions[game.index].target.moves.length;
  $('#prompt-text').innerHTML = `Quelle est cette ouverture&nbsp;? <small>Trait aux ${plies % 2 ? 'Noirs' : 'Blancs'}</small>`;
  $('#skip').hidden = true;
  $('#choices').className = 'choices';
  $$('.choice').forEach((b) => b.removeAttribute('tabindex'));
}

function renderCombo() {
  const el = $('#combo');
  el.hidden = game.streak < 2;
  el.textContent = `Série ${game.streak} · x${decimal(multiplierFor(game.streak + 1))}`;
}

function onChoice(i) {
  if (phase === 'intro') return;
  const q = game.questions[game.index];
  if (phase === 'answered') return explain(i);

  phase = 'answered';
  const lostStreak = game.streak;
  const pts = answer(game, i);
  const good = pts > 0;
  store.recordAnswer(q.target.name, q.choices[i].name, good);

  $$('.choice').forEach((b, j) => {
    b.classList.toggle('correct', j === q.answer);
    b.classList.toggle('wrong', j === i && !good);
  });
  $('#choices').className = 'choices answered';
  $('#score').textContent = fmt.format(game.score);
  renderPips();
  renderCombo();

  const head = $('#fb-head');
  head.className = `fb-head ${good ? 'good' : 'bad'}`;
  head.innerHTML = good
    ? `<span>Bien vu</span><b>+${pts}${q.multiplier > 1 ? ` <small>x${decimal(q.multiplier)}</small>` : ''}</b>`
    : `<span>Raté</span><small>${lostStreak > 1 ? `série de ${lostStreak} perdue` : 'la bonne réponse'}</small>`;
  $('#next').textContent = game.index + 1 < QUESTIONS_PER_GAME ? 'Question suivante' : 'Voir le résultat';
  $('#prompt').hidden = true;
  $('#feedback').hidden = false;
  $('#replay').hidden = false;
  $('#next-bar').hidden = false;
  player.reveal();
  explain(q.answer, false);
}

/** Affiche la fiche d'une proposition ; après la réponse on peut comparer les lignes. */
function explain(i, reload = true) {
  const q = game.questions[game.index];
  const o = q.choices[i];
  $$('.choice').forEach((b, j) => b.classList.toggle('viewing', j === i));
  $('#fb-name').innerHTML = `${i === q.answer ? '' : `<span class="fb-tag">Proposition ${LETTERS[i]}</span>`}${nameHtml(o)}`;
  $('#fb-meta').textContent = `${o.eco} · n°${o.rank + 1} · ${pct.format(o.games / data.totalGames)} des parties`;
  if (reload) {
    player.load(o);
    player.play({ from: 0, step: stepFor(o.moves.length) });
  }
}

function syncReplayButtons() {
  if (!player) return;
  $('#r-play').textContent = player.playing ? '||' : '▶';
  $('#r-play').setAttribute('aria-label', player.playing ? 'Pause' : 'Rejouer les coups');
}

function nextQuestion() {
  player.stop();
  if (game.index + 1 < QUESTIONS_PER_GAME) {
    game.index += 1;
    window.scrollTo(0, 0);
    renderQuestion();
  } else {
    finishGame();
  }
}

function finishGame() {
  const { isRecord, previous } = store.recordGame(game);
  $('#r-config').textContent = `${poolLabel(game.poolId)} · ${difficultyLabel(game.difficultyId)}`;
  $('#r-score').textContent = fmt.format(game.score);
  $('#r-record').hidden = !isRecord;
  $('#r-record').textContent = previous ? `Nouveau record · ancien ${fmt.format(previous)}` : 'Premier record';
  $('#r-correct').textContent = `${game.correct}/${QUESTIONS_PER_GAME}`;
  $('#r-streak').textContent = game.bestStreak;
  $('#r-pips').innerHTML = game.questions.map((q) => `<li class="${q.points ? 'ok' : 'ko'}"></li>`).join('');
  $('#r-list').innerHTML = game.questions
    .map((q, i) => `<li class="${q.points ? 'ok' : 'ko'}">
        <span class="r-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="r-name">${nameHtml(q.target)}</span>
        <span class="r-pts">${q.points ? `+${q.points}` : '—'}</span>
      </li>`)
    .join('');
  nav.show('result');
}
