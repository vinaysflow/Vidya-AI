#!/usr/bin/env bash
# batch-generate-concepts.sh
# Runs generate-elementary-seeds.ts for all grade x subject combinations.
# Run from vidya/apps/api directory.

set -e
cd "$(dirname "$0")/.."

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | sed 's/[[:space:]]*=[[:space:]]*/=/' | xargs) 2>/dev/null || true
fi

GRADES=(3 4 5 6 7 8 9)
SUBJECTS=(MATHEMATICS PHYSICS CHEMISTRY BIOLOGY CODING ENGLISH_LITERATURE ECONOMICS AI_LEARNING LOGIC)

DONE=0
TOTAL=$((${#GRADES[@]} * ${#SUBJECTS[@]}))

for GRADE in "${GRADES[@]}"; do
  for SUBJECT in "${SUBJECTS[@]}"; do
    DONE=$((DONE + 1))
    echo ""
    echo "=== [$DONE/$TOTAL] Grade $GRADE / $SUBJECT ==="
    npx tsx scripts/generate-elementary-seeds.ts --grade=$GRADE --subject=$SUBJECT
    sleep 2
  done
done

echo ""
echo "=== Batch generation complete ==="
python3 -c "
import json
data = json.load(open('prisma/seed-data/concepts.json'))
print(f'Total concepts: {len(data)}')
from collections import Counter
grades = Counter(c.get('gradeLevel', 3) for c in data)
subjects = Counter(c.get('subject', 'UNKNOWN') for c in data)
print('By grade:', dict(sorted(grades.items())))
print('By subject:', dict(sorted(subjects.items())))
"
