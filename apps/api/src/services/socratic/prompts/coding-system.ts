/**
 * Coding / Programming Tutor System Prompt and Hint Ladder
 *
 * Defines Vidya's identity and rules when operating as a Socratic coding tutor.
 * Covers DSA, algorithms, Python, Java, C++, JavaScript, and general CS concepts.
 *
 * CORE GUARDRAIL: Never give complete solutions or working code that solves the problem.
 */

import type { Language } from '@prisma/client';

// ============================================
// CODING SYSTEM PROMPT
// ============================================

export const CODING_SYSTEM_PROMPT = `You are Vidya, a Socratic tutor helping students learn programming, data structures, algorithms, and computer science through guided discovery.

## YOUR CORE IDENTITY

You are a patient, encouraging guide who helps students DISCOVER solutions themselves. You help them build problem-solving intuition — not just write code that compiles.

## ABSOLUTE RULES - NEVER VIOLATE THESE

### Rule 1: NEVER Give Complete Solutions
- ❌ Providing a full working function or algorithm
- ❌ Writing the exact code that solves their problem
- ❌ "Here's the solution: def solve(arr): ..."
- ✅ "What data structure would let you look up values quickly?"
- ✅ "What happens to your loop when the array is empty?"
- ✅ "Can you trace through your code with the input [1, 2, 3]?"

### Rule 2: ALWAYS Respond with Questions
Every response should contain at least one thoughtful question that:
- Guides the student toward the concept or bug they're missing
- Builds on what they already understand
- Makes them think about edge cases, complexity, or correctness

### Rule 3: ONE Question at a Time
Don't overwhelm. Ask one clear question, wait for response.

### Rule 4: Celebrate Struggle
Bugs are learning opportunities. Wrong approaches teach as much as right ones.

## SOCRATIC CODING TECHNIQUES

### Debugging Questions (when they have a bug)
- "What do you expect this line to return for input X?"
- "Can you trace through your loop for a small example?"
- "What happens at the boundary — when the array is empty, or has one element?"

### Design Questions (when choosing an approach)
- "What's the brute-force way to solve this? What's its time complexity?"
- "Is there a data structure that gives you O(1) lookup?"
- "Can you break this problem into smaller subproblems?"

### Complexity Questions (to deepen understanding)
- "What's the time complexity of your approach? Can you do better?"
- "How much extra space does your solution use?"
- "What trade-off are you making between time and space here?"

### Pattern Recognition Questions
- "Does this problem remind you of any classic pattern — sliding window, two pointers, BFS/DFS?"
- "What would change if the input were sorted?"
- "Can you reduce this to a problem you already know how to solve?"

### Edge Case Questions
- "What happens with an empty input?"
- "What if there are duplicates?"
- "What about negative numbers?"

## HINT LADDER (Progressive Help)

Level 1: Ask what they've tried and what approach they're considering
Level 2: Point to the relevant concept area (e.g., "this is a graph traversal problem")
Level 3: Narrow down the technique (e.g., "BFS works well when you need shortest path in an unweighted graph")
Level 4: Give a simpler version of the problem to solve first
Level 5: Walk through the first few steps of the algorithm in pseudocode (NOT working code)

NEVER go beyond Level 5. If still stuck, suggest reviewing the underlying concept.

## RESPONSE FORMAT

Keep responses:
- Concise: 2-4 sentences maximum
- Encouraging: Always acknowledge effort
- Focused: One main question per response
- Natural: Match the student's communication style
- Code-aware: Use inline code formatting for variable names, functions, etc.

## TOPICS COVERED

- Data Structures: Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Hash Maps, Heaps, Tries
- Algorithms: Sorting, Searching, Dynamic Programming, Greedy, Backtracking, Divide & Conquer
- Languages: Python, Java, C++, JavaScript/TypeScript
- Complexity Analysis: Big-O, space/time trade-offs
- System Design basics (for advanced students)
- Competitive Programming patterns

## EMOTIONAL INTELLIGENCE

- Recognize frustration: "Debugging can be maddening. Let's slow down and trace through it together."
- Build confidence: "Your intuition about using a hash map here is spot on!"
- Normalize struggle: "This pattern trips up experienced developers too — you're doing great."
- Celebrate progress: "You just optimized from O(n²) to O(n log n) — that's a real breakthrough!"
`;

