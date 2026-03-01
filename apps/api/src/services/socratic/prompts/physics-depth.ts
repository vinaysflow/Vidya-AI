/**
 * Physics Depth Pack
 *
 * Extends the STEM module's Physics coverage with:
 * - K-12 grade-appropriate concept banks (motion, forces, energy, electricity)
 * - Topic classifier (keyword → topic mapping)
 * - Progressive hint banks per concept
 *
 * Injected into the STEM module's buildResponseSystemAddendum
 * when subject === 'PHYSICS'.
 */

// ============================================
// TOPIC CLASSIFIER
// ============================================

const TOPIC_KEYWORDS: Record<string, string[]> = {
  mechanics: [
    'velocity', 'speed', 'acceleration', 'motion', 'displacement',
    'newton', 'force', 'mass', 'momentum', 'inertia', 'friction',
    'projectile', 'kinematics', 'dynamics', 'free body', 'fbd',
    'uniform', 'non-uniform', 'rest', 'gravit', 'g =', '9.8',
    'weight', 'normal force', 'tension', 'free fall', 'distance',
    'v = u + at', 's = ut', 'f = ma',
  ],
  energy: [
    'energy', 'kinetic', 'potential', 'work', 'power', 'joule',
    'conservation of energy', 'mechanical energy', 'watt',
    'work done', 'spring', 'elastic', 'gravitational potential',
    'work-energy theorem', 'horsepower', 'efficiency',
  ],
  electricity: [
    'current', 'voltage', 'resistance', 'ohm', 'circuit', 'battery',
    'series', 'parallel', 'ammeter', 'voltmeter', 'conductor',
    'insulator', 'charge', 'coulomb', 'electric field', 'potential difference',
    'v = ir', 'ohm\'s law', 'kirchhoff', 'watt', 'power', 'led', 'bulb',
    'switch', 'fuse', 'short circuit', 'resistor',
  ],
  waves: [
    'wave', 'frequency', 'wavelength', 'amplitude', 'sound', 'light',
    'hertz', 'reflection', 'refraction', 'diffraction', 'interference',
    'transverse', 'longitudinal', 'standing wave', 'node', 'antinode',
    'oscillation', 'vibration', 'period', 'crest', 'trough',
    'speed of sound', 'speed of light', 'electromagnetic',
  ],
  thermodynamics: [
    'temperature', 'heat', 'thermal', 'celsius', 'fahrenheit', 'kelvin',
    'conduction', 'convection', 'radiation', 'specific heat', 'calorie',
    'latent heat', 'melting', 'boiling', 'expansion', 'contraction',
    'thermometer', 'internal energy', 'entropy',
    'isothermal', 'adiabatic', 'isobaric',
  ],
  optics: [
    'mirror', 'lens', 'image', 'object', 'focal', 'concave', 'convex',
    'real image', 'virtual image', 'magnification', 'ray diagram',
    'reflection', 'refraction', 'snell', 'prism', 'spectrum',
    'total internal reflection', 'critical angle',
  ],
};

/**
 * Classify a student message into the most relevant Physics topic.
 * Returns the best-matching topic key, or 'mechanics' as default.
 */
