// Échiquier minimal : position de départ, application de coups UCI et rendu DOM.
// Index 0 = a8, 63 = h1 (ligne par ligne depuis le haut, côté Blancs en bas).
const START = 'rnbqkbnrpppppppp' + ' '.repeat(32) + 'PPPPPPPPRNBQKBNR';
const FILES = 'abcdefgh';

const sq = (name) => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);

export function startBoard() {
  return [...START].map((c) => (c === ' ' ? null : c));
}

export function applyMove(board, uci) {
  const b = board.slice();
  const from = sq(uci.slice(0, 2));
  const to = sq(uci.slice(2, 4));
  const piece = b[from];
  const type = piece.toLowerCase();
  const white = piece === piece.toUpperCase();

  if (type === 'p' && from % 8 !== to % 8 && !b[to]) b[to + (white ? 8 : -8)] = null; // prise en passant
  if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
    const kingside = to % 8 === 6;
    const rookFrom = kingside ? from + 3 : from - 4;
    const rookTo = kingside ? from + 1 : from - 1;
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

  return function render(board, lastMove) {
    const hl = lastMove ? [sq(lastMove.slice(0, 2)), sq(lastMove.slice(2, 4))] : [];
    board.forEach((p, i) => {
      const { cell, img } = cells[i];
      cell.classList.toggle('last', hl.includes(i));
      if (p) {
        const src = `assets/pieces/${p === p.toUpperCase() ? 'w' : 'b'}${p.toUpperCase()}.svg`;
        if (img.getAttribute('src') !== src) img.src = src;
        img.hidden = false;
      } else {
        img.hidden = true;
        img.removeAttribute('src');
      }
    });
  };
}