// ============================================
// CODING HINT LADDER
// ============================================

export const CODING_HINT_LEVEL_PROMPTS: Record<number, string> = {
  1: 'Hint 1 (Approach check): Ask what approach or data structure they are considering and why.',
  2: 'Hint 2 (Concept area): Point to the relevant concept area — e.g. "this is a two-pointer problem" or "think about hash maps for O(1) lookup".',
  3: 'Hint 3 (Narrow technique): Narrow down to a specific technique or pattern — e.g. "try sliding window with a variable-length window" — but do NOT write the code.',
  4: 'Hint 4 (Simpler subproblem): Give them a simpler version of the problem to solve first as a stepping stone.',
  5: 'Hint 5 (Pseudocode walkthrough): Walk through the first few steps in pseudocode or plain English. Still do NOT provide working code.'
};

// ============================================
// CODING LANGUAGE CONTEXT
// ============================================

export function getCodingLanguageContext(language: Language): string {
  const contexts: Record<string, string> = {
    EN: `
## LANGUAGE: ENGLISH

Respond in clear, friendly English.
- Use technical terms naturally (array, hash map, recursion, etc.)
- Format code references with backticks: \`variable_name\`, \`O(n)\`
- Keep sentences short and clear
`,
    HI: `
## LANGUAGE: HINDI (हिंदी)

हिंदी में जवाब दें — conversational style में।
- Technical terms English में रखें: "array", "hash map", "recursion", "time complexity"
- Concepts हिंदी में explain करें
- Hinglish acceptable है अगर natural लगे

Example: "अच्छा, तो आपने brute force approach try किया। अब सोचो — कौन सा data structure O(1) lookup देगा?"
`,
    KN: `
## LANGUAGE: KANNADA (ಕನ್ನಡ)

ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ — ಸರಳ ಶೈಲಿಯಲ್ಲಿ।
- Technical terms English ನಲ್ಲಿ ಇರಿಸಿ: "array", "hash map", "recursion"
- Concepts ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸಿ
`,
    FR: `
## LANGUAGE: FRENCH (Français)

Répondez en français clair et amical.
- Gardez les termes techniques en anglais : "array", "hash map", "recursion", "time complexity"
- Expliquez les concepts en français
- Ton conversationnel, pas formel
`,
    DE: `
## LANGUAGE: GERMAN (Deutsch)

Antworten Sie auf Deutsch, klar und freundlich.
- Technische Begriffe auf Englisch belassen: "array", "hash map", "recursion", "time complexity"
- Konzepte auf Deutsch erklären
- Lockerer Ton, nicht formell
`,
    ES: `
## LANGUAGE: SPANISH (Español)

Responde en español claro y amigable.
- Mantén los términos técnicos en inglés: "array", "hash map", "recursion", "time complexity"
- Explica los conceptos en español
- Tono conversacional, no formal
`,
    ZH: `
## LANGUAGE: MANDARIN CHINESE (中文)

用中文回答，清晰友好。
- 技术术语保持英文：array、hash map、recursion、time complexity
- 用中文解释概念
- 对话式语气，不要太正式
`
  };

  return contexts[language] || contexts.EN;
}

// ============================================
// CODING ATTEMPT PROMPTS
// ============================================

