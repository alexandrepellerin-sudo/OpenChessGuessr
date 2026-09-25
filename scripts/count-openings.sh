#!/usr/bin/env bash
# Compte les tags [Opening "..."] sur les N premières parties d'un mois de la base Lichess.
# Usage : scripts/count-openings.sh [mois AAAA-MM] [nb parties]
set -euo pipefail
MONTH="${1:-2026-08}"
N="${2:-2000000}"
URL="https://database.lichess.org/standard/lichess_db_standard_rated_${MONTH}.pgn.zst"
OUT="$(dirname "$0")/raw/opening-counts.tsv"
curl -s "$URL" | zstd -dc 2>/dev/null | grep '^\[Opening ' | head -n "$N" \
  | sed -E 's/^\[Opening "(.*)"\]$/\1/' | sort | uniq -c | sort -rn \
  | awk '{c=$1; $1=""; sub(/^ /,""); print c "\t" $0}' > "$OUT" || true
echo "Écrit $(wc -l < "$OUT") ouvertures dans $OUT"
