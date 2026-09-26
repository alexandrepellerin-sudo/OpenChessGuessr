// Lecteur de ligne : un échiquier + la liste des coups, avec lecture animée.
import { createBoard, positionsFor } from './board.js';
import { esc } from './ui.js';

const sanList = (pgn) => pgn.split(' ').filter((t) => !/^\d+\.$/.test(t));

/** Durée d'un demi-coup pour que la ligne entière se joue en ~3,5 s. */
export const stepFor = (plies) => Math.max(260, Math.min(600, 3500 / Math.max(plies, 1)));

export function createPlayer(boardEl, movesEl, { onState } = {}) {
  const render = createBoard(boardEl);
  const st = { positions: [], moves: [], ply: 0, timer: null, hideFuture: false, step: 500 };

  movesEl.addEventListener('click', (e) => {
    const b = e.target.closest('.mv');
    if (b && !st.hideFuture) {
      stop();
      goTo(Number(b.dataset.ply));
    }
  });

  function load(o, { ply = o.moves.length, hideFuture = false } = {}) {
    stop();
    st.moves = o.moves;
    st.positions = positionsFor(o.moves);
    st.hideFuture = hideFuture;
    movesEl.innerHTML = sanList(o.pgn)
      .map((san, k) => `${k % 2 === 0 ? `<span class="num" data-ply="${k + 1}">${k / 2 + 1}.</span>` : ''}<button class="mv" data-ply="${k + 1}">${esc(san)}</button>`)
      .join('');
    st.ply = -1;
    goTo(ply);
  }

  function goTo(ply, animate = false) {
    const target = Math.max(0, Math.min(ply, st.moves.length));
    const anim = animate && target === st.ply + 1 ? st.step * 0.8 : 0;
    st.ply = target;
    render(st.positions[target], st.moves[target - 1], anim);
    for (const el of movesEl.children) {
      const p = Number(el.dataset.ply);
      el.classList.toggle('current', el.classList.contains('mv') && p === target);
      el.classList.toggle('future', st.hideFuture && p > target);
    }
    onState?.();
  }

  /** Joue la ligne depuis `from` jusqu'au bout, puis appelle `onDone`. */
  function play({ from = st.ply >= st.moves.length ? 0 : st.ply, step = 600, onDone } = {}) {
    stop();
    st.step = step;
    goTo(from);
    st.timer = setInterval(() => {
      if (st.ply >= st.moves.length) {
        stop();
        onDone?.();
        return;
      }
      goTo(st.ply + 1, true);
    }, step);
    onState?.();
  }

  function stop() {
    if (!st.timer) return;
    clearInterval(st.timer);
    st.timer = null;
    onState?.();
  }

  return {
    load,
    goTo: (ply) => (stop(), goTo(ply)),
    step: (d) => (stop(), goTo(st.ply + d, d === 1)),
    end: () => (stop(), goTo(st.moves.length)),
    play,
    stop,
    reveal() {
      st.hideFuture = false;
      goTo(st.ply);
    },
    get playing() { return !!st.timer; },
    get ply() { return st.ply; },
    get length() { return st.moves.length; },
  };
}