export const CODING_ATTEMPT_PROMPTS: Record<string, string> = {
  EN: `Before I help, I'd love to see your thinking! 🤔

What have you tried so far? Even pseudocode or a rough idea is great.

You could share:
• What approach or data structure you're considering
• Code you've written (even if it doesn't work yet)
• Where you got stuck

Remember: Debugging your own attempts is how you build real problem-solving skills.`,

  HI: `मदद करने से पहले, मैं आपकी सोच देखना चाहूंगा! 🤔

आपने अब तक क्या try किया है? Pseudocode या rough idea भी काफी है।

आप बता सकते हैं:
• कौन सा approach या data structure सोच रहे हैं
• जो code लिखा है (भले ही काम न करे)
• कहाँ stuck हो गए

याद रखें: अपने code को debug करना ही real problem-solving skills बनाता है।`,

  KN: `ಸಹಾಯ ಮಾಡುವ ಮೊದಲು, ನಿಮ್ಮ ಯೋಚನೆ ನೋಡಲು ಬಯಸುತ್ತೇನೆ! 🤔

ನೀವು ಇದುವರೆಗೆ ಏನು ಪ್ರಯತ್ನಿಸಿದ್ದೀರಿ? Pseudocode ಅಥವಾ rough idea ಸಾಕು.

ನೀವು ಹಂಚಿಕೊಳ್ಳಬಹುದು:
• ಯಾವ approach ಅಥವಾ data structure ಯೋಚಿಸುತ್ತಿದ್ದೀರಿ
• ಬರೆದ code (ಕೆಲಸ ಮಾಡದಿದ್ದರೂ ಪರವಾಗಿಲ್ಲ)
• ಎಲ್ಲಿ stuck ಆದಿರಿ`,

  FR: `Avant de vous aider, j'aimerais voir votre réflexion ! 🤔

Qu'avez-vous essayé jusqu'ici ? Même du pseudocode ou une idée approximative suffit.

Vous pouvez partager :
• L'approche ou la structure de données que vous envisagez
• Le code que vous avez écrit (même s'il ne fonctionne pas encore)
• Où vous êtes bloqué`,

  DE: `Bevor ich helfe, würde ich gerne Ihre Überlegungen sehen! 🤔

Was haben Sie bisher versucht? Auch Pseudocode oder eine grobe Idee reicht.

Sie können teilen:
• Welchen Ansatz oder welche Datenstruktur Sie in Betracht ziehen
• Code, den Sie geschrieben haben (auch wenn er noch nicht funktioniert)
• Wo Sie nicht weiterkommen`,

  ES: `Antes de ayudarte, ¡me gustaría ver tu razonamiento! 🤔

¿Qué has intentado hasta ahora? Incluso pseudocódigo o una idea aproximada es genial.

Puedes compartir:
• Qué enfoque o estructura de datos estás considerando
• Código que hayas escrito (aunque no funcione todavía)
• Dónde te quedaste atascado`,

  ZH: `在我帮助你之前，我想先看看你的思路！🤔

你到目前为止尝试了什么？即使是伪代码或大致想法也可以。

你可以分享：
• 你在考虑什么方法或数据结构
• 你写的代码（即使还不能运行）
• 你在哪里卡住了`
};

// ============================================
// SUBJECT-SPECIFIC QUESTION BANK
// ============================================

// ============================================
// CONCEPT / HINT BANKS (Option B — in-code)
// ============================================

export const CODING_TOPIC_KEYS = ['data_structures', 'algorithms', 'complexity', 'recursion', 'debugging', 'basics_variables', 'basics_loops', 'basics_functions'] as const;
export type CodingTopic = typeof CODING_TOPIC_KEYS[number];

export interface ConceptHint {
  concept: string;
  hints: string[];
}

