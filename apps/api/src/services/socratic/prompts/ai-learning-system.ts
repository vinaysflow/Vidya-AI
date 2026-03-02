/**
 * AI Learning Tutor System Prompt, Hint Ladder, and Content Banks
 *
 * Covers AI/ML fundamentals for K-12:
 * - Classification vs Regression
 * - Features, Labels, and Data
 * - Bias and Fairness
 * - Neural Network basics
 * - Supervised vs Unsupervised learning
 *
 * CORE GUARDRAIL: Teach through discovery — never hand out definitions directly.
 */

import type { Language } from '@prisma/client';

// ============================================
// AI LEARNING SYSTEM PROMPT
// ============================================

export const AI_LEARNING_SYSTEM_PROMPT = `You are Vidya, a Socratic tutor helping K-12 students discover the fundamentals of Artificial Intelligence and Machine Learning through guided questioning.

## YOUR CORE IDENTITY

You make AI/ML concepts accessible and tangible for young learners. Use everyday analogies — sorting toys, predicting weather, recognizing faces — to ground abstract ideas.

## ABSOLUTE RULES - NEVER VIOLATE THESE

### Rule 1: NEVER Give Definitions Directly
- ❌ "Classification means assigning inputs to categories."
- ❌ "A neural network is a layered structure that..."
- ✅ "If I showed you pictures of cats and dogs and asked you to sort them, what would you look for?"
- ✅ "When you learn to tell apart sweet and sour fruit, what 'clues' do you use?"

### Rule 2: ALWAYS Respond with Questions
Every response should contain at least one question that:
- Connects to something the student already knows
- Uses a concrete, relatable example
- Nudges them toward the concept without naming it outright

### Rule 3: ONE Question at a Time
Don't overwhelm. One clear, concrete question. Wait for response.

### Rule 4: Celebrate Curiosity
AI can feel intimidating. Normalize not knowing and reward exploration.

## SOCRATIC AI-TEACHING TECHNIQUES

### Analogy Questions
- "If you were sorting your music playlist into 'happy' and 'sad' songs, what would you listen for?"
- "Imagine you're predicting tomorrow's temperature. What information from today would help?"

### Data Thinking Questions
- "What information (features) would a computer need to tell cats from dogs?"
- "If I gave you 100 exam scores, how would you decide if a student is 'pass' or 'fail'?"

### Bias & Fairness Questions
- "If we only trained on photos from one country, what might go wrong?"
- "Is it fair if a computer makes different predictions for different groups? When might it matter?"

### How-Machines-Learn Questions
- "When you learned to ride a bicycle, did you get it right the first time? How did you improve?"
- "What if I told you computers learn by making mistakes and adjusting — what would they adjust?"

## HINT LADDER (Progressive Help)

Level 1: Ask what they already know or believe about the concept
Level 2: Offer a concrete analogy (sorting toys, predicting weather)
Level 3: Name the concept area (e.g., "this relates to how machines classify things")
Level 4: Give a simplified definition and ask them to rephrase it
Level 5: Walk through a tiny worked example (3 data points, 2 features)

NEVER go beyond Level 5. If still stuck, suggest a fun video or activity.

## RESPONSE FORMAT

- Concise: 2-4 sentences maximum
- Encouraging: Always acknowledge curiosity
- Concrete: Use examples a school student would understand
- One question per response

## TOPICS COVERED

- What is AI / ML (big picture)
- Classification vs Regression
- Features, Labels, and Datasets
- Training, Testing, and Overfitting
- Bias, Fairness, and Ethics
- Neural Networks (intuition, not math)
- Supervised vs Unsupervised Learning
- Real-world AI applications (self-driving, translation, recommendations)
`;

// ============================================
// AI LEARNING HINT LADDER
// ============================================

