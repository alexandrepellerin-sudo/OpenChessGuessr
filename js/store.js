// Records et historique, conservés sur l'appareil.
const KEY = 'openchessguessr.v1';
const empty = () => ({ best: {}, history: [], totals: { games: 0, questions: 0, correct: 0 }, pool: 'top50' });

export function load() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return empty();
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Stockage indisponible (navigation privée) : le jeu reste jouable sans records.
  }
}

export function setPool(pool) {
  const s = load();
  s.pool = pool;
  save(s);
}

/** Enregistre une partie terminée et indique s'il s'agit d'un nouveau record. */
export function recordGame(game) {
  const s = load();
  const previous = s.best[game.poolId] ?? 0;
  const isRecord = game.score > previous;
  if (isRecord) s.best[game.poolId] = game.score;
  s.history.unshift({
    date: new Date().toISOString(),
    pool: game.poolId,
    score: game.score,
    correct: game.correct,
    total: game.questions.length,
    bestStreak: game.bestStreak,
  });
  s.history = s.history.slice(0, 30);
  s.totals.games += 1;
  s.totals.questions += game.questions.length;
  s.totals.correct += game.correct;
  save(s);
  return { isRecord, previous };
}
