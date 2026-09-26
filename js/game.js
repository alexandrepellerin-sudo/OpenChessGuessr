// Logique de jeu : répertoires, difficulté, génération des questions et score.
export const POOLS = [
  { id: 'top25', label: '25', size: 25, hint: 'Les 25 ouvertures les plus jouées : les incontournables.' },
  { id: 'top50', label: '50', size: 50, hint: 'Les 50 ouvertures les plus jouées : les classiques.' },
  { id: 'top100', label: '100', size: 100, hint: 'Les 100 ouvertures les plus jouées : pour joueur régulier.' },
  { id: 'top250', label: '250', size: 250, hint: 'Les 250 ouvertures les plus jouées : niveau club.' },
  { id: 'top500', label: '500', size: 500, hint: 'Les 500 ouvertures les plus jouées : pour théoricien.' },
  { id: 'all', label: 'Toutes', size: Infinity, hint: 'Toutes les ouvertures répertoriées : l’encyclopédie.' },
];

export const TIERS = {
  easy: { label: 'Facile', points: 100 },
  medium: { label: 'Moyen', points: 200 },
  hard: { label: 'Difficile', points: 300 },
};

export const QUESTIONS_PER_GAME = 10;
const repeat = (tier) => Array(QUESTIONS_PER_GAME).fill(tier);

export const DIFFICULTIES = [
  { id: 'progressive', label: 'Progressive', short: 'Prog.', hint: '4 faciles, 3 moyennes, 3 difficiles.',
    plan: ['easy', 'easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'] },
  { id: 'easy', label: 'Facile', short: 'Fac.', hint: 'Lignes courtes et courantes, propositions très différentes.', plan: repeat('easy') },
  { id: 'medium', label: 'Moyenne', short: 'Moy.', hint: 'Une proposition piège de la même famille.', plan: repeat('medium') },
  { id: 'hard', label: 'Difficile', short: 'Diff.', hint: 'Lignes profondes et rares, variantes très proches.', plan: repeat('hard') },
];

export const poolLabel = (id) => {
  const p = POOLS.find((x) => x.id === id);
  return p ? (p.size === Infinity ? 'Toutes' : `Top ${p.label}`) : id.replace('top', 'Top ');
};
export const difficultyLabel = (id) => DIFFICULTIES.find((d) => d.id === id)?.label ?? 'Progressive';

export function prepareOpenings(data) {
  return data.openings.map((o, rank) => {
    const [family, variation = ''] = o.n.split(/:\s*/, 2);
    const moves = o.m.split(' ');
    return { name: o.n, family, variation, eco: o.e, pgn: o.p, line: o.m, moves, games: o.g, rank };
  });
}

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** `a` est une position par laquelle passe `b` : son nom serait aussi une réponse valable. */
const isAncestor = (a, b) => b.line.startsWith(a.line + ' ');

function commonPlies(a, b) {
  let i = 0;
  while (i < a.moves.length && i < b.moves.length && a.moves[i] === b.moves[i]) i++;
  return i;
}

function similarity(a, b) {
  let s = commonPlies(a, b) * 2;
  if (a.family === b.family) s += 6;
  if (a.eco === b.eco) s += 2;
  else if (a.eco[0] === b.eco[0]) s += 1;
  return s + Math.random() * 1.5;
}

/**
 * Difficulté d'une ouverture dans un répertoire : moins elle est jouée et plus
 * la position est profonde, plus elle est difficile. On découpe en tiers.
 */
function bucketsByTier(pool) {
  const last = Math.max(pool.length - 1, 1);
  const scored = pool
    .map((o, i) => ({ o, d: 0.6 * (i / last) + 0.4 * (Math.min(o.moves.length, 16) / 16) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.o);
  const t = Math.ceil(scored.length / 3);
  return { easy: scored.slice(0, t), medium: scored.slice(t, 2 * t), hard: scored.slice(2 * t) };
}

function pickDistractors(target, tier, pool, all) {
  const valid = (o, chosen) =>
    o.name !== target.name && !isAncestor(o, target) && !chosen.some((c) => c.name === o.name);
  const chosen = [];
  const take = (candidates, n) => {
    for (const o of candidates) {
      if (chosen.length >= n) break;
      if (valid(o, chosen)) chosen.push(o);
    }
  };

  // Réservoir élargi pour trouver des variantes proches même dans le Top 50.
  const wide = all.slice(0, Math.max(pool.length * 3, 300));
  const closest = (n) => {
    const ranked = wide
      .filter((o) => valid(o, chosen))
      .map((o) => ({ o, s: similarity(target, o) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 8);
    take(shuffle(ranked.map((x) => x.o)), n);
  };
  const otherFamilies = (n) => {
    const families = new Set([target.family, ...chosen.map((c) => c.family)]);
    const src = pool.length >= 20 ? pool : wide;
    for (const o of shuffle(src)) {
      if (chosen.length >= n) break;
      if (!families.has(o.family) && valid(o, chosen)) {
        chosen.push(o);
        families.add(o.family);
      }
    }
  };

  if (tier === 'easy') otherFamilies(3);
  else if (tier === 'medium') {
    closest(1);
    otherFamilies(3);
  } else closest(3);
  if (chosen.length < 3) take(shuffle(wide), 3); // filet de sécurité
  return chosen;
}

export function createGame(all, poolId, difficultyId) {
  const poolDef = POOLS.find((p) => p.id === poolId) ?? POOLS[1];
  const difficulty = DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[0];
  const pool = all.slice(0, poolDef.size);
  const buckets = bucketsByTier(pool);
  const used = new Set();

  // Si un tiers est épuisé (petit répertoire), on se rabat sur le tiers voisin.
  const fallback = { easy: ['medium', 'hard'], medium: ['easy', 'hard'], hard: ['medium', 'easy'] };
  const questions = difficulty.plan.map((tier) => {
    let candidates = [];
    for (const t of [tier, ...fallback[tier]]) {
      candidates = buckets[t].filter((o) => !used.has(o.name));
      if (candidates.length) break;
    }
    const target = pick(candidates);
    used.add(target.name);
    const choices = shuffle([target, ...pickDistractors(target, tier, pool, all)]);
    return { tier, target, choices, answer: choices.indexOf(target), picked: null, points: 0 };
  });

  return { poolId: poolDef.id, difficultyId: difficulty.id, questions, index: 0, score: 0, streak: 0, bestStreak: 0, correct: 0 };
}

export const multiplierFor = (streak) => 1 + 0.25 * (Math.min(Math.max(streak, 1), 5) - 1);

/** Enregistre la réponse et renvoie les points gagnés. */
export function answer(game, choiceIndex) {
  const q = game.questions[game.index];
  q.picked = choiceIndex;
  if (choiceIndex === q.answer) {
    game.streak += 1;
    game.correct += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    q.multiplier = multiplierFor(game.streak);
    q.points = Math.round(TIERS[q.tier].points * q.multiplier);
    game.score += q.points;
  } else {
    game.streak = 0;
  }
  return q.points;
}