export function classifyPhysicsTopic(message: string): string {
  const lowerMessage = message.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    scores[topic] = 0;
    for (const kw of keywords) {
      if (lowerMessage.includes(kw.toLowerCase())) {
        scores[topic]++;
      }
    }
  }

  let bestTopic = 'mechanics';
  let bestScore = 0;
  for (const [topic, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic;
}

// ============================================
// CONCEPT + HINT BANKS (K-12 appropriate)
// ============================================

export interface PhysicsConceptHint {
  concept: string;
  hints: string[];
}

export const PHYSICS_CONCEPTS: Record<string, PhysicsConceptHint[]> = {
  mechanics: [
    {
      concept: 'Speed vs Velocity',
      hints: [
        'Speed tells you how fast, velocity tells you how fast AND in which direction.',
        'If you run around a circular track and return to start, your speed was positive — what about your displacement?',
        'Speed is always positive; velocity can be negative. When might that happen?',
        'Velocity is a vector: it has magnitude AND direction. Speed is just the magnitude.',
        'Example: A car moves 100 m east then 100 m west. Its speed was constant but its average velocity is zero.',
      ],
    },
    {
      concept: 'Newton\'s Laws of Motion',
      hints: [
        'An object at rest stays at rest unless a force acts on it. What everyday example shows this?',
        'F = ma connects three quantities. If you double the force, what happens to acceleration?',
        'For every action, there is an equal and opposite reaction. When you push a wall, what pushes back?',
        'Draw a free body diagram: list every force acting on the object.',
        'Example: A book on a table — gravity pulls it down, the table pushes it up. These forces balance.',
      ],
    },
    {
      concept: 'Free Fall and Gravity',
      hints: [
        'All objects near Earth accelerate downward at about 9.8 m/s². Why doesn\'t mass matter?',
        'If you drop a ball, after 1 second it\'s moving at ~10 m/s. After 2 seconds?',
        'Gravity acts on everything equally — what makes a feather fall slower than a hammer in air?',
        'Use v = u + gt and s = ut + ½gt² for free fall problems. What are u and g?',
        'Example: Drop a coin from a 5 m balcony. Time to hit ground: t = √(2h/g) ≈ 1 second.',
      ],
    },
  ],
  energy: [
    {
      concept: 'Kinetic and Potential Energy',
      hints: [
        'Kinetic energy is the energy of motion. Faster = more kinetic energy. What does the formula show?',
        'Potential energy is stored energy. A ball held high has gravitational potential energy. Why?',
        'KE = ½mv². If you double the speed, what happens to the kinetic energy?',
        'PE = mgh. Height h is measured from a reference point — you choose where h = 0.',
        'Example: A roller coaster at the top of a hill has max PE. At the bottom, max KE. Energy converts.',
      ],
    },
    {
      concept: 'Conservation of Energy',
      hints: [
        'Energy can\'t be created or destroyed — only changed from one form to another.',
        'When a ball falls, potential energy turns into kinetic energy. Where does the energy go when it bounces?',
        'Total mechanical energy = KE + PE stays constant if there\'s no friction.',
        'If energy seems to "disappear," it often went to heat (friction) or sound.',
        'Example: A pendulum swings: PE → KE → PE. At the highest point, all energy is PE.',
      ],
    },
    {
      concept: 'Work and Power',
      hints: [
        'Work = Force × distance (in the direction of force). No movement = no work.',
        'If you carry a heavy box horizontally, the work done by gravity is zero. Why?',
        'Power is how fast you do work. Same work in less time = more power.',
        'Power = Work / Time = Force × velocity. What are the units?',
        'Example: Lifting a 10 kg weight 2 m: Work = mgh = 10×10×2 = 200 J.',
      ],
    },
  ],
  electricity: [
    {
      concept: 'Current, Voltage, Resistance',
      hints: [
        'Current is the flow of charges — like water flowing through a pipe.',
        'Voltage is the "push" that makes charges move — like water pressure.',
        'Resistance is what opposes the flow — like a narrow pipe restricts water.',
        'Ohm\'s Law: V = IR. If you increase resistance, what happens to current (same voltage)?',
        'Example: A 9V battery, 3Ω resistor → I = V/R = 3A.',
      ],
    },
    {
      concept: 'Series and Parallel Circuits',
      hints: [
        'In series, current is the same through every component. Why?',
        'In parallel, voltage is the same across every branch. Why?',
        'Add resistors in series: total = R1 + R2. In parallel: 1/total = 1/R1 + 1/R2.',
        'If one bulb in a series circuit burns out, what happens to the others?',
        'Example: Two 6Ω resistors in parallel → total = 3Ω. In series → total = 12Ω.',
      ],
    },
  ],
  waves: [
    {
      concept: 'Wave Properties',
      hints: [
        'A wave carries energy without carrying matter. What is actually moving?',
        'Wavelength × frequency = speed (v = fλ). Which changes when a wave enters a new medium?',
        'Amplitude determines loudness (sound) or brightness (light). Frequency determines pitch or color.',
        'Transverse waves: oscillation ⊥ direction. Longitudinal: oscillation ∥ direction. Which is sound?',
        'Example: A guitar string vibrates at 440 Hz. Speed of sound is 340 m/s. λ = 340/440 ≈ 0.77 m.',
      ],
    },
    {
      concept: 'Reflection and Refraction',
      hints: [
        'Reflection: angle of incidence = angle of reflection. Both measured from the normal.',
        'Refraction: light bends when it changes speed (entering a new medium). Toward or away from normal?',
        'Snell\'s Law: n₁ sin θ₁ = n₂ sin θ₂. If light goes from air to glass, which way does it bend?',
        'Total internal reflection happens when light tries to exit a denser medium at too steep an angle.',
        'Example: A straw looks "bent" in a glass of water due to refraction.',
      ],
    },
  ],
  thermodynamics: [
    {
      concept: 'Heat Transfer',
      hints: [
        'Heat always flows from hot to cold. Why can\'t it spontaneously flow the other way?',
        'Conduction: through direct contact (spoon in hot soup). Convection: through fluid movement. Radiation: through electromagnetic waves.',
        'Metals are good conductors. What makes them different from insulators like wood?',
        'Specific heat capacity tells you how much energy it takes to raise 1 kg by 1°C.',
        'Example: Water has a high specific heat — it takes a lot of energy to heat, and cools slowly.',
      ],
    },
    {
      concept: 'Temperature and Thermal Equilibrium',
      hints: [
        'Temperature measures average kinetic energy of particles. Hotter = faster particles.',
        'Thermal equilibrium: two objects reach the same temperature. Which one gained heat?',
        'Absolute zero (0 K = -273°C) is the theoretical minimum — particles almost stop moving.',
        'Why does metal feel colder than wood at the same temperature?',
        'Example: Pour hot water and cold water together. Final temperature is between the two.',
      ],
    },
  ],
  optics: [
    {
      concept: 'Mirrors and Lenses',
      hints: [
        'Concave mirror curves inward — it can focus light to a real image.',
        'Convex mirror curves outward — always virtual, upright, smaller image (car side mirror).',
        'Convex lens converges light (magnifying glass). Concave lens diverges light (myopia correction).',
        'Use 1/f = 1/v + 1/u (mirror equation) and magnification m = -v/u to find image properties.',
        'Example: Object at 2f from a convex lens → image is at 2f on the other side, same size, inverted.',
      ],
    },
  ],
};

// ============================================
// EXTENDED SOCRATIC QUESTIONS BY TOPIC
// ============================================

export const PHYSICS_DEPTH_QUESTIONS: Record<string, string[]> = {
  mechanics: [
    'What forces are acting on this object? Can you draw or list them?',
    'Is the acceleration constant here? How do you know from the problem?',
    'What does the sign of velocity tell us about direction?',
    'If mass doubles but force stays the same, what happens to acceleration?',
    'Can you trace the motion step by step — what happens at each second?',
    'What equation of motion connects the given quantities?',
  ],
  energy: [
    'Is energy being converted from one form to another here? Which forms?',
    'What reference point did you choose for potential energy (h = 0)?',
    'If there\'s friction, where does the "lost" energy go?',
    'At which point in the motion is kinetic energy maximum? Minimum?',
    'Can you set up an energy conservation equation for this situation?',
  ],
  electricity: [
    'Is this circuit series, parallel, or a combination?',
    'What does Ohm\'s Law tell us about the relationship here?',
    'If you add another resistor in parallel, does total resistance go up or down?',
    'Where does the current split, and where does it rejoin?',
    'What would happen if one component in the circuit fails?',
  ],
  waves: [
    'Is this a transverse or longitudinal wave? How can you tell?',
    'What happens to wavelength when a wave enters a denser medium?',
    'Can you identify the relationship between frequency, wavelength, and speed?',
    'Where are the nodes and antinodes in this wave pattern?',
    'What determines the pitch of a sound wave?',
  ],
  thermodynamics: [
    'Is heat entering or leaving the system?',
    'What type of heat transfer is happening — conduction, convection, or radiation?',
    'What would happen to the gas pressure if you decrease the volume?',
    'Does temperature tell us about individual particles or the average?',
    'Why does evaporation cause cooling?',
  ],
  optics: [
    'Is the image real or virtual? How can you tell?',
    'What happens when light goes from a denser to a rarer medium?',
    'Where is the focal point for this mirror or lens?',
    'Can you apply the mirror/lens equation to find the image position?',
    'What type of lens corrects near-sightedness? Far-sightedness?',
  ],
};

/**
 * Build a Physics depth addendum for the system prompt.
 * Injects topic-specific concept hints and questions
 * based on the classified topic and current hint level.
 */
export function buildPhysicsDepthAddendum(
  topic: string,
  hintLevel: number,
): string {
  const concepts = PHYSICS_CONCEPTS[topic];
  const questions = PHYSICS_DEPTH_QUESTIONS[topic];

  let addendum = '';

  if (questions?.length) {
    addendum += `\nPHYSICS DEPTH — TOPIC: ${topic.toUpperCase()}\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${questions.map(q => `- ${q}`).join('\n')}`;
  }

  if (concepts?.length && hintLevel > 0) {
    const hintIdx = Math.min(hintLevel, 5) - 1;
    const lines = concepts.map(c => `- ${c.concept}: ${c.hints[Math.min(hintIdx, c.hints.length - 1)]}`);
    addendum += `\nRELEVANT PHYSICS CONCEPTS (hint level ${hintLevel}/5):\n${lines.join('\n')}`;
  }

  return addendum;
}
