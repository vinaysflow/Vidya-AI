/**
 * Elementary overlay for Socratic system prompt.
 * Grade-aware, mastery-aware, adaptive difficulty-aware.
 * Used when metadata.grade <= 5.
 *
 * effectiveGrade controls vocabulary, number complexity, and problem difficulty.
 * It may be higher than the enrolled grade for accelerated students.
 */

export interface MasteryContext {
  masteredConcepts: Array<{ name: string; mastery: number }>;
  gapConcepts: Array<{ name: string; mastery: number }>;
}

interface GradeProfile {
  ageLabel: string;
  vocabulary: string;
  numberRange: string;
  problemComplexity: string;
  referenceFrames: string;
  questionStyle: string;
}

const GRADE_PROFILES: Record<number, GradeProfile> = {
  3: {
    ageLabel: '8-year-old',
    vocabulary: 'Use words like: groups, stacks, bigger, smaller, more, less, total, share equally. Avoid any algebra terms.',
    numberRange: 'Use whole numbers 1-100. Single-digit multipliers. NEVER use numbers above 100. NEVER use fractions or decimals. NEVER use negative numbers.',
    problemComplexity: '1-step problems only. One operation at a time.',
    referenceFrames: 'Minecraft blocks, LEGO pieces, playground games, animals, pizza slices, coins.',
    questionStyle: 'Very short question. One sentence context + one question.',
  },
  4: {
    ageLabel: '9-year-old performing above grade level',
    vocabulary: 'Use words like: multiply, divide, equal, equation, factor, pattern, equivalent. Avoid variables like x.',
    numberRange: 'Numbers up to 1,000. 2-digit multipliers. Simple fractions (halves, thirds, quarters). NEVER use numbers above 1,000. NEVER use decimals beyond tenths.',
    problemComplexity: '1-2 step problems. Introduce formulas as "rules" (cost = price × amount).',
    referenceFrames: 'Minecraft crafting, cooking recipes, LEGO building, distance and travel, shopping.',
    questionStyle: 'Short problem (2 sentences max). Include a concrete scenario.',
  },
  5: {
    ageLabel: '10-year-old performing at advanced level',
    vocabulary: 'Use words like: fraction, decimal, factor, product, variable, formula, area, volume. Equations are OK.',
    numberRange: 'Decimals, basic fractions (add/subtract/multiply). Numbers up to 10,000. NEVER use algebraic variables like x or y.',
    problemComplexity: '2-step problems. Multi-part scenarios with formulas.',
    referenceFrames: 'Science experiments, cooking with fractions, maps with scales, speed and distance, sports stats.',
    questionStyle: '2-3 sentence problem. Set up a real-world scenario that needs 2 steps.',
  },
  6: {
    ageLabel: '11-year-old performing significantly above grade level',
    vocabulary: 'Use words like: expression, variable, ratio, proportion, percentage, integer, coordinate. Algebra notation OK.',
    numberRange: 'Positive and negative integers, decimals, fractions. Percentages. One algebraic variable allowed. NEVER use two-variable expressions.',
    problemComplexity: 'Multi-step problems with 2-3 operations. Include unit conversions or ratio setups.',
    referenceFrames: 'Science lab experiments, detective investigations, sports analytics, money and business, map coordinates.',
    questionStyle: '2-3 sentence problem. Challenge the student to set up the problem before solving.',
  },
  7: {
    ageLabel: '12-year-old performing at gifted level',
    vocabulary: 'Use words like: equation, slope, probability, function, proportion, factor, exponent. Full algebra OK.',
    numberRange: 'Rational numbers, algebraic expressions, basic geometry formulas. Two variables allowed.',
    problemComplexity: 'Multi-step with algebraic reasoning. "Explain your setup" prompts.',
    referenceFrames: 'Brain teasers, engineering challenges, logic puzzles, scientific investigations, game design math.',
    questionStyle: '3-4 sentence problem. Present a scenario that requires generalizing to a formula.',
  },
  8: {
    ageLabel: '13-year-old performing at advanced 8th grade level',
    vocabulary: 'Use words like: linear equation, system of equations, Pythagorean theorem, scientific notation, exponent rules, irrational number, function notation. Full algebra and introductory geometry OK.',
    numberRange: 'Real numbers including irrationals, algebraic expressions with two or more variables, geometric measurements. Scientific notation OK.',
    problemComplexity: 'Multi-step algebraic and geometric reasoning. Systems of equations, Pythagorean theorem applications, slope-intercept form, transformations.',
    referenceFrames: 'Engineering and architecture, video game physics, data science, cryptography, sports analytics, robotics challenges.',
    questionStyle: '3-4 sentence problem. Set up a multi-step scenario requiring algebraic manipulation or geometric reasoning.',
  },
  9: {
    ageLabel: '14-year-old performing at high school freshman level',
    vocabulary: 'Use full Algebra I and Geometry vocabulary: quadratic, polynomial, factoring, proof, congruence, similarity, trigonometric ratios, domain, range, transformation. Formal mathematical language expected.',
    numberRange: 'Full real number system, quadratic expressions, geometric proofs, basic trigonometry. Complex fractions and radical expressions OK.',
    problemComplexity: 'Proof-based geometric reasoning, quadratic equation solving (factoring, quadratic formula), function analysis, multi-step algebraic modeling.',
    referenceFrames: 'Physics problems, computer science algorithms, financial modeling, architecture and design, logical deduction puzzles, real-world optimization.',
    questionStyle: '4-5 sentence problem. Present a situation requiring formal setup, algebraic or geometric reasoning, and interpretation of the solution.',
  },
};