export const CODING_CONCEPTS: Record<string, ConceptHint[]> = {
  data_structures: [
    {
      concept: 'Hash Map / Dictionary',
      hints: [
        'Think about what operation you need to do frequently — lookup, insert, or both.',
        'A hash map gives O(1) average lookup. Where are you doing repeated searches?',
        'Consider using a key-value pair where the key is what you search for.',
        'Map each element to its index (or count) so you can check existence in constant time.',
        'Use a dictionary: for each element, check if the complement exists as a key.',
      ],
    },
    {
      concept: 'Stack (LIFO)',
      hints: [
        'Is there a "most recent" or "last opened" element you need to track?',
        'A stack processes items in reverse order of arrival — does that match your problem?',
        'Think about matching pairs (brackets, parentheses). What should you compare against?',
        'Push opening items onto the stack; when you see a closing item, pop and compare.',
        'The stack at any point represents all unmatched / still-open elements.',
      ],
    },
    {
      concept: 'Binary Tree / BST',
      hints: [
        'Does your data have a natural hierarchical or sorted structure?',
        'In a BST, everything left is smaller and everything right is larger.',
        'Think about which traversal order (inorder, preorder, postorder) gives you what you need.',
        "Recursion maps naturally onto trees — what's the base case (leaf or null)?",
        'For balanced BSTs, operations are O(log n). What operations does your problem need?',
      ],
    },
    {
      concept: 'Heap / Priority Queue',
      hints: [
        'Do you need repeated access to the current min or max element?',
        'A heap gives you O(log n) insert and remove-min/max. Is that good enough here?',
        'If you only need the top-k elements, a heap can keep just those.',
        'Ask: can you replace sorting the full list with a heap of size k?',
        'Priority queues model “process the most urgent item next.” Is that your flow?',
      ],
    },
  ],
  algorithms: [
    {
      concept: 'Two Pointers',
      hints: [
        'If the input is sorted, can you start from both ends?',
        'Two pointers can avoid nested loops when scanning from opposite directions.',
        'One pointer advances when the sum is too small; the other when too large.',
        'Set left = 0, right = end. Move them toward each other based on comparison.',
        'Each pointer moves at most n times, so total work is O(n).',
      ],
    },
    {
      concept: 'Binary Search',
      hints: [
        'Is there a sorted property you can exploit to halve the search space?',
        'What condition tells you to look in the left half vs. the right half?',
        'Define your boundaries carefully — are they inclusive or exclusive?',
        'At each step, check the middle element. Which half contains your answer?',
        'Remember: binary search works on any monotonic predicate, not just arrays.',
      ],
    },
    {
      concept: 'Dynamic Programming',
      hints: [
        'Can you express the answer for size n in terms of smaller sizes?',
        'Identify the subproblems: what state do you need to track?',
        'Are there overlapping subproblems? (Same inputs computed multiple times?)',
        'Write the recurrence first, then decide between top-down (memo) and bottom-up (table).',
        'Your DP table dimensions = number of state variables. Fill order follows dependencies.',
      ],
    },
    {
      concept: 'Graph Traversal (BFS/DFS)',
      hints: [
        'Is the data naturally a graph or can you model it as nodes + edges?',
        'BFS explores level by level; DFS explores depth first. Which matches your needs?',
        'If you need shortest path in an unweighted graph, BFS is usually the right tool.',
        'Remember to mark visited nodes to avoid infinite loops.',
        'Track the parent of each node if you need to reconstruct a path.',
      ],
    },
  ],
  complexity: [
    {
      concept: 'Time Complexity Analysis',
      hints: [
        'Count how many times the innermost operation executes as input grows.',
        'Nested loops often mean O(n²) — is each loop iterating over the full input?',
        'Sorting is O(n log n); if you sort first, that becomes your baseline.',
        'Amortized analysis: sometimes a costly operation happens rarely enough that the average is still fast.',
        'Express your total work as a function of n, then drop constants and lower-order terms.',
      ],
    },
    {
      concept: 'Space Complexity Trade-offs',
      hints: [
        'Are you storing extra arrays, hash maps, or recursion stacks?',
        'In-place algorithms reduce space but can complicate logic. Is the trade-off worth it?',
        'Recursion uses call-stack space. What is the maximum depth?',
        'If you cache results (memoization), how large can the cache grow?',
        'Sometimes O(n) space is fine if it cuts time dramatically — does that apply here?',
      ],
    },
  ],
  recursion: [
    {
      concept: 'Recursion / Backtracking',
      hints: [
        "Every recursive function needs a base case — what's the simplest version of this problem?",
        'What choice do you make at each step, and how does it reduce the problem?',
        'Draw the recursion tree for a small input to see the pattern.',
        'Backtracking = recursion + undo: make a choice, recurse, then undo the choice.',
        'If the tree has repeated states, add memoization to avoid redundant computation.',
      ],
    },
  ],
  debugging: [
    {
      concept: 'Systematic Debugging',
      hints: [
        'Start with the smallest input that fails. Can you trace through it by hand?',
        'Check edge cases: empty input, single element, all duplicates, negative numbers.',
        'Add a print statement inside your loop — does the variable hold what you expect?',
        'Compare your expected output at each step with the actual output.',
        'Off-by-one errors are common: double-check your loop bounds and array indices.',
      ],
    },
  ],
  basics_variables: [
    {
      concept: 'Variables and Data Types',
      hints: [
        'A variable is like a labeled box that holds a value. What would you name it?',
        'Numbers, text, and true/false are different types. Which type does your value need?',
        'When you assign x = 5, the box x now holds 5. What happens if you reassign x = 10?',
        'Strings use quotes ("hello"), numbers do not (42). What type is your input?',
        'Try printing the variable to check what it holds at each step.',
      ],
    },
  ],
  basics_loops: [
    {
      concept: 'Loops (for, while)',
      hints: [
        'A loop repeats code. What do you want to repeat, and how many times?',
        'A for loop counts from a start to an end. What are your start and end values?',
        'A while loop keeps going as long as a condition is true. What condition should stop it?',
        'Inside the loop body, what changes each time? That is your loop variable.',
        'Trace through the first 3 iterations by hand: what values do you see?',
      ],
    },
  ],
  basics_functions: [
    {
      concept: 'Functions',
      hints: [
        'A function is a reusable block of code with a name. What task should yours do?',
        'Functions take inputs (parameters) and can return an output. What goes in and what comes out?',
        'Calling a function runs its code. What arguments will you pass when you call it?',
        'Breaking a big problem into small functions makes it easier to test each piece.',
        'Write the function signature first (name, parameters, return type), then fill in the body.',
      ],
    },
  ],
};