export const AI_LEARNING_HINT_LEVEL_PROMPTS: Record<number, string> = {
  1: 'Hint 1 (Prior knowledge): Ask what the student already knows or guesses about this concept.',
  2: 'Hint 2 (Analogy): Offer a concrete everyday analogy — sorting objects, predicting outcomes.',
  3: 'Hint 3 (Concept area): Name the concept area — e.g. "this is about how machines classify data."',
  4: 'Hint 4 (Simplified definition): Give a one-sentence simplified definition and ask them to rephrase it in their own words.',
  5: 'Hint 5 (Mini example): Walk through a tiny example (3 data points, 2 features) to illustrate the concept. Do NOT give a formal definition.',
};

// ============================================
// AI LEARNING LANGUAGE CONTEXT
// ============================================

export function getAILearningLanguageContext(language: Language): string {
  const contexts: Record<string, string> = {
    EN: `
## LANGUAGE: ENGLISH
Respond in clear, friendly English suitable for a school student.
Use everyday analogies. Technical terms (features, labels, classification) should be introduced gently with context.
`,
    HI: `
## LANGUAGE: HINDI (हिंदी)
हिंदी में जवाब दें — सरल भाषा में।
Technical terms English में रखें: "features", "labels", "classification"
Concepts हिंदी में explain करें, school student के लिए आसान भाषा में।
`,
    KN: `
## LANGUAGE: KANNADA (ಕನ್ನಡ)
ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ — ಸರಳ ಶೈಲಿಯಲ್ಲಿ.
Technical terms English ನಲ್ಲಿ ಇರಿಸಿ: "features", "labels", "classification"
`,
    FR: `
## LANGUAGE: FRENCH (Français)
Répondez en français clair, adapté à un élève.
Termes techniques en anglais : "features", "labels", "classification"
`,
    DE: `
## LANGUAGE: GERMAN (Deutsch)
Antworten Sie auf Deutsch, klar und einfach.
Technische Begriffe auf Englisch: "features", "labels", "classification"
`,
    ES: `
## LANGUAGE: SPANISH (Español)
Responde en español claro, apto para un estudiante.
Términos técnicos en inglés: "features", "labels", "classification"
`,
    ZH: `
## LANGUAGE: MANDARIN CHINESE (中文)
用中文回答，清晰简单，适合学生。
技术术语保持英文：features、labels、classification
`,
  };
  return contexts[language] || contexts.EN;
}

// ============================================
// AI LEARNING ATTEMPT PROMPTS
// ============================================

export const AI_LEARNING_ATTEMPT_PROMPTS: Record<string, string> = {
  EN: `Before I guide you further, tell me what you think!

What do you already know (or guess) about this? Even a rough idea or a real-world example is great.

You could share:
• What you think AI or machine learning means
• An example of AI you've seen (Siri, Netflix recommendations, etc.)
• A guess about how a computer might learn something`,

  HI: `आगे बढ़ने से पहले, मुझे बताओ तुम क्या सोचते हो!

इस बारे में तुम्हें क्या पता है या guess करते हो? एक rough idea या real-world example भी काफी है।`,

  KN: `ಮುಂದೆ ಹೋಗುವ ಮೊದಲು, ನಿಮಗೆ ಏನು ಗೊತ್ತು ಎಂದು ಹೇಳಿ!

ನಿಮಗೆ ಈ ಬಗ್ಗೆ ಏನು ಗೊತ್ತು ಅಥವಾ ಊಹಿಸುತ್ತೀರಿ? ಒಂದು rough idea ಅಥವಾ real-world example ಸಾಕು.`,
};

// ============================================
// TOPIC KEYS & CONCEPT / HINT BANKS
// ============================================

export const AI_LEARNING_TOPIC_KEYS = [
  'classification_regression',
  'features_labels',
  'training_testing',
  'bias_fairness',
  'neural_networks',
  'supervised_unsupervised',
  'real_world_ai',
] as const;

export type AILearningTopic = (typeof AI_LEARNING_TOPIC_KEYS)[number];

export interface ConceptHint {
  concept: string;
  hints: string[];
}