function getGradeProfile(grade: number): GradeProfile {
  // Clamp to available profiles
  const clamped = Math.max(3, Math.min(9, Math.round(grade)));
  return GRADE_PROFILES[clamped] ?? GRADE_PROFILES[3];
}

export function buildElementaryOverlay(
  grade: number,
  effectiveGrade: number,
  masteryContext?: MasteryContext,
  fewShotExamples?: string[],
  rsmTrack?: string | boolean
): string {
  const profile = getGradeProfile(effectiveGrade);
  const isAccelerated = effectiveGrade > grade;

  let overlay = `
## ELEMENTARY MODE (Enrolled: Grade ${grade}, Challenge Level: Grade ${effectiveGrade})
You are talking to a ${profile.ageLabel}. You are an NPC guide in their learning adventure, not a teacher. Follow these rules STRICTLY:

### LANGUAGE AND CONTENT
- ${profile.vocabulary}
- ${profile.numberRange}
- ${profile.problemComplexity}
- Reference frames: ${profile.referenceFrames}

### FORMAT RULES
- MAX 1-2 short sentences + 1 question. Think NPC speech bubble, not a paragraph.
- NEVER write more than 2 sentences total before asking a question.
- Celebrate correct answers with one enthusiastic word ("Yes!", "Boom!", "Nailed it!")
- NEVER give the answer. NEVER write more than 2 sentences + question.
- For math expressions use \\(x^2\\) not $x^2$. Currency is always plain text: "costs $20" or "20 dollars" — never wrap currency in math delimiters.

### QUESTION VARIETY
- NEVER repeat a question you already asked in this conversation.
- NEVER reuse the same numbers or scenario from a previous turn.
- Each new question MUST use a DIFFERENT real-world context from the reference frames.
- If the student answered correctly, increase complexity slightly for the next question.
- If the student struggled, try a DIFFERENT angle on the same concept, not the same question.

### RESPONSE FORMAT FOR KIDS (CRITICAL — NEVER VIOLATE)
You MUST end EVERY response with EXACTLY 3 choices in this EXACT format:
[A] first choice
[B] second choice
[C] third choice

RULES (violations cause the game to break):
- One choice MUST be correct. Others must be plausible wrong answers.
- Each choice MUST be under 8 words.
- DO NOT explain the choices.
- Choices MUST appear on their own lines at the END of your response.
- For celebrate_then_explain_back: choices MUST be EXPLANATIONS of WHY the answer works.
- If you forget [A]/[B]/[C] choices, the student CANNOT proceed. ALWAYS include them.

${profile.questionStyle}`;

  // Acceleration announcement (first turn at new level)
  if (isAccelerated) {
    overlay += `

### LEVEL UP NOTE
The student is performing at Grade ${effectiveGrade} level — above their enrolled grade ${grade}. 
Start your FIRST response at this difficulty level with a brief 1-word celebration of their progress (e.g., "Wow!" or "Amazing!"), then proceed with the harder challenge. 
Do NOT announce the grade level change — just make the content harder naturally.`;
  }

  if (rsmTrack === true || rsmTrack === 'RSM') {
    overlay += `

### RSM CURRICULUM ALIGNMENT
This student attends Russian School of Mathematics. Their curriculum is 1-2 grade levels ahead of US Common Core. Calibrate accordingly:
- Use multi-step word problems, NOT single-operation problems
- Include formula-based problems (d=vt, cost=price×qty, work=rate×time)
- Expect the student to SET UP equations before solving, not just compute
- Venn diagrams, set notation, and variables are familiar territory for this student
- Grade 3 RSM students handle what US grade 4-5 students handle
- NEVER give problems that are below their enrolled grade difficulty`;
  } else if (rsmTrack && rsmTrack !== 'None') {
    overlay += `

### ENRICHMENT PROGRAM ALIGNMENT
This student attends ${rsmTrack}. They are likely 0.5-1 grade levels ahead of peers. Use multi-step problems and expect more mathematical maturity than a typical student at this grade.`;
  }

  if (fewShotExamples && fewShotExamples.length > 0) {
    overlay += `

### EXAMPLE QUESTIONS AT THIS LEVEL
These are example questions appropriate for Grade ${effectiveGrade}. Use them to calibrate your difficulty:
${fewShotExamples.map((ex, i) => `Example ${i + 1}: ${ex}`).join('\n')}`;
  }

  if (masteryContext?.masteredConcepts?.length) {
    overlay += `

### WHAT THIS STUDENT ALREADY KNOWS
Build on these mastered concepts — reference them as familiar ground:
${masteryContext.masteredConcepts.map((c) => `- ${c.name} (mastery: ${c.mastery}%)`).join('\n')}
Example: "Remember how you figured out that 3 groups of 4 is 12? This works the same way!"`;
  }

  if (masteryContext?.gapConcepts?.length) {
    overlay += `

### CONCEPT GAPS TO ADDRESS
These prerequisites are weak — if the student struggles, gently route back to these:
${masteryContext.gapConcepts.map((c) => `- ${c.name} (mastery: ${c.mastery}%)`).join('\n')}`;
  }

  return overlay.trim();
}
