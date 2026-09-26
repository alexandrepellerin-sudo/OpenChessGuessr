// Chargement unique des ouvertures, partagé par toutes les vues.
import { prepareOpenings } from './game.js';

export const data = { openings: [], byName: new Map(), families: [], totalGames: 1 };

export async function loadData() {
  const raw = await fetch('data/openings.json').then((r) => r.json());
  data.openings = prepareOpenings(raw);
  data.totalGames = raw.totalGames;
  data.byName = new Map(data.openings.map((o) => [o.name, o]));

  // Familles triées par popularité cumulée, variantes par popularité.
  const fam = new Map();
  for (const o of data.openings) {
    const f = fam.get(o.family) ?? { name: o.family, games: 0, items: [] };
    f.games += o.games;
    f.items.push(o);
    fam.set(o.family, f);
  }
  data.families = [...fam.values()].sort((a, b) => b.games - a.games);
}
