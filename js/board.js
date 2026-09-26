// Échiquier minimal : position de départ, application de coups UCI et rendu DOM animé.
// Index 0 = a8, 63 = h1 (ligne par ligne depuis le haut, côté Blancs en bas).
const START = 'rnbqkbnrpppppppp' + ' '.repeat(32) + 'PPPPPPPPRNBQKBNR';
const FILES = 'abcdefgh';

const sq = (name) => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);

export function startBoard() {
  return [...START].map((c) => (c === ' ' ? null : c));
}

const isCastling = (piece, from, to) => piece?.toLowerCase() === 'k' && Math.abs((from % 8) - (to % 8)) === 2;
const rookSquares = (from, to) => (to % 8 === 6 ? [from + 3, from + 1] : [from - 4, from - 1]);

export function applyMove(board, uci) {
  const b = board.slice();
  const from = sq(uci.slice(0, 2));
  const to = sq(uci.slice(2, 4));
  const piece = b[from];
  const white = piece === piece.toUpperCase();

  if (piece.toLowerCase() === 'p' && from % 8 !== to % 8 && !b[to]) b[to + (white ? 8 : -8)] = null; // prise en passant
  if (isCastling(piece, from, to)) {
    const [rookFrom, rookTo] = rookSquares(from, to);
    b[rookTo] = b[rookFrom];
    b[rookFrom] = null;
  }
  const promo = uci[4];
  b[to] = promo ? (white ? promo.toUpperCase() : promo) : piece;
  b[from] = null;
  return b;
}

/** Positions successives : positions[0] = départ, positions[k] = après k demi-coups. */
export function positionsFor(moves) {
  const positions = [startBoard()];
  for (const m of moves) positions.push(applyMove(positions.at(-1), m));
  return positions;
}

export function createBoard(container) {
  container.classList.add('board');
  const cells = [];
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement('div');
    const row = Math.floor(i / 8);
    const col = i % 8;
    cell.className = `sq ${(row + col) % 2 ? 'dark' : 'light'}`;
    if (col === 0) cell.insertAdjacentHTML('beforeend', `<span class="coord rank">${8 - row}</span>`);
    if (row === 7) cell.insertAdjacentHTML('beforeend', `<span class="coord file">${FILES[col]}</span>`);
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    cell.appendChild(img);
    container.appendChild(cell);
    cells.push({ cell, img });
  }

  /** Affiche `board`. Si `animMs` est fourni, fait glisser la pièce du dernier coup. */
  return function render(board, lastMove, animMs = 0) {
    const from = lastMove ? sq(lastMove.slice(0, 2)) : -1;
    const to = lastMove ? sq(lastMove.slice(2, 4)) : -1;
    board.forEach((p, i) => {
      const { cell, img } = cells[i];
      cell.classList.toggle('last', i === from || i === to);
      img.style.transition = '';
      img.style.transform = '';
      img.classList.remove('moving');
      if (p) {
        const src = `assets/pieces/${p === p.toUpperCase() ? 'w' : 'b'}${p.toUpperCase()}.svg`;
        if (img.getAttribute('src') !== src) img.src = src;
        img.hidden = false;
      } else {
        img.hidden = true;
        img.removeAttribute('src');
      }
    });
    if (!animMs || from < 0) return;

    const slides = [[from, to]];
    if (isCastling(board[to], from, to)) slides.push(rookSquares(from, to));
    for (const [f, t] of slides) {
      const img = cells[t].img;
      const dx = (f % 8) - (t % 8);
      const dy = Math.floor(f / 8) - Math.floor(t / 8);
      img.classList.add('moving');
      img.style.transform = `translate(${dx * 100}%, ${dy * 100}%)`;
      img.getBoundingClientRect(); // force le point de départ avant la transition
      img.style.transition = `transform ${animMs}ms cubic-bezier(.3, .7, .3, 1)`;
      img.style.transform = '';
    }
  };
}
