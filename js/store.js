// Records, historique et statistiques par ouverture, conservés sur l'appareil.
const KEY = 'openchessguessr.v1';

const empty = () => ({
  best: {}, // { "top50|progressive": score }
  history: [],
  totals: { games: 0, questions: 0, correct: 0 },
  config: { pool: 'top50', difficulty: 'progressive' },
  openings: {}, // { [nom]: { ok, ko, last, lastOk, conf: { [nom confondu]: n } } }
});

export const configKey = (pool, difficulty) => `${pool}|${difficulty}`;

export function load() {
  let s;
  try {
    s = { ...empty(), ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return empty();
  }
  // Migration depuis la première version (répertoire seul, sans difficulté).
  if (s.pool) {
    s.config = { ...s.config, pool: s.pool };
    delete s.pool;
  }
  for (const k of Object.keys(s.best)) {
    if (!k.includes('|')) {
      s.best[configKey(k, 'progressive')] = Math.max(s.best[k], s.best[configKey(k, 'progressive')] ?? 0);
      delete s.best[k];
    }
  }
  for (const h of s.history) h.difficulty ??= 'progressive';
  return s;
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Stockage indisponible (navigation privée) : le jeu reste jouable sans records.
  }
}

export function setConfig(config) {
  const s = load();
  s.config = { ...s.config, ...config };
  save(s);
}

/** Enregistre la réponse donnée pour une ouverture, dès la réponse (même si la partie est abandonnée). */
export function recordAnswer(targetName, pickedName, ok) {
  const s = load();
  const o = (s.openings[targetName] ??= { ok: 0, ko: 0 });
  o.last = Date.now();
  o.lastOk = ok;
  if (ok) o.ok += 1;
  else {
    o.ko += 1;
    o.conf ??= {};
    o.conf[pickedName] = (o.conf[pickedName] ?? 0) + 1;
  }
  save(s);
}

/** Enregistre une partie terminée et indique s'il s'agit d'un nouveau record. */
export function recordGame(game) {
  const s = load();
  const key = configKey(game.poolId, game.difficultyId);
  const previous = s.best[key] ?? 0;
  const isRecord = game.score > previous;
  if (isRecord) s.best[key] = game.score;
  s.history.unshift({
    date: new Date().toISOString(),
    pool: game.poolId,
    difficulty: game.difficultyId,
    score: game.score,
    correct: game.correct,
    total: game.questions.length,
    bestStreak: game.bestStreak,
  });
  s.history = s.history.slice(0, 100);
  s.totals.games += 1;
  s.totals.questions += game.questions.length;
  s.totals.correct += game.correct;
  save(s);
  return { isRecord, previous };
}