export const AI_LEARNING_CONCEPTS: Record<string, ConceptHint[]> = {
  classification_regression: [
    {
      concept: 'Classification',
      hints: [
        'Think about sorting things into groups — cats vs dogs, spam vs not-spam.',
        'The computer looks at clues (features) to decide which group something belongs to.',
        'Classification answers "which category?" — like labeling an email as spam or not.',
        'A simple classifier: if an animal has feathers, classify it as a bird. What could go wrong?',
        'Example: given height and weight, classify as "child" or "adult". What 2 numbers does the model see?',
      ],
    },
    {
      concept: 'Regression',
      hints: [
        'Instead of groups, think about predicting a number — like tomorrow\'s temperature.',
        'Regression answers "how much?" or "how many?" rather than "which category?".',
        'If I asked you to predict a test score from hours of study, that\'s regression.',
        'The output is a continuous number, not a label. What everyday predictions are like that?',
        'Example: predict house price from size in square feet. Draw a rough line through the data.',
      ],
    },
    {
      concept: 'Decision Boundary',
      hints: [
        'A decision boundary is the line that separates classes.',
        'Points on one side are class A; the other side is class B.',
        'A linear model draws a straight boundary; complex data may need curves.',
        'Try to picture where the boundary should go on a simple scatter plot.',
        'Example: draw a line that separates red dots from blue dots.',
      ],
    },
  ],
  features_labels: [
    {
      concept: 'Features',
      hints: [
        'Features are the "clues" a computer uses to make predictions — like color, size, shape.',
        'If you sort fruit, you might look at color, shape, and sweetness. Those are features.',
        'More features can help, but too many irrelevant ones can confuse the model.',
        'Which features would help tell apart a cat and a dog?',
        'Example: to predict if an email is spam, features might be: number of exclamation marks, sender known, contains "free".',
      ],
    },
    {
      concept: 'Labels',
      hints: [
        'A label is the "answer" we want the computer to learn — like "cat" or "dog".',
        'In a training dataset, every example already has the correct answer attached.',
        'The computer learns to predict labels from features by seeing many labeled examples.',
        'If features are the question, the label is the answer. What label would "spam/not-spam" use?',
        'Example: 100 photos labeled "cat" or "dog". The model studies them and learns the pattern.',
      ],
    },
    {
      concept: 'Normalization',
      hints: [
        'Normalization puts features on a similar scale.',
        'If one feature is 0-1 and another is 0-1000, the bigger one can dominate.',
        'Scaling helps many models learn faster and more accurately.',
        'Try z-score or min-max scaling when numbers are far apart.',
        'Example: scale height (cm) and weight (kg) before training.',
      ],
    },
  ],
  training_testing: [
    {
      concept: 'Training Data',
      hints: [
        'Training data is what the computer studies to learn patterns — like a textbook.',
        'More training data usually means better learning, up to a point.',
        'The computer adjusts its "guesses" to match the correct answers in training data.',
        'What happens if you only study one chapter? Can you answer questions from another?',
        'Example: show the model 80 labeled photos to train, save 20 to test.',
      ],
    },
    {
      concept: 'Overfitting',
      hints: [
        'Imagine memorizing every answer in a textbook but not understanding the concepts.',
        'Overfitting means the model is too specialized to training data and fails on new data.',
        'If the model gets 100% on training but 50% on new examples, it has overfit.',
        'How would you check if you truly understand something vs. just memorized it?',
        'Example: a model that memorizes all 80 training photos but can\'t classify a new cat photo.',
      ],
    },
    {
      concept: 'Validation vs Test',
      hints: [
        'Validation helps you tune the model while you build it.',
        'The test set is for final evaluation only.',
        'Using the test set too often can give a misleading result.',
        'Keep data splits separate to avoid leakage.',
        'Example: train on 70%, validate on 15%, test on 15%.',
      ],
    },
  ],
  bias_fairness: [
    {
      concept: 'Data Bias',
      hints: [
        'If your training data only includes one type of example, the model may not work for others.',
        'Bias in data leads to bias in predictions. What if all photos were of golden retrievers?',
        'Real-world data often reflects human biases — the model can amplify them.',
        'How would you make sure a face-recognition system works for everyone?',
        'Example: a hiring model trained mostly on data from one gender might be unfair to others.',
      ],
    },
    {
      concept: 'Fairness',
      hints: [
        'Fairness means the model treats different groups of people equitably.',
        'Should a medical AI give different predictions based on where someone lives?',
        'Testing for fairness means checking accuracy across different groups, not just overall.',
        'If a loan model rejects one group more often, is that bias or a real pattern?',
        'Example: check if a school-admission model is equally accurate for all genders.',
      ],
    },
    {
      concept: 'Bias Mitigation',
      hints: [
        'You can rebalance data so groups are represented fairly.',
        'You can add fairness constraints during training.',
        'Always measure fairness, not just overall accuracy.',
        'Ask: who might be harmed if the model is wrong?',
        'Example: collect more data for underrepresented groups.',
      ],
    },
  ],
  neural_networks: [
    {
      concept: 'Neurons and Layers',
      hints: [
        'Think of a neuron as a tiny decision-maker that takes inputs and produces an output.',
        'Many neurons connected together in layers form a "neural network" — like a team.',
        'The first layer looks at raw input (pixels). Middle layers find patterns. The last layer decides.',
        'What if each team member checked one feature and passed their finding to the next?',
        'Example: layer 1 detects edges, layer 2 detects shapes, layer 3 recognizes "cat" vs "dog".',
      ],
    },
    {
      concept: 'Learning by Adjusting',
      hints: [
        'When the network makes a wrong guess, it adjusts its connections to do better next time.',
        'This is like practicing free throws — each miss helps you adjust your aim.',
        'The adjustments are tiny numbers called "weights." Better weights mean better predictions.',
        'How does practice make you better at something? The network works the same way.',
        'Example: wrong guess → compute error → adjust weights → try again → error shrinks.',
      ],
    },
    {
      concept: 'Activation Functions',
      hints: [
        'Activation functions decide how strongly a neuron "fires."',
        'They add non-linearity so the network can learn complex patterns.',
        'Common ones: ReLU, sigmoid, tanh.',
        'Without them, multiple layers act like one linear layer.',
        'Example: ReLU turns negative values into zero.',
      ],
    },
  ],
  supervised_unsupervised: [
    {
      concept: 'Supervised Learning',
      hints: [
        'Supervised = the computer has a teacher who provides the correct answers during training.',
        'It\'s like a tutor giving you practice problems WITH the answer key.',
        'Classification and regression are both supervised learning tasks.',
        'What makes it "supervised"? The labels — every training example has the right answer.',
        'Example: 100 emails labeled "spam" or "not spam" → train → model predicts new emails.',
      ],
    },
    {
      concept: 'Unsupervised Learning',
      hints: [
        'Unsupervised = no labels! The computer looks for patterns on its own.',
        'It\'s like sorting a pile of mixed buttons into groups without being told the categories.',
        'Clustering is a common unsupervised task: "find natural groups in this data."',
        'What patterns might you notice if you sorted objects by similarity without instructions?',
        'Example: given customer purchase data with no labels, the model finds 3 buying-habit groups.',
      ],
    },
    {
      concept: 'Clustering',
      hints: [
        'Clustering groups similar items together without labels.',
        'You choose how many groups you want, then find centers.',
        'Different algorithms cluster in different shapes.',
        'It helps discover patterns you did not know existed.',
        'Example: grouping students by study habits.',
      ],
    },
  ],
  real_world_ai: [
    {
      concept: 'Everyday AI Applications',
      hints: [
        'Voice assistants, movie recommendations, and auto-correct all use ML.',
        'Self-driving cars use classification: is that a person, a car, or a traffic sign?',
        'Language translation apps use neural networks trained on millions of sentence pairs.',
        'What AI do you use daily without realizing it?',
        'Example: Netflix recommends shows by finding users with similar watching history to yours.',
      ],
    },
    {
      concept: 'Data Privacy',
      hints: [
        'AI systems learn from data, so privacy matters.',
        'Sensitive data should be minimized or anonymized.',
        'Consent and transparency build trust.',
        'Ask: does the model need this data to work?',
        'Example: location data can improve maps but must be protected.',
      ],
    },
  ],
};

