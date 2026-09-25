// Construit data/openings.json à partir de :
//  - scripts/raw/{a..e}.tsv : liste des ouvertures Lichess (github.com/lichess-org/chess-openings, CC0)
//  - scripts/raw/opening-counts.tsv : nombre de parties par ouverture (voir count-openings.sh)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = (f) => readFileSync(join(root, 'scripts/raw', f), 'utf8');

const counts = new Map();
let totalGames = 0;
for (const line of raw('opening-counts.tsv').split('\n')) {
  if (!line) continue;
  const [c, name] = line.split('\t');
  counts.set(name, Number(c));
  totalGames += Number(c);
}

const byName = new Map();
for (const f of ['a', 'b', 'c', 'd', 'e']) {
  for (const line of raw(`${f}.tsv`).split('\n').slice(1)) {
    if (!line) continue;
    const [eco, name, pgn] = line.split('\t');
    const chess = new Chess();
    chess.loadPgn(pgn);
    const uci = chess.history({ verbose: true }).map((m) => m.lan);
    const prev = byName.get(name);
    // Un même nom peut couvrir plusieurs lignes : on garde la plus courte, la plus canonique.
    if (!prev || uci.length < prev.uci.length) byName.set(name, { eco, name, pgn, uci });
  }
}

const openings = [...byName.values()]
  .map((o) => ({ ...o, games: counts.get(o.name) ?? 0 }))
  .filter((o) => o.games > 0 && o.uci.length > 0)
  .sort((a, b) => b.games - a.games || a.uci.length - b.uci.length);

const unmatched = [...counts.keys()].filter((n) => !byName.has(n));
console.log(`${byName.size} ouvertures Lichess, ${openings.length} jouées dans l'échantillon (${totalGames} parties).`);
if (unmatched.length) console.log(`${unmatched.length} noms de la base non reconnus, ex. : ${unmatched.slice(0, 5).join(' | ')}`);

const out = {
  source: 'Lichess (chess-openings + base de parties publique)',
  totalGames,
  openings: openings.map((o) => ({ n: o.name, e: o.eco, p: o.pgn, m: o.uci.join(' '), g: o.games })),
};
mkdirSync(join(root, 'data'), { recursive: true });
writeFileSync(join(root, 'data/openings.json'), JSON.stringify(out));
console.log('Top 10 :', openings.slice(0, 10).map((o) => `${o.name} (${o.games})`).join('\n  '));
