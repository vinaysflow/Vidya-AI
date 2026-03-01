/**
 * Common Cliche Dictionary for College Application Essays
 * 
 * These are overused phrases that admissions officers flag.
 * Used by computeEssayMetrics() to detect cliches without an LLM call.
 * 
 * Sources: Common advice from college admissions counselors and essay coaches.
 */

export const ESSAY_CLICHES: string[] = [
  // Overused openings
  'ever since i was a child',
  'ever since i was young',
  'ever since i was little',
  'from a young age',
  'growing up',
  'when i was younger',
  'since i can remember',

  // Generic phrases
  'changed my life',
  'changed my perspective',
  'opened my eyes',
  'eye-opening experience',
  'pushed me out of my comfort zone',
  'outside my comfort zone',
  'stepped out of my comfort zone',
  'taught me a valuable lesson',
  'taught me the importance of',
  'learned so much',
  'learned a lot',
  'i realized that',
  'in that moment i realized',
  'it was then that i realized',

  // Overused conclusions
  'made me who i am today',
  'shaped who i am',
  'the person i am today',
  'made me a better person',
  'i am a better person',
  'i will never forget',
  'i wouldn\'t change anything',
  'looking back',
  'in conclusion',
  'to sum up',

  // Abstract claims without evidence
  'passion for learning',
  'passion for helping others',
  'passion for making a difference',
  'making the world a better place',
  'making a difference',
  'give back to my community',
  'giving back to the community',
  'pursue my dreams',
  'follow my passion',
  'reach my full potential',
  'make my mark',
  'leave my mark',

  // Cliche descriptors
  'once in a lifetime',
  'rollercoaster of emotions',
  'at the end of the day',
  'the biggest challenge',
  'hard work pays off',
  'blood sweat and tears',
  'against all odds',
  'a blessing in disguise',
  'every cloud has a silver lining',
  'light at the end of the tunnel',
  'turning point in my life',
  'the rest is history',

  // Dictionary/quote openings (commonly flagged)
  'webster\'s dictionary defines',
  'according to the dictionary',
  'the dictionary defines',
  'as gandhi once said',
  'as einstein once said',
  'as martin luther king',
];

/**
 * Passive voice indicator patterns.
 * These detect common passive constructions in English.
 */
export const PASSIVE_VOICE_PATTERNS: RegExp[] = [
  /\b(?:was|were|is|are|been|being|be)\s+\w+ed\b/i,
  /\b(?:was|were|is|are|been|being|be)\s+\w+en\b/i,
  /\bwas\s+(?:given|taken|made|told|shown|found|left|kept|brought|thought|felt|said)\b/i,
  /\bwere\s+(?:given|taken|made|told|shown|found|left|kept|brought|thought|felt|said)\b/i,
  /\bis\s+(?:given|taken|made|told|shown|found|left|kept|brought|thought|felt|said)\b/i,
  /\bare\s+(?:given|taken|made|told|shown|found|left|kept|brought|thought|felt|said)\b/i,
];

/**
 * Sensory language keywords — words related to sight, sound, touch, smell, taste.
 * Presence of sensory language indicates "show don't tell" writing.
 */
export const SENSORY_WORDS: string[] = [
  // Sight
  'glimpsed', 'glanced', 'stared', 'gazed', 'watched', 'noticed', 'spotted',
  'glowing', 'shimmering', 'bright', 'dim', 'shadowy', 'vivid', 'blurry',
  'crimson', 'golden', 'pale', 'faded',

  // Sound
  'whispered', 'shouted', 'murmured', 'hummed', 'echoed', 'rustled', 'crackled',
  'buzzed', 'roared', 'thundered', 'clattered', 'clicked', 'sighed',
  'silence', 'quiet', 'loud', 'deafening',

  // Touch / Physical
  'rough', 'smooth', 'cold', 'warm', 'hot', 'icy', 'sticky', 'soft',
  'sharp', 'prickly', 'damp', 'wet', 'dry', 'heavy', 'light',
  'trembled', 'shivered', 'clenched', 'gripped', 'pressed',

  // Smell
  'fragrant', 'musty', 'pungent', 'fresh', 'stale', 'acrid', 'sweet-smelling',
  'smoky', 'earthy',

  // Taste
  'bitter', 'sweet', 'sour', 'salty', 'tangy', 'savory', 'bland',
];