export const AI_LEARNING_TOPIC_PRIMERS: Record<string, string[]> = {
  classification_regression: [
    'Classification predicts categories; regression predicts numbers.',
    'Decision boundaries separate classes in feature space.',
    'Pick the simplest model that fits the data.',
  ],
  features_labels: [
    'Features are inputs; labels are the target outputs.',
    'Good features improve accuracy; noisy features hurt.',
    'Normalize when scales differ a lot.',
  ],
  training_testing: [
    'Train on one set, validate for tuning, test once for final results.',
    'Overfitting means doing well on training but poorly on new data.',
    'More data and simpler models usually generalize better.',
  ],
  bias_fairness: [
    'Bias can come from data, labels, or decisions.',
    'Fairness must be measured across groups, not just overall.',
    'Mitigation includes rebalancing data or adding constraints.',
  ],
  neural_networks: [
    'Layers learn from simple patterns to complex ones.',
    'Activation functions add non-linearity.',
    'Training adjusts weights to reduce error.',
  ],
  supervised_unsupervised: [
    'Supervised learning uses labels; unsupervised finds structure.',
    'Clustering groups similar items without answers.',
    'Choose based on whether labels exist.',
  ],
  real_world_ai: [
    'AI appears in recommendations, vision, language, and automation.',
    'Data quality and privacy shape real-world reliability.',
  ],
};

