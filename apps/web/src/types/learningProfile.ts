/**
 * LearningProfile — captured during parent setup to personalize the tutoring experience.
 *
 * This data is collected in ParentSetupScreen and passed to the backend engine as
 * part of clientContext. The engine uses it as a soft nudge to the LLM to adapt
 * hint modality, pacing, and representation style.
 *
 * Academic basis:
 *  - Systematic review of 84 studies (2018–2024): adaptive systems for neurodiverse
 *    children require learner characteristic signals (ScienceDirect, 2025)
 *  - Self-Determination Theory: autonomy through choice enhances intrinsic motivation
 *  - Multimodal delivery (visual/auditory/hands-on) critical for ADHD, dyslexia, autism
 */

export interface LearningProfile {
  /** How this child takes in new information most effectively */
  learnsBestBy: Array<'visual' | 'listening' | 'hands-on' | 'reading'>;

  /** Environmental and pacing factors that help this child stay focused */
  focusHelpers: Array<'short-sessions' | 'frequent-breaks' | 'quiet-mode'>;

  /** Subjects or skills that feel hard or cause frustration */
  hardSubjects: Array<'reading' | 'math' | 'writing' | 'staying-focused'>;

  /** Formal accommodations this child uses at school */
  accommodations: Array<'extra-time' | 'read-aloud' | 'visual-aids' | 'none'>;
}
