#!/usr/bin/env bash
# batch-generate-templates.sh
# Generates templates for all concepts in concepts.json by grade range.
# Run AFTER batch-generate-concepts.sh completes.
# Run from vidya/apps/api directory.

set -e
cd "$(dirname "$0")/.."

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | sed 's/[[:space:]]*=[[:space:]]*/=/' | xargs) 2>/dev/null || true
fi

echo "=== Generating templates for G3-5 (3 templates/concept) ==="
npx tsx scripts/generate-templates.ts --grade-range=3-5 --count=3

echo ""
echo "=== Generating templates for G6-7 (4 templates/concept) ==="
npx tsx scripts/generate-templates.ts --grade-range=6-7 --count=4

echo ""
echo "=== Generating templates for G8-9 (5 templates/concept) ==="
npx tsx scripts/generate-templates.ts --grade-range=8-9 --count=5

echo ""
echo "=== Running validation --fix pass ==="
npx tsx scripts/validate-template-correctness.ts --fix

echo ""
echo "=== Template generation complete ==="
python3 -c "
import json
data = json.load(open('prisma/seed-data/question-templates.json'))
print(f'Total templates: {len(data)}')
from collections import Counter
grades = Counter(t.get('gradeLevel', 0) for t in data)
subjects = Counter(t.get('subject', 'UNKNOWN') for t in data)
print('By grade:', dict(sorted(grades.items())))
print('By subject:', dict(sorted(subjects.items())))
"