export const AI_LEARNING_QUESTIONS: Record<string, string[]> = {
  classification_regression: [
    'Is this problem about sorting into groups (classification) or predicting a number (regression)?',
    'Can you give me an example of a classification task from everyday life?',
    'If I predict tomorrow\'s temperature, is that classification or regression? Why?',
    'What if the categories overlap — some data points could belong to either group?',
    'Where would you draw the decision boundary?',
    'How would you check if the model is over- or under-confident?',
  ],
  features_labels: [
    'What "clues" (features) would a computer use to solve this task?',
    'If I gave you a table of student data, which columns would be features and which is the label?',
    'Can you have too many features? What might go wrong?',
    'What happens if one of the features is noisy or incorrect?',
    'Would scaling features change the result?',
    'Which feature would you drop if it caused confusion?',
  ],
  training_testing: [
    'Why do we split data into training and testing sets?',
    'What happens if the model only sees one type of example during training?',
    'How would you know if your model memorized the data instead of learning the pattern?',
    'If your training accuracy is 99% but test accuracy is 60%, what might have happened?',
    'What is the role of a validation set?',
    'How would you avoid data leakage?',
  ],
  bias_fairness: [
    'Can you think of a case where biased training data could harm real people?',
    'How would you check if a model is fair to different groups?',
    'If a model is accurate overall but unfair to one group, is it a good model?',
    'What could you change about the data to reduce bias?',
    'Who could be harmed if the model is wrong?',
    'What trade-offs might exist between fairness and accuracy?',
  ],
  neural_networks: [
    'Why might a neural network need more than one layer?',
    'How is a network "learning" similar to how you learn a new skill?',
    'What does it mean for a network to "adjust its weights"?',
    'Can you think of a task that would need many layers vs. just one?',
    'Why do activation functions matter?',
    'What might happen if the network is too deep or too wide?',
  ],
  supervised_unsupervised: [
    'What\'s the difference between learning with answers and learning without?',
    'Can you give an example of something you learned "supervised" vs. "unsupervised"?',
    'When might you use unsupervised learning — when you don\'t have labels?',
    'Is clustering supervised or unsupervised? Why?',
    'If labels are expensive, what could you do instead?',
    'How do you decide how many clusters to use?',
  ],
  real_world_ai: [
    'What AI or ML application do you interact with most often?',
    'How do you think Netflix knows what shows you might like?',
    'Where might AI make mistakes in the real world, and why?',
    'Can you name an AI application that helps people in a serious way (medicine, safety)?',
    'What data would that AI need to work well?',
    'How could privacy concerns shape the design?',
  ],
};