export const CODING_QUESTIONS: Record<string, string[]> = {
  data_structures: [
    "What data structure gives you O(1) lookup here?",
    "What are the trade-offs between using an array vs. a hash map?",
    "Would a stack or queue be more natural for this traversal order?",
    "What happens if you need to frequently insert in the middle — is this the right structure?",
    "Could a set help you avoid duplicates more efficiently?",
  ],
  algorithms: [
    "What's the brute-force solution, and where is it doing redundant work?",
    "Can you identify overlapping subproblems? What does that suggest?",
    "Is there a way to divide this problem into smaller independent parts?",
    "What invariant does your loop maintain?",
    "Could sorting the input first simplify the logic?",
    "Is there a graph interpretation here that suggests BFS or DFS?",
  ],
  complexity: [
    "What's the time complexity of your current approach?",
    "Is there a way to reduce this from O(n²) to O(n log n) or O(n)?",
    "Where is the bottleneck — the outer loop or the inner operation?",
    "What's the space complexity, and could you trade space for time?",
    "How does the input size affect whether your approach is practical?",
    "If you added a cache or map, how would that change the space cost?",
  ],
  debugging: [
    "What happens when you trace through your code with a small example?",
    "Is there an edge case your code doesn't handle — empty input, single element, negative numbers?",
    "What value does this variable hold at the start of each iteration?",
    "Are you comparing the right things in your condition?",
    "What did you expect vs. what did you actually get?",
  ],
  recursion: [
    "What's the base case, and does it cover all terminating conditions?",
    "How does each recursive call bring you closer to the base case?",
    "Can you draw the call tree for a small input?",
    "Is there repeated computation you could memoize?",
    "What's the maximum recursion depth for your expected input size?",
  ],
  basics_variables: [
    "What type of value does this variable hold — a number, text, or something else?",
    "If you change the value of x, what happens to anything that used the old value?",
    "Can you predict what this variable will be after the assignment runs?",
    "Why might you choose a descriptive name like `total_score` instead of `x`?",
  ],
  basics_loops: [
    "How many times will this loop run? Can you count by hand?",
    "What changes with each iteration? What stays the same?",
    "What happens if the loop condition is never true — does the loop run at all?",
    "Can you trace through the first 3 iterations and write down the values?",
    "What would go wrong if you forgot to update the loop variable?",
  ],
  basics_functions: [
    "What inputs does this function need to do its job?",
    "What should the function return when it's done?",
    "Can you describe in one sentence what this function does?",
    "If you call this function with different inputs, do you get different outputs?",
    "How would you test this function — what inputs would you try?",
  ],
};
