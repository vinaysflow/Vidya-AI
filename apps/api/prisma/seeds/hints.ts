import { PrismaClient, HintType } from '@prisma/client';
import { pathToFileURL } from 'url';

interface HintSeed {
  conceptKey: string;
  hints: Array<{
    level: number;
    content: string;
    type: HintType;
  }>;
}

const HINT_BANK: HintSeed[] = [

  // ═══════════════════════════════════════════════
  // PHYSICS HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'phys_kinematics',
    hints: [
      { level: 1, content: 'Think about what quantities you know and what you need to find. Which kinematic equation connects them?', type: 'CONCEPTUAL' },
      { level: 2, content: 'List the five kinematic variables: s (displacement), u (initial velocity), v (final velocity), a (acceleration), t (time). Identify which three you know.', type: 'PROCEDURAL' },
      { level: 3, content: 'For projectile motion, decompose into independent horizontal (constant velocity) and vertical (constant acceleration g) components.', type: 'PROCEDURAL' },
      { level: 4, content: 'Use: v = u + at, s = ut + ½at², v² = u² + 2as. For projectile: range R = u²sin(2θ)/g, max height H = u²sin²θ/(2g).', type: 'FORMULA' },
      { level: 5, content: 'Example: A ball is thrown at 20 m/s at 30° above horizontal. Horizontal: vₓ = 20cos30° = 17.3 m/s. Vertical: vᵧ = 20sin30° = 10 m/s. Time of flight = 2vᵧ/g = 2s. Range = vₓ × 2 = 34.6m.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'phys_newtons_laws',
    hints: [
      { level: 1, content: 'Start by identifying all the forces acting on the object. What pushes or pulls it?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Draw a Free Body Diagram (FBD). Label every force: weight (mg), normal (N), friction (f), tension (T), applied force (F).', type: 'PROCEDURAL' },
      { level: 3, content: 'Choose a coordinate system aligned with the direction of motion. Write ΣF = ma along each axis separately.', type: 'PROCEDURAL' },
      { level: 4, content: 'Newton\'s 1st: ΣF = 0 → equilibrium. 2nd: ΣF = ma. 3rd: F₁₂ = −F₂₁. For connected bodies, use constraint equations.', type: 'FORMULA' },
      { level: 5, content: 'Example: A 5 kg block on a frictionless incline (30°). Forces: mg sin30° = 24.5N downhill, N = mg cos30° = 42.4N. Acceleration = g sin30° = 4.9 m/s².', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'phys_work_energy',
    hints: [
      { level: 1, content: 'Is energy being transferred? Think about whether a force moves an object through a distance.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Work = Force × displacement × cos(angle between them). Positive work adds energy, negative work removes it.', type: 'PROCEDURAL' },
      { level: 3, content: 'The Work-Energy Theorem says: net work done = change in kinetic energy. This is often easier than using F=ma directly.', type: 'CONCEPTUAL' },
      { level: 4, content: 'W = F·d·cosθ, KE = ½mv², PE_gravity = mgh, PE_spring = ½kx². Work-Energy: W_net = ΔKE.', type: 'FORMULA' },
      { level: 5, content: 'Example: A 2 kg block slides 3m down a 30° frictionless incline. W_gravity = mgh = 2(10)(3sin30°) = 30J. By W-E theorem: ½mv² = 30J → v = √30 = 5.48 m/s.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'phys_electrostatics',
    hints: [
      { level: 1, content: 'Are you dealing with point charges, continuous distributions, or conductors? This determines your approach.', type: 'CONCEPTUAL' },
      { level: 2, content: 'For point charges, use Coulomb\'s law directly. For symmetric distributions, Gauss\'s law is much simpler.', type: 'PROCEDURAL' },
      { level: 3, content: 'Electric potential is a scalar — you can add potentials directly without worrying about directions. Field is the negative gradient of potential.', type: 'CONCEPTUAL' },
      { level: 4, content: 'F = kq₁q₂/r², E = kQ/r², V = kQ/r. Gauss: ∮E·dA = Q_enc/ε₀. Dipole: p = qd.', type: 'FORMULA' },
      { level: 5, content: 'Example: Two charges +2μC and -3μC are 0.1m apart. Force = 9×10⁹ × 2×10⁻⁶ × 3×10⁻⁶ / 0.01 = 5.4N (attractive).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'phys_rotational',
    hints: [
      { level: 1, content: 'Rotational motion mirrors linear motion: force→torque, mass→moment of inertia, velocity→angular velocity.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Identify the axis of rotation first. Then calculate the moment of inertia about that axis (use parallel/perpendicular axis theorems if needed).', type: 'PROCEDURAL' },
      { level: 3, content: 'For rolling without slipping: v_cm = ωR, and total KE = ½mv² + ½Iω². Apply energy conservation or torque equation τ = Iα.', type: 'PROCEDURAL' },
      { level: 4, content: 'τ = r × F = Iα, L = Iω, KE_rot = ½Iω². Parallel axis: I = I_cm + Md². Rolling: a = gsinθ/(1 + I/MR²).', type: 'FORMULA' },
      { level: 5, content: 'Example: Solid sphere rolling down incline. I = 2MR²/5. a = gsinθ/(1 + 2/5) = 5gsinθ/7. Slower than a sliding block (a = gsinθ).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'phys_vectors',
    hints: [
      { level: 1, content: 'Vectors have magnitude and direction; scalars have only magnitude.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Resolve vectors into x and y components before adding them.', type: 'PROCEDURAL' },
      { level: 3, content: 'Draw a simple diagram to show directions and angles.', type: 'PROCEDURAL' },
      { level: 4, content: 'Use: A_x = A cosθ, A_y = A sinθ, and |A| = √(A_x² + A_y²).', type: 'FORMULA' },
      { level: 5, content: 'Example: A 10 N force at 30° has components 8.66 N (x) and 5 N (y).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'phys_motion_graphs',
    hints: [
      { level: 1, content: 'The slope of a position-time graph is velocity.', type: 'CONCEPTUAL' },
      { level: 2, content: 'The slope of a velocity-time graph is acceleration.', type: 'PROCEDURAL' },
      { level: 3, content: 'The area under a velocity-time graph gives displacement.', type: 'PROCEDURAL' },
      { level: 4, content: 'Check units: slope of x-t is m/s, slope of v-t is m/s².', type: 'FORMULA' },
      { level: 5, content: 'Example: A flat v-t line at 5 m/s for 4 s means displacement = 20 m.', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // CHEMISTRY HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'chem_atomic',
    hints: [
      { level: 1, content: 'Which model of the atom is relevant here? Is it about energy levels (Bohr) or electron cloud shapes (quantum)?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Remember the four quantum numbers: n (shell), l (subshell: 0=s, 1=p, 2=d, 3=f), mₗ (orbital), mₛ (spin ±½).', type: 'PROCEDURAL' },
      { level: 3, content: 'Filling order follows aufbau (1s→2s→2p→3s→3p→4s→3d...). Exceptions: Cr is [Ar]3d⁵4s¹, Cu is [Ar]3d¹⁰4s¹ — half/full stability.', type: 'PROCEDURAL' },
      { level: 4, content: 'Bohr energy: Eₙ = -13.6Z²/n² eV. Max electrons in shell: 2n². Subshell capacity: 2(2l+1).', type: 'FORMULA' },
      { level: 5, content: 'Example: Write electron config of Fe (Z=26): [Ar] 3d⁶ 4s². Fe²⁺ loses 4s electrons first: [Ar] 3d⁶. Fe³⁺: [Ar] 3d⁵ (extra stable, half-filled).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'chem_bonding',
    hints: [
      { level: 1, content: 'What type of bond is forming? Consider electronegativity difference: large → ionic, small → covalent.', type: 'CONCEPTUAL' },
      { level: 2, content: 'For molecular geometry, use VSEPR: count bonding pairs (BP) and lone pairs (LP) around the central atom. Shape depends on BP+LP arrangement.', type: 'PROCEDURAL' },
      { level: 3, content: 'Hybridization follows: 2 electron groups → sp, 3 → sp², 4 → sp³, 5 → sp³d, 6 → sp³d². Lone pairs count as electron groups!', type: 'PROCEDURAL' },
      { level: 4, content: 'MOT: Bond order = (bonding e⁻ − antibonding e⁻)/2. If BO = 0, molecule doesn\'t exist. O₂ has BO = 2 and is paramagnetic (unpaired e⁻ in π*).', type: 'FORMULA' },
      { level: 5, content: 'Example: XeF₄. Central Xe: 8 valence e⁻, 4 bonds to F, 2 lone pairs → sp³d² hybridization → square planar geometry.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'chem_equilibrium',
    hints: [
      { level: 1, content: 'Equilibrium means the forward and reverse rates are equal — not that concentrations are equal.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Use an ICE table (Initial, Change, Equilibrium) to organize your calculations. Define x as the change.', type: 'PROCEDURAL' },
      { level: 3, content: 'Le Chatelier: adding reactant → shifts right, removing product → shifts right, increasing temperature shifts toward endothermic direction.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Kc = [products]^coeff / [reactants]^coeff. Kp = Kc(RT)^Δn. For weak acids: Ka = [H⁺][A⁻]/[HA]. pH = -log[H⁺].', type: 'FORMULA' },
      { level: 5, content: 'Example: CH₃COOH (0.1M, Ka=1.8×10⁻⁵). Ka = x²/(0.1−x) ≈ x²/0.1 → x = 1.34×10⁻³ → pH = 2.87.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'chem_organic_basics',
    hints: [
      { level: 1, content: 'First identify the functional group(s) present. The functional group determines the reactivity.', type: 'CONCEPTUAL' },
      { level: 2, content: 'For IUPAC naming: find the longest chain containing the principal functional group, number from the end giving the lowest locant to it.', type: 'PROCEDURAL' },
      { level: 3, content: 'Electronic effects matter: +I groups (alkyl) donate electrons inductively. -I groups (halogens, -NO₂) withdraw. Resonance (+M/-M) is stronger than inductive.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Reaction intermediates stability: carbocations (3° > 2° > 1°), carbanions (1° > 2° > 3°), free radicals (3° > 2° > 1°). Resonance stabilization overrides.', type: 'FORMULA' },
      { level: 5, content: 'Example: Why is phenol more acidic than ethanol? Phenoxide ion is stabilized by resonance (charge delocalized into the ring). Ethoxide has no such stabilization.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'chem_redox',
    hints: [
      { level: 1, content: 'In any electrochemical problem, first identify what is being oxidized (loses e⁻) and what is being reduced (gains e⁻).', type: 'CONCEPTUAL' },
      { level: 2, content: 'In a galvanic cell: oxidation at anode (−), reduction at cathode (+). Cell notation: anode | electrolyte || electrolyte | cathode.', type: 'PROCEDURAL' },
      { level: 3, content: 'Standard cell potential: E°cell = E°cathode − E°anode. Positive E°cell means the reaction is spontaneous (ΔG < 0).', type: 'CONCEPTUAL' },
      { level: 4, content: 'Nernst: E = E° − (RT/nF)lnQ = E° − (0.059/n)logQ at 25°C. ΔG° = −nFE°. Faraday: m = (M×I×t)/(n×F).', type: 'FORMULA' },
      { level: 5, content: 'Example: Zn-Cu cell. Zn → Zn²⁺ + 2e⁻ (E°=-0.76V, anode). Cu²⁺ + 2e⁻ → Cu (E°=+0.34V, cathode). E°cell = 0.34−(−0.76) = 1.10V.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'chem_mole_concept',
    hints: [
      { level: 1, content: 'A mole is a counting unit, like a dozen, but much larger.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Use molar mass to convert between grams and moles.', type: 'PROCEDURAL' },
      { level: 3, content: 'Use Avogadro\'s number to convert moles to particles.', type: 'PROCEDURAL' },
      { level: 4, content: 'n = mass / molar mass; particles = n × 6.022×10^23.', type: 'FORMULA' },
      { level: 5, content: 'Example: 18 g of water = 1 mole = 6.022×10^23 molecules.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'chem_stoichiometry',
    hints: [
      { level: 1, content: 'Balance the chemical equation before doing any math.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Convert given quantities to moles to compare reactants.', type: 'PROCEDURAL' },
      { level: 3, content: 'Identify the limiting reagent — it runs out first.', type: 'PROCEDURAL' },
      { level: 4, content: 'Use mole ratios from coefficients to find theoretical yield.', type: 'FORMULA' },
      { level: 5, content: 'Example: If 1 mol A reacts with 2 mol B, you need double B for complete reaction.', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // MATHEMATICS HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'math_quadratic',
    hints: [
      { level: 1, content: 'What form is the equation in? Standard form ax² + bx + c = 0 is needed for the quadratic formula.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Check the discriminant D = b² − 4ac first. D > 0 → two real roots, D = 0 → one repeated root, D < 0 → no real roots.', type: 'PROCEDURAL' },
      { level: 3, content: 'Vieta\'s formulas connect roots (α, β) to coefficients: α + β = −b/a, αβ = c/a. Useful for finding expressions without solving.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Roots: x = (−b ± √D)/2a. For location of roots: use sign of f(k), f(a)·f(b) < 0 means root between a and b.', type: 'FORMULA' },
      { level: 5, content: 'Example: Find k if x² − 5x + k = 0 has roots whose difference is 3. (α−β)² = (α+β)² − 4αβ → 9 = 25 − 4k → k = 4.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'math_limits',
    hints: [
      { level: 1, content: 'What happens when you directly substitute? If you get a number, that\'s the limit. If 0/0 or ∞/∞, you need a technique.', type: 'CONCEPTUAL' },
      { level: 2, content: 'For 0/0 forms: try factoring, rationalizing (multiply by conjugate), or standard limits (sinx/x → 1, (eˣ−1)/x → 1).', type: 'PROCEDURAL' },
      { level: 3, content: 'L\'Hôpital\'s Rule: if lim f/g gives 0/0 or ∞/∞, then lim f/g = lim f\'/g\' (differentiate top and bottom separately).', type: 'PROCEDURAL' },
      { level: 4, content: 'Standard limits: lim(x→0) sinx/x = 1, lim(x→0) (1+x)^(1/x) = e, lim(x→∞) (1+1/n)ⁿ = e, lim(x→0) tanx/x = 1.', type: 'FORMULA' },
      { level: 5, content: 'Example: lim(x→0) (eˣ − 1 − x)/x². This is 0/0. Apply L\'Hôpital twice: → (eˣ − 1)/2x → eˣ/2 = 1/2.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'math_derivatives',
    hints: [
      { level: 1, content: 'Identify what kind of function you\'re differentiating: polynomial, trigonometric, exponential, composite, or implicit?', type: 'CONCEPTUAL' },
      { level: 2, content: 'For composite functions, use the chain rule: d/dx[f(g(x))] = f\'(g(x)) · g\'(x). Work from outside in.', type: 'PROCEDURAL' },
      { level: 3, content: 'For products: (fg)\' = f\'g + fg\'. For quotients: (f/g)\' = (f\'g − fg\')/g². For parametric: dy/dx = (dy/dt)/(dx/dt).', type: 'PROCEDURAL' },
      { level: 4, content: 'd/dx[xⁿ] = nxⁿ⁻¹, d/dx[eˣ] = eˣ, d/dx[ln x] = 1/x, d/dx[sinx] = cosx, d/dx[cosx] = −sinx.', type: 'FORMULA' },
      { level: 5, content: 'Example: y = e^(sin²x). Chain rule: dy/dx = e^(sin²x) · 2sinx · cosx = e^(sin²x) · sin(2x).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'math_integrals',
    hints: [
      { level: 1, content: 'Look at the integrand\'s structure. Does it suggest substitution, partial fractions, or integration by parts?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Substitution works when you see f(g(x))·g\'(x). Let u = g(x), then du = g\'(x)dx and integrate f(u)du.', type: 'PROCEDURAL' },
      { level: 3, content: 'Integration by parts: ∫u dv = uv − ∫v du. Choose u using LIATE order: Logarithmic → Inverse trig → Algebraic → Trig → Exponential.', type: 'PROCEDURAL' },
      { level: 4, content: 'Standard: ∫xⁿ dx = xⁿ⁺¹/(n+1), ∫eˣ dx = eˣ, ∫1/x dx = ln|x|, ∫sinx dx = −cosx. Partial fractions for rational functions.', type: 'FORMULA' },
      { level: 5, content: 'Example: ∫x·eˣ dx. By parts: u=x, dv=eˣdx → du=dx, v=eˣ. Result: xeˣ − ∫eˣdx = xeˣ − eˣ + C = eˣ(x−1) + C.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'math_probability',
    hints: [
      { level: 1, content: 'Clarify: are events independent or dependent? Is order important? This determines whether to multiply, add, or use Bayes.', type: 'CONCEPTUAL' },
      { level: 2, content: 'P(A∪B) = P(A) + P(B) − P(A∩B). For independent events: P(A∩B) = P(A)·P(B).', type: 'PROCEDURAL' },
      { level: 3, content: 'Bayes theorem: P(A|B) = P(B|A)·P(A)/P(B). Use the total probability theorem to compute P(B) if needed.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Binomial: P(X=r) = ⁿCᵣ pʳ qⁿ⁻ʳ, E(X)=np, Var=npq. Conditional: P(A|B) = P(A∩B)/P(B).', type: 'FORMULA' },
      { level: 5, content: 'Example: A bag has 4 red and 6 blue balls. Two drawn without replacement. P(both red) = (4/10)(3/9) = 12/90 = 2/15.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'math_functions',
    hints: [
      { level: 1, content: 'A function assigns each input exactly one output.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Identify the domain (allowed inputs) and range (possible outputs).', type: 'PROCEDURAL' },
      { level: 3, content: 'Use graph transformations: shift, stretch, reflect.', type: 'PROCEDURAL' },
      { level: 4, content: 'Inverse functions swap x and y; check one-to-one before inverting.', type: 'FORMULA' },
      { level: 5, content: 'Example: f(x)=2x+3 has inverse f^{-1}(y)=(y-3)/2.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'math_polynomials',
    hints: [
      { level: 1, content: 'Polynomials are sums of powers of x with constant coefficients.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Use factor theorem: if f(a)=0, then (x-a) is a factor.', type: 'PROCEDURAL' },
      { level: 3, content: 'Degree tells you max number of roots and end behavior.', type: 'PROCEDURAL' },
      { level: 4, content: 'Remainder theorem: f(a) is the remainder when dividing by (x-a).', type: 'FORMULA' },
      { level: 5, content: 'Example: f(x)=x^2-5x+6 factors to (x-2)(x-3).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'math_linear_inequalities',
    hints: [
      { level: 1, content: 'Solve inequalities like equations, but watch the sign.', type: 'CONCEPTUAL' },
      { level: 2, content: 'When you multiply or divide by a negative, flip the inequality.', type: 'PROCEDURAL' },
      { level: 3, content: 'Graph solutions on a number line to visualize intervals.', type: 'PROCEDURAL' },
      { level: 4, content: 'Use interval notation: (-∞, 3] or (2, 5).', type: 'FORMULA' },
      { level: 5, content: 'Example: 2x + 1 < 5 → x < 2.', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // BIOLOGY HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'bio_cell',
    hints: [
      { level: 1, content: 'Think about what makes this organelle unique. What is its function in the cell\'s "factory"?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Compare: prokaryotic cells lack membrane-bound organelles (no nucleus, no mitochondria). Eukaryotic cells have compartmentalization.', type: 'PROCEDURAL' },
      { level: 3, content: 'The cell membrane is a phospholipid bilayer with embedded proteins (fluid mosaic model). It controls what enters and exits.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Key organelles: Nucleus (DNA), Mitochondria (ATP, own DNA), ER (rough=ribosomes, smooth=lipids), Golgi (packaging), Lysosomes (digestion).', type: 'FORMULA' },
      { level: 5, content: 'Example: Why do muscle cells have more mitochondria than skin cells? Muscles need more ATP for contraction → more mitochondria for oxidative phosphorylation.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'bio_mendelian',
    hints: [
      { level: 1, content: 'Start by identifying the genotypes of the parents. Use a Punnett square to find offspring ratios.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Monohybrid (Aa × Aa): 3:1 phenotypic ratio, 1:2:1 genotypic ratio. Dihybrid (AaBb × AaBb): 9:3:3:1 ratio.', type: 'PROCEDURAL' },
      { level: 3, content: 'Exceptions to simple dominance: incomplete dominance (blending), codominance (both expressed), multiple alleles (ABO blood groups).', type: 'CONCEPTUAL' },
      { level: 4, content: 'Law of Segregation: alleles separate in gamete formation. Law of Independent Assortment: genes on different chromosomes sort independently.', type: 'FORMULA' },
      { level: 5, content: 'Example: ABO blood groups. Iᴬ and Iᴮ are codominant, both dominant over i. Genotypes: Iᴬi or IᴬIᴬ → Type A. IᴬIᴮ → Type AB.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'bio_molecular',
    hints: [
      { level: 1, content: 'The central dogma: DNA → (transcription) → mRNA → (translation) → Protein. Which step is the question about?', type: 'CONCEPTUAL' },
      { level: 2, content: 'DNA replication is semi-conservative (Meselson-Stahl experiment). Each new DNA has one old strand and one new strand.', type: 'PROCEDURAL' },
      { level: 3, content: 'Transcription: RNA polymerase reads template strand 3\'→5\', synthesizes mRNA 5\'→3\'. In eukaryotes: mRNA is processed (capping, tailing, splicing).', type: 'PROCEDURAL' },
      { level: 4, content: 'Genetic code: 64 codons, 61 code for amino acids, 3 stop codons (UAA, UAG, UGA). AUG = start codon (methionine). Code is degenerate but unambiguous.', type: 'FORMULA' },
      { level: 5, content: 'Example: DNA template: 3\'-TACGGCAATCCC-5\' → mRNA: 5\'-AUGCCGUUAGGG-3\' → Protein: Met-Pro-Leu-Gly.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'bio_photosynthesis',
    hints: [
      { level: 1, content: 'Photosynthesis has two stages: light-dependent reactions (thylakoid) and light-independent reactions (stroma/Calvin cycle).', type: 'CONCEPTUAL' },
      { level: 2, content: 'Light reactions: H₂O is split (photolysis), electrons flow through PS II → cytochrome b6f → PS I. Produces ATP and NADPH.', type: 'PROCEDURAL' },
      { level: 3, content: 'Calvin cycle: CO₂ fixation by RuBisCO → 3-PGA → G3P (uses ATP and NADPH). 3 CO₂ → 1 G3P (net). 6 turns → 1 glucose.', type: 'PROCEDURAL' },
      { level: 4, content: '6CO₂ + 12H₂O → C₆H₁₂O₆ + 6O₂ + 6H₂O. C3 plants: only Calvin. C4: Hatch-Slack (PEP carboxylase). CAM: temporal separation.', type: 'FORMULA' },
      { level: 5, content: 'Example: Why are C4 plants more efficient in hot/dry climates? PEP carboxylase has higher CO₂ affinity than RuBisCO and doesn\'t do photorespiration.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'bio_plant_transport',
    hints: [
      { level: 1, content: 'Water moves up xylem; sugars move in phloem.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Transpiration pull drives water upward from roots to leaves.', type: 'PROCEDURAL' },
      { level: 3, content: 'Cohesion and adhesion keep the water column intact.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Phloem transport uses pressure flow from source to sink.', type: 'FORMULA' },
      { level: 5, content: 'Example: Stomata opening increases transpiration and water uptake.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'bio_homeostasis',
    hints: [
      { level: 1, content: 'Homeostasis keeps internal conditions stable.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Most systems use negative feedback to return to a set point.', type: 'PROCEDURAL' },
      { level: 3, content: 'Identify sensor, control center, and effector in the loop.', type: 'PROCEDURAL' },
      { level: 4, content: 'Body temperature and blood glucose are classic examples.', type: 'FORMULA' },
      { level: 5, content: 'Example: Sweating cools the body when temperature rises.', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // CODING HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'code_arrays',
    hints: [
      { level: 1, content: 'What operation do you need? Accessing elements, searching, sorting, or transforming the array?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Arrays are zero-indexed: first element is arr[0], last is arr[arr.length - 1]. Out-of-bounds access is a common bug.', type: 'PROCEDURAL' },
      { level: 3, content: 'Use map() to transform each element, filter() to select elements meeting a condition, reduce() to accumulate a single result.', type: 'PROCEDURAL' },
      { level: 4, content: 'Access: O(1). Search (unsorted): O(n). Search (sorted, binary): O(log n). Insert/delete at end: O(1). Insert/delete at middle: O(n).', type: 'FORMULA' },
      { level: 5, content: 'Example: Find sum of even numbers. [1,2,3,4,5].filter(x => x%2===0).reduce((sum,x) => sum+x, 0) → 6.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_recursion',
    hints: [
      { level: 1, content: 'Every recursive function needs two things: a base case (when to stop) and a recursive case (how to break the problem down).', type: 'CONCEPTUAL' },
      { level: 2, content: 'Trace through with a small input. Draw the call stack. Each call adds a frame; when it returns, the frame is popped.', type: 'PROCEDURAL' },
      { level: 3, content: 'If you see repeated subproblems, add memoization (cache results). This turns exponential recursion into polynomial time.', type: 'CONCEPTUAL' },
      { level: 4, content: 'factorial(n) = n * factorial(n-1), base: factorial(0) = 1. fib(n) = fib(n-1) + fib(n-2), base: fib(0)=0, fib(1)=1.', type: 'FORMULA' },
      { level: 5, content: 'Example: fibonacci with memo. memo = {}; function fib(n) { if (n<=1) return n; if (memo[n]) return memo[n]; return memo[n] = fib(n-1)+fib(n-2); }', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_sorting',
    hints: [
      { level: 1, content: 'Consider the size of your data and whether it\'s nearly sorted. Different algorithms have different strengths.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Simple sorts (bubble, insertion, selection) are O(n²) but easy to implement. Insertion sort is great for nearly-sorted data.', type: 'PROCEDURAL' },
      { level: 3, content: 'Merge sort: divide array in half, recursively sort each half, merge. Always O(n log n) but uses O(n) extra space.', type: 'PROCEDURAL' },
      { level: 4, content: 'Quicksort: pick pivot, partition around it, recurse. Average O(n log n), worst O(n²). Best pivot: median of three.', type: 'FORMULA' },
      { level: 5, content: 'Example: Merge sort [38, 27, 43, 3]. Split: [38,27] [43,3]. Sort each: [27,38] [3,43]. Merge: compare fronts → [3,27,38,43].', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_two_pointers',
    hints: [
      { level: 1, content: 'Two pointers often work when the data is sorted or you need to scan from both ends.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Move left or right pointer based on whether your condition is too small or too large.', type: 'PROCEDURAL' },
      { level: 3, content: 'Each pointer moves at most n times, making it O(n).', type: 'PROCEDURAL' },
      { level: 4, content: 'Common use cases: pair sums, removing duplicates, and partitioning arrays.', type: 'FORMULA' },
      { level: 5, content: 'Example: Sorted array, target sum. Start left/right, move the pointer that brings sum closer to target.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_sliding_window',
    hints: [
      { level: 1, content: 'Sliding window keeps a running window instead of re-checking all elements.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Expand the window to include more elements; shrink to restore a condition.', type: 'PROCEDURAL' },
      { level: 3, content: 'Track window state (sum, counts) and update in O(1).', type: 'PROCEDURAL' },
      { level: 4, content: 'Best for longest/shortest subarray problems with a constraint.', type: 'FORMULA' },
      { level: 5, content: 'Example: Longest substring without repeats: move right pointer, shrink from left when repeat appears.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_prefix_sums',
    hints: [
      { level: 1, content: 'Prefix sums store cumulative totals to answer range queries quickly.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Build prefix[i] = prefix[i-1] + arr[i].', type: 'PROCEDURAL' },
      { level: 3, content: 'Range sum l..r = prefix[r] - prefix[l-1].', type: 'PROCEDURAL' },
      { level: 4, content: 'Great for multiple range queries or finding subarray sums.', type: 'FORMULA' },
      { level: 5, content: 'Example: If prefix[4]=10 and prefix[1]=3, sum[2..4]=7.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_dp',
    hints: [
      { level: 1, content: 'Can the problem be broken into overlapping subproblems with optimal substructure? If yes, DP applies.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Define the state: what variables describe a subproblem? Define the transition: how does a solution depend on smaller subproblems?', type: 'PROCEDURAL' },
      { level: 3, content: 'Start with brute-force recursion, then add memoization (top-down). Or build a table bottom-up. Both give the same result.', type: 'PROCEDURAL' },
      { level: 4, content: 'Patterns: 1D DP (climbing stairs), 2D DP (grid paths, LCS), knapsack (include/exclude), interval DP (matrix chain).', type: 'FORMULA' },
      { level: 5, content: 'Example: Coin change. coins=[1,3,4], amount=6. dp[0]=0. dp[i] = min(dp[i-1], dp[i-3], dp[i-4]) + 1. dp[6] = 2 (two 3s).', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // AI LEARNING HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'ai_classification',
    hints: [
      { level: 1, content: 'Classification predicts a category (class label). Think: is the output a category or a number? Category → classification.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Use a confusion matrix to evaluate: True Positives, False Positives, True Negatives, False Negatives. From these, compute precision and recall.', type: 'PROCEDURAL' },
      { level: 3, content: 'Decision trees split data based on feature thresholds. At each node, choose the split that maximizes information gain (reduces entropy).', type: 'CONCEPTUAL' },
      { level: 4, content: 'Accuracy = (TP+TN)/(TP+TN+FP+FN). Precision = TP/(TP+FP). Recall = TP/(TP+FN). F1 = 2·P·R/(P+R).', type: 'FORMULA' },
      { level: 5, content: 'Example: Email spam filter. Features: word frequency, sender reputation. Train on labeled emails. Precision matters (don\'t flag good emails). Recall matters (don\'t miss spam).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_embeddings',
    hints: [
      { level: 1, content: 'Embeddings turn items (words, images) into vectors of numbers.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Similar items have vectors close to each other in space.', type: 'PROCEDURAL' },
      { level: 3, content: 'You can measure similarity with cosine similarity or dot product.', type: 'PROCEDURAL' },
      { level: 4, content: 'Embeddings enable search: query vector → nearest neighbors.', type: 'FORMULA' },
      { level: 5, content: 'Example: "king" and "queen" end up close in vector space.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_neural_nets',
    hints: [
      { level: 1, content: 'A neural network is layers of "neurons" that transform inputs through weighted sums and activation functions.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Forward pass: input → multiply by weights → add bias → apply activation → pass to next layer → final output.', type: 'PROCEDURAL' },
      { level: 3, content: 'Backpropagation: compute loss, then use the chain rule to find how each weight contributed to the error. Update weights to reduce loss.', type: 'CONCEPTUAL' },
      { level: 4, content: 'ReLU: f(x) = max(0, x). Sigmoid: f(x) = 1/(1+e⁻ˣ). Softmax: converts logits to probabilities. Loss: cross-entropy for classification, MSE for regression.', type: 'FORMULA' },
      { level: 5, content: 'Example: XOR problem. Single perceptron can\'t solve it (not linearly separable). Add a hidden layer with 2 neurons → network can learn XOR.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_transformers',
    hints: [
      { level: 1, content: 'Transformers process all tokens in parallel (unlike RNNs). The key innovation is the self-attention mechanism.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Self-attention: each token computes Query, Key, Value vectors. Attention score = softmax(QKᵀ/√d). Output = weighted sum of Values.', type: 'PROCEDURAL' },
      { level: 3, content: 'BERT = encoder-only (bidirectional, good for understanding). GPT = decoder-only (autoregressive, good for generation). T5 = encoder-decoder (good for translation).', type: 'CONCEPTUAL' },
      { level: 4, content: 'Attention(Q,K,V) = softmax(QKᵀ/√dₖ)V. Multi-head: run attention h times with different projections, concatenate. Positional encoding adds sequence info.', type: 'FORMULA' },
      { level: 5, content: 'Example: "The cat sat on the mat". Self-attention lets "sat" attend strongly to "cat" (subject) and "mat" (location), capturing long-range dependencies without recurrence.', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // ECONOMICS HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'econ_demand_supply',
    hints: [
      { level: 1, content: 'Is the question about a shift OF the curve or a movement ALONG the curve? Price changes → movement. Other factors → shift.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Demand shifters: income, tastes, prices of related goods, expectations, number of buyers. Supply shifters: input prices, technology, taxes, number of sellers.', type: 'PROCEDURAL' },
      { level: 3, content: 'Elasticity measures responsiveness. Price elasticity of demand = % change in Qd / % change in P. |Ed| > 1 → elastic, < 1 → inelastic.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Equilibrium: Qd = Qs. Consumer surplus = area above price, below demand. Producer surplus = area below price, above supply.', type: 'FORMULA' },
      { level: 5, content: 'Example: If Qd = 100 - 2P and Qs = 20 + 3P, equilibrium: 100-2P = 20+3P → 5P = 80 → P = 16, Q = 68.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'econ_national_income',
    hints: [
      { level: 1, content: 'GDP measures the total value of all final goods and services produced within a country\'s borders in a year.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Three methods give the same GDP: expenditure (C+I+G+NX), income (wages+rent+interest+profit), and value-added (sum of value added at each stage).', type: 'PROCEDURAL' },
      { level: 3, content: 'Real GDP removes inflation effects (uses base year prices). Nominal GDP uses current prices. GDP deflator = (Nominal/Real) × 100.', type: 'CONCEPTUAL' },
      { level: 4, content: 'GDP_mp = C + I + G + (X−M). NNP = GNP − Depreciation. NI = NNP at factor cost. Per capita income = NI / Population.', type: 'FORMULA' },
      { level: 5, content: 'Example: C=500, I=150, G=200, X=100, M=80. GDP = 500+150+200+(100-80) = 870 crore. If depreciation=50, NDP = 820.', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // EXPANDED CODING HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'code_hashmaps',
    hints: [
      { level: 1, content: 'A hash map stores key-value pairs. Think: do I need to look something up quickly, count occurrences, or check membership?', type: 'CONCEPTUAL' },
      { level: 2, content: 'A hash function converts the key to an index. Good hash functions distribute keys evenly. Collisions happen when two keys hash to the same index.', type: 'PROCEDURAL' },
      { level: 3, content: 'Common patterns: frequency counter (count[char]++), two-sum (store complement), grouping (anagrams by sorted key), deduplication (set).', type: 'PROCEDURAL' },
      { level: 4, content: 'Average: insert O(1), lookup O(1), delete O(1). Worst case (all collisions): O(n). Load factor = n/buckets. Resize when load > 0.75.', type: 'FORMULA' },
      { level: 5, content: 'Example: Two Sum — find indices i,j where nums[i]+nums[j]=target. Iterate: for each num, check if (target-num) is in map. If yes, return. Else, map[num]=index. O(n) time.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_trees',
    hints: [
      { level: 1, content: 'Trees are hierarchical. Every node has at most one parent. The root has no parent. Leaves have no children.', type: 'CONCEPTUAL' },
      { level: 2, content: 'For BST: left child < parent < right child. This invariant enables O(log n) search if the tree is balanced.', type: 'PROCEDURAL' },
      { level: 3, content: 'Traversal order matters: Inorder (L-Root-R) gives sorted BST. Preorder (Root-L-R) for serialization. Level-order (BFS with queue) for breadth-first.', type: 'PROCEDURAL' },
      { level: 4, content: 'Height of balanced BST: O(log n). BST search/insert/delete: O(h) where h=height. Unbalanced degenerates to O(n). AVL/Red-Black keep h = O(log n).', type: 'FORMULA' },
      { level: 5, content: 'Example: Check if BST is valid. Use inorder traversal — result must be strictly increasing. Or pass (min, max) bounds recursively: isValid(node, -∞, +∞).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_graph_algos',
    hints: [
      { level: 1, content: 'First ask: is the graph directed or undirected? Weighted or unweighted? This determines which algorithm applies.', type: 'CONCEPTUAL' },
      { level: 2, content: 'BFS explores level by level (queue) — gives shortest path in unweighted graphs. DFS goes deep first (stack/recursion) — good for connected components, cycle detection.', type: 'PROCEDURAL' },
      { level: 3, content: 'For shortest path: unweighted → BFS. Non-negative weights → Dijkstra. Negative weights → Bellman-Ford. All pairs → Floyd-Warshall.', type: 'PROCEDURAL' },
      { level: 4, content: 'BFS: O(V+E). Dijkstra with min-heap: O((V+E) log V). Bellman-Ford: O(V·E). Topological sort: O(V+E). MST (Kruskal): O(E log E).', type: 'FORMULA' },
      { level: 5, content: 'Example: Detect cycle in directed graph using DFS. Maintain 3 states: white (unvisited), gray (in stack), black (done). If DFS reaches a gray node, there\'s a cycle.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_backtracking',
    hints: [
      { level: 1, content: 'Backtracking = DFS on a decision tree. At each step, make a choice, recurse, then undo the choice (backtrack).', type: 'CONCEPTUAL' },
      { level: 2, content: 'Template: choose → explore → unchoose. The key optimization is pruning: if the current path can\'t lead to a solution, stop early.', type: 'PROCEDURAL' },
      { level: 3, content: 'For permutations: swap elements and recurse. For subsets: include/exclude each element. For combinations: iterate from current index forward.', type: 'PROCEDURAL' },
      { level: 4, content: 'Permutations: O(n!). Subsets: O(2^n). N-Queens: O(n!) worst case but pruning makes it much faster in practice.', type: 'FORMULA' },
      { level: 5, content: 'Example: N-Queens. Place queen row by row. For each row, try each column. Check if safe (no queen in same column, or either diagonal). If safe, recurse to next row. If stuck, backtrack.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_bit_manipulation',
    hints: [
      { level: 1, content: 'Bit manipulation operates directly on binary representations. It\'s fast (single CPU instruction) and memory-efficient.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Key operations: n & 1 (check last bit), n >> 1 (divide by 2), n << 1 (multiply by 2), n & (n-1) (clear lowest set bit).', type: 'PROCEDURAL' },
      { level: 3, content: 'XOR tricks: a ^ a = 0, a ^ 0 = a. Find the single unique number in an array where all others appear twice: XOR all elements.', type: 'PROCEDURAL' },
      { level: 4, content: 'Check power of 2: n > 0 && (n & (n-1)) === 0. Count set bits: while(n) { count++; n &= (n-1); }. Swap without temp: a^=b; b^=a; a^=b.', type: 'FORMULA' },
      { level: 5, content: 'Example: Find two unique numbers in array where all others appear twice. XOR all → gets xor of the two unique nums. Find a set bit (they differ there). Partition array by that bit and XOR each group.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_complexity',
    hints: [
      { level: 1, content: 'Big O describes how runtime/space grows as input size n grows. Focus on the dominant term and drop constants.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Common complexities ranked: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2^n) < O(n!). Most interview solutions should be O(n) or O(n log n).', type: 'PROCEDURAL' },
      { level: 3, content: 'Nested loops usually multiply: one loop O(n), two nested O(n²). But watch for early breaks or shrinking ranges. Binary search halving → O(log n).', type: 'PROCEDURAL' },
      { level: 4, content: 'Amortized: dynamic array doubling is O(1) amortized per append. Master theorem: T(n) = aT(n/b) + O(n^d). If d > log_b(a) → O(n^d). If d = → O(n^d log n). If d < → O(n^(log_b a)).', type: 'FORMULA' },
      { level: 5, content: 'Example: for(i=0;i<n;i++) for(j=i;j<n;j++) → n+(n-1)+...+1 = n(n+1)/2 = O(n²). But for(i=1;i<n;i*=2) → O(log n) iterations.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_string_algos',
    hints: [
      { level: 1, content: 'String problems often reduce to: pattern matching, palindrome detection, anagram grouping, or substring search. Identify which category.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Brute force string matching is O(n*m). KMP precomputes a failure function to skip characters, achieving O(n+m).', type: 'PROCEDURAL' },
      { level: 3, content: 'Rabin-Karp uses rolling hash: compute hash of window, slide and update in O(1). Hash collision → verify character by character. Average O(n+m).', type: 'PROCEDURAL' },
      { level: 4, content: 'KMP failure function: f[0]=0; for i=1..m-1, follow back-pointers until match or 0. Longest palindromic substring: expand around center O(n²) or Manacher O(n).', type: 'FORMULA' },
      { level: 5, content: 'Example: Check if s2 is a rotation of s1. Trick: s2 is a rotation of s1 iff s2 is a substring of s1+s1. "waterbottle" is rotation of "erbottlewat" because it appears in "erbottlewaterbottlewat".', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_design_patterns',
    hints: [
      { level: 1, content: 'Design patterns are reusable solutions to common problems. They\'re not code you copy — they\'re templates for thinking about structure.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Three categories: Creational (how objects are made — Factory, Singleton, Builder), Structural (how objects compose — Adapter, Decorator), Behavioral (how objects communicate — Observer, Strategy).', type: 'PROCEDURAL' },
      { level: 3, content: 'SOLID principles: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. These guide when to apply patterns.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Observer: subject.notify() calls update() on all subscribers. Strategy: pass algorithm as parameter (function/class). Factory: create objects without specifying exact class.', type: 'FORMULA' },
      { level: 5, content: 'Example: Strategy pattern for sorting. Instead of hardcoding comparisons, pass a comparator: sort(arr, (a,b) => a.price - b.price). Same sort function, different strategies.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_react',
    hints: [
      { level: 1, content: 'React components are functions that return JSX (HTML-like syntax). They re-render when their state or props change.', type: 'CONCEPTUAL' },
      { level: 2, content: 'useState for local state: const [count, setCount] = useState(0). useEffect for side effects (API calls, subscriptions). Include cleanup in return function.', type: 'PROCEDURAL' },
      { level: 3, content: 'Data flows down (props), events flow up (callback props). If siblings need shared state, lift it to their common parent.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Key rules: never mutate state directly (use spread: {...obj, key: newVal}). Always provide key prop in lists. useEffect dependency array controls when it re-runs.', type: 'FORMULA' },
      { level: 5, content: 'Example: Counter. function Counter() { const [n, setN] = useState(0); return <button onClick={() => setN(n+1)}>Clicked {n} times</button>; }', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_react_advanced',
    hints: [
      { level: 1, content: 'When prop drilling gets deep (3+ levels), consider Context API or a state library like Zustand.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Custom hooks extract reusable logic: function useDebounce(value, delay) { ... }. Hooks must start with "use" and can only be called at the top level.', type: 'PROCEDURAL' },
      { level: 3, content: 'Performance: React.memo prevents re-render if props haven\'t changed. useMemo caches computed values. useCallback caches functions. Only optimize when profiler shows a bottleneck.', type: 'PROCEDURAL' },
      { level: 4, content: 'useReducer for complex state: const [state, dispatch] = useReducer(reducer, init). reducer(state, action) returns new state. Good when next state depends on previous.', type: 'FORMULA' },
      { level: 5, content: 'Example: Context. const ThemeCtx = createContext("light"); function App() { return <ThemeCtx.Provider value="dark"><Child/></ThemeCtx.Provider>; } In Child: const theme = useContext(ThemeCtx);', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_rest_apis',
    hints: [
      { level: 1, content: 'REST treats everything as a resource with a URL. Use HTTP methods to perform actions: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove).', type: 'CONCEPTUAL' },
      { level: 2, content: 'Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error. Always return appropriate codes.', type: 'PROCEDURAL' },
      { level: 3, content: 'Request body (JSON) carries data for POST/PUT/PATCH. Query params (?page=2&limit=10) for filtering/pagination. Path params (/users/:id) for resource identification.', type: 'PROCEDURAL' },
      { level: 4, content: 'JWT auth: client sends Authorization: Bearer <token>. Server verifies signature, extracts user ID. Token has header.payload.signature, base64 encoded.', type: 'FORMULA' },
      { level: 5, content: 'Example: GET /api/users → list all. POST /api/users {name:"Ada"} → create, return 201. GET /api/users/123 → one user. DELETE /api/users/123 → remove, return 204.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_sql',
    hints: [
      { level: 1, content: 'SQL is declarative: you say WHAT data you want, not HOW to get it. Think in terms of sets of rows.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Execution order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. This explains why you can\'t use aliases in WHERE.', type: 'PROCEDURAL' },
      { level: 3, content: 'JOINs combine tables. INNER: only matching rows. LEFT: all from left + matching right (NULLs if no match). Use foreign keys to define relationships.', type: 'PROCEDURAL' },
      { level: 4, content: 'Normalization: 1NF (atomic values), 2NF (no partial dependencies), 3NF (no transitive dependencies). Index speeds up WHERE/JOIN but slows INSERT/UPDATE.', type: 'FORMULA' },
      { level: 5, content: 'Example: SELECT u.name, COUNT(o.id) AS order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.name HAVING COUNT(o.id) > 5 ORDER BY order_count DESC;', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_git',
    hints: [
      { level: 1, content: 'Git tracks snapshots of your project over time. Each commit is a snapshot with a message explaining what changed and why.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Workflow: edit files → git add (stage) → git commit (snapshot) → git push (share). Pull before push to avoid conflicts.', type: 'PROCEDURAL' },
      { level: 3, content: 'Branches let you work on features independently. Create: git checkout -b feature-x. Merge back: git checkout main && git merge feature-x. Delete: git branch -d feature-x.', type: 'PROCEDURAL' },
      { level: 4, content: 'Rebase replays your commits on top of another branch (linear history). Merge creates a merge commit (preserves branch structure). Interactive rebase: squash, reword, reorder.', type: 'FORMULA' },
      { level: 5, content: 'Example: Fix a conflict. git pull → CONFLICT in file.js. Open file, find <<<< ==== >>>> markers. Keep the correct code, remove markers. git add file.js && git commit.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_testing',
    hints: [
      { level: 1, content: 'Tests verify your code works correctly. They\'re a safety net — change code confidently knowing tests will catch regressions.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Test pyramid: many unit tests (fast, isolated), fewer integration tests (components together), few E2E tests (full user flow). Arrange-Act-Assert pattern.', type: 'PROCEDURAL' },
      { level: 3, content: 'Mock external dependencies (API calls, databases) in unit tests. Use dependency injection to make code testable. Test edge cases: empty input, null, boundary values.', type: 'PROCEDURAL' },
      { level: 4, content: 'TDD cycle: Red (write failing test) → Green (minimal code to pass) → Refactor (clean up). Code coverage: aim for 80%+ but 100% isn\'t always practical.', type: 'FORMULA' },
      { level: 5, content: 'Example (Jest): test("adds numbers", () => { expect(add(2,3)).toBe(5); expect(add(-1,1)).toBe(0); expect(add(0,0)).toBe(0); });', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_typescript',
    hints: [
      { level: 1, content: 'TypeScript adds types to JavaScript. It catches errors at compile time instead of runtime. Types are documentation that never goes stale.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Start with basic annotations: let name: string = "Ada". Function signatures: function add(a: number, b: number): number. Interfaces for object shapes.', type: 'PROCEDURAL' },
      { level: 3, content: 'Generics add flexibility: function first<T>(arr: T[]): T | undefined. Union types: string | number. Type narrowing: if (typeof x === "string") { ... }.', type: 'PROCEDURAL' },
      { level: 4, content: 'Utility types: Partial<T> (all optional), Required<T> (all required), Pick<T, Keys>, Omit<T, Keys>, Record<Keys, Value>. Use "as const" for literal types.', type: 'FORMULA' },
      { level: 5, content: 'Example: interface User { id: string; name: string; email?: string; } type CreateUser = Omit<User, "id">; function create(data: CreateUser): User { return { ...data, id: crypto.randomUUID() }; }', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_docker',
    hints: [
      { level: 1, content: 'A container is a lightweight, isolated environment that packages your app with all its dependencies. "Works on my machine" → works everywhere.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Dockerfile: FROM (base image) → WORKDIR → COPY → RUN (install deps) → EXPOSE → CMD (start command). Build: docker build -t myapp . Run: docker run -p 3000:3000 myapp.', type: 'PROCEDURAL' },
      { level: 3, content: 'docker-compose.yml defines multi-container apps: web + database + redis. docker-compose up starts everything. Volumes persist data between container restarts.', type: 'PROCEDURAL' },
      { level: 4, content: 'Multi-stage builds reduce image size: FROM node:18 AS builder → build → FROM node:18-slim → COPY --from=builder. Use .dockerignore to exclude node_modules, .git.', type: 'FORMULA' },
      { level: 5, content: 'Example: FROM node:18-slim\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/index.js"]', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_sysdesign_basics',
    hints: [
      { level: 1, content: 'System design is about making tradeoffs. There\'s no single right answer — discuss pros/cons of each approach.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Start with requirements: what are the features? Scale: how many users/requests? Then design high-level components and their interactions.', type: 'PROCEDURAL' },
      { level: 3, content: 'Key building blocks: load balancer (distribute traffic), cache (reduce DB load), CDN (static files close to users), message queue (async processing), database (SQL vs NoSQL).', type: 'PROCEDURAL' },
      { level: 4, content: 'CAP theorem: you can only have 2 of 3 — Consistency, Availability, Partition tolerance. Most real systems choose AP (eventual consistency) or CP (strong consistency).', type: 'FORMULA' },
      { level: 5, content: 'Example: URL shortener. Write: hash long URL → store mapping in DB → return short URL. Read: lookup short URL in cache (hit → redirect, miss → DB → cache → redirect). Scale: partition by hash prefix.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_fp_basics',
    hints: [
      { level: 1, content: 'Functional programming treats computation as evaluating mathematical functions. Key idea: avoid changing state and mutating data.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Pure function: same input always gives same output, no side effects. map/filter/reduce work on arrays without mutating the original.', type: 'PROCEDURAL' },
      { level: 3, content: 'Composition: combine small functions into bigger ones. pipe(f, g, h)(x) = h(g(f(x))). Currying: add(a)(b) instead of add(a, b) — enables partial application.', type: 'PROCEDURAL' },
      { level: 4, content: 'Immutability: instead of arr.push(x), use [...arr, x]. Instead of obj.key = val, use {...obj, key: val}. Structural sharing makes this efficient.', type: 'FORMULA' },
      { level: 5, content: 'Example: Transform users. users.filter(u => u.active).map(u => u.name.toUpperCase()).sort() — no mutations, each step returns a new array, easily composable and testable.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_auth_security',
    hints: [
      { level: 1, content: 'Never store passwords in plain text. Never trust user input. These two rules prevent the majority of security vulnerabilities.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Hash passwords with bcrypt (includes salt). JWT for stateless auth: server signs a token, client sends it with each request, server verifies the signature.', type: 'PROCEDURAL' },
      { level: 3, content: 'Common attacks: XSS (inject scripts — sanitize output), CSRF (forged requests — use tokens), SQL injection (malicious queries — use parameterized queries).', type: 'PROCEDURAL' },
      { level: 4, content: 'OAuth 2.0 flow: user → auth server → authorization code → exchange for access token → use token to access API. Scopes limit what the token can do.', type: 'FORMULA' },
      { level: 5, content: 'Example: Hashing. const hash = await bcrypt.hash(password, 12); // Store hash. const match = await bcrypt.compare(input, hash); // Verify. Never: if(input === storedPassword).', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // EXPANDED AI/ML HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'ai_regression',
    hints: [
      { level: 1, content: 'Regression predicts a continuous number (price, temperature, age). If the output is a number on a scale, it\'s regression.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Linear regression fits a line: y = wx + b. The "best" line minimizes the sum of squared errors between predicted and actual values.', type: 'PROCEDURAL' },
      { level: 3, content: 'Gradient descent: start with random w,b. Compute loss. Nudge w,b in the direction that reduces loss (negative gradient). Repeat until convergence.', type: 'PROCEDURAL' },
      { level: 4, content: 'MSE = (1/n)Σ(yᵢ - ŷᵢ)². R² = 1 - SS_res/SS_tot (1 = perfect, 0 = mean baseline). Ridge: add λΣw² to loss. Lasso: add λΣ|w| (feature selection).', type: 'FORMULA' },
      { level: 5, content: 'Example: Predict house price from area. Data: [(1000,200k), (1500,300k), (2000,380k)]. Linear fit: price ≈ 180·area + 20k. R² = 0.98 → good fit. Residual plot should show no pattern.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_clustering',
    hints: [
      { level: 1, content: 'Clustering groups similar data points together without labels. The algorithm discovers structure in the data on its own.', type: 'CONCEPTUAL' },
      { level: 2, content: 'K-means: 1) Pick K random centers. 2) Assign each point to nearest center. 3) Recompute centers as mean of assigned points. 4) Repeat until stable.', type: 'PROCEDURAL' },
      { level: 3, content: 'How to choose K? Elbow method: plot inertia vs K, pick the "elbow." Silhouette score: measures how similar a point is to its own cluster vs others (-1 to 1, higher = better).', type: 'PROCEDURAL' },
      { level: 4, content: 'K-means: O(nKt) per iteration. DBSCAN: ε (radius), minPts (density). Points are core, border, or noise. Finds arbitrary-shaped clusters, no K needed.', type: 'FORMULA' },
      { level: 5, content: 'Example: Customer segmentation. Features: spending, frequency. K=3 reveals: "high value" (high both), "casual" (low spend, medium freq), "churning" (low both). Tailor marketing per cluster.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_overfitting',
    hints: [
      { level: 1, content: 'If your model does great on training data but poorly on test data, it\'s overfitting — it memorized the noise instead of learning the pattern.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Diagnosis: plot training loss and validation loss. If training loss keeps dropping but validation loss increases → overfitting. Both high → underfitting.', type: 'PROCEDURAL' },
      { level: 3, content: 'Fixes: get more data, simplify the model (fewer parameters), regularization (L1/L2 penalty on weights), dropout (randomly zero out neurons), early stopping (stop when val loss increases).', type: 'PROCEDURAL' },
      { level: 4, content: 'Bias-variance decomposition: Error = Bias² + Variance + Noise. Simple models: high bias, low variance. Complex models: low bias, high variance. Sweet spot in between.', type: 'FORMULA' },
      { level: 5, content: 'Example: A degree-15 polynomial fits 20 training points perfectly (training error = 0) but wildly oscillates between points (test error huge). A degree-2 polynomial has some training error but generalizes much better.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_loss_functions',
    hints: [
      { level: 1, content: 'A loss function tells the model how wrong it is.', type: 'CONCEPTUAL' },
      { level: 2, content: 'For regression, mean squared error is common; for classification, cross-entropy.', type: 'PROCEDURAL' },
      { level: 3, content: 'The model tries to minimize loss during training.', type: 'PROCEDURAL' },
      { level: 4, content: 'Lower loss generally means better fit to data.', type: 'FORMULA' },
      { level: 5, content: 'Example: Predicting prices uses MSE; spam detection uses cross-entropy.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_model_selection',
    hints: [
      { level: 1, content: 'Model selection is choosing the best model for your task and constraints.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Use a validation set or cross-validation to compare models.', type: 'PROCEDURAL' },
      { level: 3, content: 'Balance accuracy with latency, size, and interpretability.', type: 'PROCEDURAL' },
      { level: 4, content: 'Avoid tuning on the test set to keep evaluation fair.', type: 'FORMULA' },
      { level: 5, content: 'Example: A slightly less accurate model may win if it is much faster.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_cnn',
    hints: [
      { level: 1, content: 'CNNs are designed for grid-like data (images). They learn spatial features hierarchically: edges → textures → parts → objects.', type: 'CONCEPTUAL' },
      { level: 2, content: 'A convolutional layer slides small filters over the input. Each filter detects a specific pattern. Pooling (max/avg) reduces spatial size while keeping important features.', type: 'PROCEDURAL' },
      { level: 3, content: 'Architecture pattern: [Conv → ReLU → Pool] × N → Flatten → Dense → Output. ResNet adds skip connections (x + F(x)) to train very deep networks (100+ layers).', type: 'PROCEDURAL' },
      { level: 4, content: 'Conv output size: (W - F + 2P)/S + 1, where W=input, F=filter, P=padding, S=stride. Parameters per layer: F×F×C_in×C_out + C_out (bias).', type: 'FORMULA' },
      { level: 5, content: 'Example: MNIST digit recognition. Input: 28×28×1. Conv1: 32 filters 3×3 → 26×26×32. Pool → 13×13×32. Conv2: 64 filters → 11×11×64. Pool → 5×5×64. Flatten → Dense 128 → Dense 10 (softmax).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_rnn',
    hints: [
      { level: 1, content: 'RNNs process sequences by maintaining a hidden state that carries information from previous time steps. They have "memory" of past inputs.', type: 'CONCEPTUAL' },
      { level: 2, content: 'At each step: h_t = f(W_h · h_{t-1} + W_x · x_t). The same weights are shared across all time steps (parameter sharing).', type: 'PROCEDURAL' },
      { level: 3, content: 'Vanilla RNNs suffer from vanishing gradients (can\'t learn long dependencies). LSTM solves this with gates: forget gate, input gate, output gate, and a cell state that acts as a highway.', type: 'CONCEPTUAL' },
      { level: 4, content: 'LSTM: f_t = σ(W_f·[h_{t-1}, x_t]). i_t = σ(W_i·[h_{t-1}, x_t]). C_t = f_t⊙C_{t-1} + i_t⊙tanh(W_c·[h_{t-1}, x_t]). GRU is simpler: 2 gates instead of 3.', type: 'FORMULA' },
      { level: 5, content: 'Example: Sentiment analysis. "The movie was not good" — RNN processes word by word. "not" flips the sentiment carried in hidden state. LSTM remembers "not" even if positive words follow.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_transformers',
    hints: [
      { level: 1, content: 'Transformers process all tokens in parallel using self-attention. Each token can attend to every other token, regardless of distance.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Self-attention: each token creates Query (what am I looking for?), Key (what do I contain?), Value (what do I provide?). Attention score = how much each token should attend to each other.', type: 'PROCEDURAL' },
      { level: 3, content: 'Encoder (BERT): sees all tokens, bidirectional, great for understanding (classification, NER). Decoder (GPT): sees only past tokens, autoregressive, great for generation.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Attention(Q,K,V) = softmax(QK^T / √d_k)V. Multi-head: split into h heads, attend separately, concatenate. Complexity: O(n²·d) where n = sequence length.', type: 'FORMULA' },
      { level: 5, content: 'Example: "The animal didn\'t cross the street because it was too tired." Self-attention on "it": high attention to "animal" (resolving the pronoun). This is what makes transformers powerful for language.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_prompt_engineering',
    hints: [
      { level: 1, content: 'Prompt engineering is the art of communicating effectively with LLMs. How you ask determines the quality of the answer.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Be specific and structured. Instead of "write code", say "write a Python function that takes a list of integers and returns the two numbers that sum to a target, using a hash map."', type: 'PROCEDURAL' },
      { level: 3, content: 'Techniques: zero-shot (just ask), few-shot (give examples first), chain-of-thought ("let\'s think step by step"), role prompting ("you are an expert in X").', type: 'PROCEDURAL' },
      { level: 4, content: 'Temperature: 0 = deterministic, 1 = creative. top_p: 0.1 = focused, 1 = diverse. JSON mode: request structured output. System prompt sets persistent behavior.', type: 'FORMULA' },
      { level: 5, content: 'Example: Chain-of-thought. "Q: If I have 3 apples and buy 2 more, then give away 1, how many do I have? Let\'s think step by step: Start: 3. Buy 2: 3+2=5. Give 1: 5-1=4. Answer: 4."', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_rag',
    hints: [
      { level: 1, content: 'RAG augments an LLM with external knowledge by retrieving relevant documents before generating an answer. It reduces hallucination and keeps information current.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Pipeline: User query → embed query → search vector DB → retrieve top-K chunks → inject into prompt context → LLM generates answer grounded in retrieved text.', type: 'PROCEDURAL' },
      { level: 3, content: 'Chunking strategy matters: too small (loses context), too large (dilutes relevance). Overlap chunks by 10-20%. Consider semantic chunking (by paragraph/section) over fixed-size.', type: 'PROCEDURAL' },
      { level: 4, content: 'Embedding: text → dense vector (1536-dim for OpenAI). Similarity: cosine similarity = dot(a,b)/(|a|·|b|). Vector DBs: approximate nearest neighbor (HNSW, IVF) for speed.', type: 'FORMULA' },
      { level: 5, content: 'Example: Company docs chatbot. Split docs into 500-token chunks with 50-token overlap. Embed with OpenAI. Store in Pinecone. Query: "What\'s our refund policy?" → retrieve top 3 chunks → GPT answers using those chunks as context.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_finetuning',
    hints: [
      { level: 1, content: 'Fine-tuning adapts a pre-trained model to your specific task/domain. It\'s like teaching a generally educated person about your specific field.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Full fine-tuning updates all weights (expensive). LoRA adds small trainable matrices to frozen weights — 100x fewer parameters to train, similar performance.', type: 'PROCEDURAL' },
      { level: 3, content: 'RLHF pipeline: 1) Supervised fine-tune on demonstrations, 2) Train a reward model on human preferences, 3) Optimize policy with PPO using the reward model. DPO simplifies by skipping the reward model.', type: 'PROCEDURAL' },
      { level: 4, content: 'LoRA: W\' = W + BA where B is d×r, A is r×d, r << d (rank). QLoRA: quantize base model to 4-bit, add LoRA adapters in fp16. Saves 4-10x GPU memory.', type: 'FORMULA' },
      { level: 5, content: 'Example: Fine-tune Llama-2-7B on medical Q&A. Dataset: 10K instruction-response pairs. QLoRA (r=16, α=32) on single A100. Train 3 epochs. Eval: medical benchmarks improve 15% over base model.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_gans',
    hints: [
      { level: 1, content: 'GANs are two neural networks competing: Generator creates fake data, Discriminator tries to tell real from fake. Both improve through competition.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Training loop: 1) Train D to correctly classify real (1) and fake (0). 2) Train G to fool D (make D output 1 for fake). Alternate these steps.', type: 'PROCEDURAL' },
      { level: 3, content: 'Common problems: mode collapse (G only generates one type of output), vanishing gradients (D becomes too strong). Solutions: Wasserstein loss, spectral normalization, progressive growing.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Minimax game: min_G max_D [E[log D(x)] + E[log(1 - D(G(z)))]]. Wasserstein: min_G max_D [E[D(x)] - E[D(G(z))]]. FID score measures generated image quality (lower = better).', type: 'FORMULA' },
      { level: 5, content: 'Example: StyleGAN generates photorealistic faces. Latent vector z → mapping network → style vectors → injected at each layer of generator. Control features at different scales: pose (coarse), hair (medium), freckles (fine).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_diffusion',
    hints: [
      { level: 1, content: 'Diffusion models gradually add noise to data (forward process), then learn to reverse the process (denoise). Generation starts from pure noise.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Forward: add Gaussian noise over T steps until data becomes pure noise. Reverse: a neural network (U-Net) learns to predict and remove the noise at each step.', type: 'PROCEDURAL' },
      { level: 3, content: 'Classifier-free guidance: train with and without text conditioning. At inference, amplify the conditioned prediction: ε = ε_uncond + w·(ε_cond - ε_uncond). Higher w = more prompt adherence.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Stable Diffusion: encode image to latent space (VAE) → diffuse in latent space (smaller, faster) → denoise with U-Net conditioned on CLIP text embeddings → decode back to image.', type: 'FORMULA' },
      { level: 5, content: 'Example: Text-to-image. Prompt: "a cat astronaut on mars, oil painting." CLIP encodes text → cross-attention in U-Net conditions denoising → 50 denoising steps → VAE decoder → 512×512 image.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_agents',
    hints: [
      { level: 1, content: 'An AI agent can reason, plan, and take actions using tools (web search, code execution, APIs). It goes beyond simple question-answering.', type: 'CONCEPTUAL' },
      { level: 2, content: 'ReAct pattern: Thought (reason about what to do) → Action (call a tool) → Observation (see the result) → repeat until task is complete.', type: 'PROCEDURAL' },
      { level: 3, content: 'Memory types: working memory (current conversation), short-term (recent actions/observations), long-term (vector DB of past interactions). Memory enables learning across sessions.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Function calling: LLM outputs structured JSON {name: "search", args: {query: "..."}}. Orchestrator executes, returns result. Multi-step: plan → execute steps → synthesize.', type: 'FORMULA' },
      { level: 5, content: 'Example: Research agent. User: "Compare React vs Vue for my project." Agent: 1) Search latest React features. 2) Search latest Vue features. 3) Search benchmarks. 4) Synthesize comparison with recommendations.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_linear_algebra',
    hints: [
      { level: 1, content: 'In ML, data is stored as matrices (datasets), weights are matrices, operations are matrix multiplications. Linear algebra IS the language of ML.', type: 'CONCEPTUAL' },
      { level: 2, content: 'A neural network forward pass: y = σ(Wx + b). W is a weight matrix, x is input vector, b is bias, σ is activation. Matrix multiplication combines features.', type: 'PROCEDURAL' },
      { level: 3, content: 'Eigenvalues/eigenvectors: Av = λv. PCA finds eigenvectors of the covariance matrix — directions of maximum variance in the data. Project data onto top-k eigenvectors.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Dot product: a·b = |a||b|cosθ (similarity). Matrix multiply: (m×n)(n×p) → (m×p). SVD: A = UΣVᵀ. Rank = number of non-zero singular values.', type: 'FORMULA' },
      { level: 5, content: 'Example: Word embeddings. "king" - "man" + "woman" ≈ "queen". This works because embeddings are vectors, and vector arithmetic captures semantic relationships.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_dim_reduction',
    hints: [
      { level: 1, content: 'High-dimensional data is hard to visualize and often contains redundant features. Dimensionality reduction finds a compact representation.', type: 'CONCEPTUAL' },
      { level: 2, content: 'PCA: find directions (principal components) of maximum variance. Project data onto top-k components. Keeps the most "information" in fewer dimensions.', type: 'PROCEDURAL' },
      { level: 3, content: 't-SNE is for visualization (2D/3D). It preserves local neighborhoods — similar points stay close. But distances between clusters aren\'t meaningful. Use perplexity 5-50.', type: 'PROCEDURAL' },
      { level: 4, content: 'PCA: explained variance ratio = λᵢ/Σλ. Choose k where cumulative variance > 95%. UMAP is faster than t-SNE and better preserves global structure.', type: 'FORMULA' },
      { level: 5, content: 'Example: MNIST digits (784 features). PCA to 50 components retains 95% variance. t-SNE to 2D reveals 10 clusters (one per digit). Individual digits cluster together visually.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_evaluation',
    hints: [
      { level: 1, content: 'Accuracy alone can be misleading. A model that always predicts "not cancer" is 99% accurate if only 1% have cancer — but useless.', type: 'CONCEPTUAL' },
      { level: 2, content: 'For imbalanced classes: use precision (of predicted positives, how many are truly positive) and recall (of actual positives, how many were found). F1 balances both.', type: 'PROCEDURAL' },
      { level: 3, content: 'ROC curve: plot TPR vs FPR at different thresholds. AUC = area under ROC (1 = perfect, 0.5 = random). PR curve is better for highly imbalanced datasets.', type: 'PROCEDURAL' },
      { level: 4, content: 'Precision = TP/(TP+FP). Recall = TP/(TP+FN). F1 = 2PR/(P+R). k-fold CV: split data into k folds, train on k-1, test on 1, rotate. Average scores for robust estimate.', type: 'FORMULA' },
      { level: 5, content: 'Example: Spam filter. 100 emails: 80 ham, 20 spam. Model flags 25 as spam: 18 correct (TP), 7 wrong (FP). 2 spam missed (FN). Precision = 18/25 = 72%. Recall = 18/20 = 90%.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_mlops',
    hints: [
      { level: 1, content: 'MLOps is DevOps for ML. Training a good model is only ~20% of the work. The rest is data pipelines, deployment, monitoring, and iteration.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Experiment tracking (MLflow/W&B): log hyperparameters, metrics, and artifacts for every run. Compare runs. Reproduce any result.', type: 'PROCEDURAL' },
      { level: 3, content: 'Model serving: REST API (FastAPI + model.predict), batch inference (scheduled jobs), edge deployment (ONNX, TFLite). Choose based on latency requirements.', type: 'PROCEDURAL' },
      { level: 4, content: 'Data drift: input distribution changes over time. Concept drift: relationship between input and output changes. Monitor with statistical tests (KS test, PSI). Retrain when drift detected.', type: 'FORMULA' },
      { level: 5, content: 'Example: Fraud detection pipeline. Data → feature engineering → train model → register in model registry → deploy to API → monitor predictions → detect drift → retrain automatically → A/B test new model → promote.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_python_for_ml',
    hints: [
      { level: 1, content: 'NumPy, Pandas, and Matplotlib are the three pillars of data work in Python. Master these before jumping to ML libraries.', type: 'CONCEPTUAL' },
      { level: 2, content: 'NumPy: np.array for fast math. Broadcasting: (3,1) + (1,4) → (3,4). Vectorize instead of loops: arr * 2 is 100x faster than [x*2 for x in arr].', type: 'PROCEDURAL' },
      { level: 3, content: 'Pandas: df.groupby("col").mean(), df.merge(other, on="key"), df.fillna(0), df["col"].value_counts(). Chain operations for clean data pipelines.', type: 'PROCEDURAL' },
      { level: 4, content: 'scikit-learn pattern: model = RandomForestClassifier(n_estimators=100). model.fit(X_train, y_train). preds = model.predict(X_test). score = model.score(X_test, y_test).', type: 'FORMULA' },
      { level: 5, content: 'Example: Load CSV, explore, train. df = pd.read_csv("data.csv"); X = df.drop("target", axis=1); y = df["target"]; X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2).', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_ensemble',
    hints: [
      { level: 1, content: 'Ensemble methods combine multiple models. The "wisdom of crowds" — many weak learners together form a strong learner.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Bagging (Random Forest): train many trees on random subsets of data, average predictions. Reduces variance (overfitting).', type: 'PROCEDURAL' },
      { level: 3, content: 'Boosting (XGBoost): train trees sequentially, each one correcting the previous one\'s errors. Reduces bias (underfitting). More prone to overfitting — use regularization.', type: 'PROCEDURAL' },
      { level: 4, content: 'Random Forest: each tree uses random subset of features at each split. XGBoost: loss = Σl(yᵢ,ŷᵢ) + Σ[γT + ½λ||w||²] where T = number of leaves.', type: 'FORMULA' },
      { level: 5, content: 'Example: Kaggle competition. Single decision tree: 78% accuracy. Random Forest (100 trees): 85%. XGBoost (tuned): 89%. Stacking RF + XGBoost + LightGBM: 91%. Diminishing returns but ensembles consistently win.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_llm_internals',
    hints: [
      { level: 1, content: 'LLMs are just next-token predictors trained on massive text. They learn to model P(next_token | previous_tokens) and this simple objective produces emergent capabilities.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Architecture: token embedding + positional encoding → N transformer decoder blocks (masked self-attention → feed-forward) → linear head → softmax over vocabulary.', type: 'PROCEDURAL' },
      { level: 3, content: 'Scaling laws: performance improves predictably with model size (parameters), dataset size, and compute. GPT-3: 175B params, trained on ~300B tokens. GPT-4: likely >1T params.', type: 'CONCEPTUAL' },
      { level: 4, content: 'KV cache: store key-value tensors from previous tokens to avoid recomputation. Reduces O(n²) to O(n) per new token. Flash Attention: tiled computation to reduce memory I/O, not FLOPs.', type: 'FORMULA' },
      { level: 5, content: 'Example: GPT generates "The cat sat on the ___". Vocabulary: 50K tokens. Softmax outputs probability for each. P("mat")=0.15, P("floor")=0.08, P("chair")=0.06... Sample from this distribution.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_model_optimization',
    hints: [
      { level: 1, content: 'Model optimization reduces size, memory, and latency so models can run on cheaper hardware or at the edge. The goal: same quality, less compute.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Quantization reduces precision: FP32 → FP16 (2x compression, minimal quality loss) → INT8 (4x, small loss) → INT4 (8x, noticeable on small models).', type: 'PROCEDURAL' },
      { level: 3, content: 'Knowledge distillation: train a small "student" model to mimic a large "teacher" model. The student learns from the teacher\'s soft probability distributions, not just hard labels.', type: 'CONCEPTUAL' },
      { level: 4, content: 'GPTQ: post-training quantization using approximate second-order information. AWQ: activation-aware quantization. GGUF: format for CPU inference (llama.cpp). ONNX: portable model format.', type: 'FORMULA' },
      { level: 5, content: 'Example: Llama-2-7B at FP16 = 14GB VRAM. INT4 quantized (GPTQ) = 4GB — fits on consumer GPU. Speed: 2x faster inference. Quality: <1% accuracy drop on benchmarks. Huge practical win.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_networking',
    hints: [
      { level: 1, content: 'Networking basics explain how a request travels from your device to a server and back.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Typical flow: DNS lookup → TCP handshake → TLS handshake (HTTPS) → HTTP request → server response → keep-alive reuse.', type: 'PROCEDURAL' },
      { level: 3, content: 'HTTP is stateless. HTTPS adds encryption via TLS. Status codes (200, 301, 404, 500) summarize the outcome.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Request structure: METHOD path HTTP/1.1 + headers + blank line + body. TCP handshake: SYN → SYN-ACK → ACK.', type: 'FORMULA' },
      { level: 5, content: 'Example: Browser loads https://example.com. DNS resolves to IP. TCP+TLS establish a secure connection. Browser sends GET /. Server returns HTML with 200 OK.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_caching',
    hints: [
      { level: 1, content: 'Caching stores frequently accessed data in a faster layer to reduce latency and backend load.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Cache-aside: check cache first → if miss, read DB → store in cache → return. Invalidation is the hardest part.', type: 'PROCEDURAL' },
      { level: 3, content: 'Write-through caches update cache and DB together. Write-back caches update cache first and persist later (riskier but faster).', type: 'CONCEPTUAL' },
      { level: 4, content: 'Hit ratio = hits / (hits + misses). TTL defines how long cached data stays valid. Stale-while-revalidate serves stale data while refreshing in background.', type: 'FORMULA' },
      { level: 5, content: 'Example: Profile page. On request: check Redis key user:123. If miss, fetch DB, set Redis with TTL=10m, return. On update, delete or refresh the key.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'code_message_queues',
    hints: [
      { level: 1, content: 'Queues decouple systems and let you process work asynchronously, smoothing traffic spikes.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Producer sends message → queue stores → consumer processes. Failures trigger retries or a dead-letter queue.', type: 'PROCEDURAL' },
      { level: 3, content: 'Delivery guarantees: at-most-once (fast, may drop), at-least-once (retries, duplicates), exactly-once (hard). Use idempotency keys to handle duplicates.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Backoff strategy: retry after 1s, 2s, 4s, 8s… with max cap. Visibility timeout controls how long a message stays hidden after being read.', type: 'FORMULA' },
      { level: 5, content: 'Example: Order processing. Checkout writes order to DB and publishes order.created. Inventory service consumes and reserves stock; email service sends receipt. Retries happen without blocking checkout.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_time_series',
    hints: [
      { level: 1, content: 'Time series forecasting predicts future values from past values. Order matters; you cannot shuffle data randomly.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Decompose the series into trend, seasonality, and noise. Visualization helps identify each component.', type: 'PROCEDURAL' },
      { level: 3, content: 'Classical models: ARIMA, exponential smoothing. Deep models: LSTM, Temporal CNNs, Transformers. Choose based on data size and complexity.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Forecast metrics: MAE = (1/n)Σ|y-ŷ|, MAPE = (100/n)Σ|y-ŷ|/|y|. Use rolling-window validation for time series.', type: 'FORMULA' },
      { level: 5, content: 'Example: Forecast daily sales. Train on months 1–10, validate on month 11, test on month 12. A seasonal ARIMA captures weekly cycles; an LSTM learns longer dependencies.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_recommenders',
    hints: [
      { level: 1, content: 'Recommenders predict what a user will like based on past behavior or item similarity.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Collaborative filtering uses user-item interactions. Content-based uses item features. Hybrid combines both.', type: 'PROCEDURAL' },
      { level: 3, content: 'Cold start: new users/items lack history. Use popular items, onboarding questions, or metadata to bootstrap recommendations.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Matrix factorization: R ≈ U·Vᵀ, where U=user embeddings, V=item embeddings. Score = U_u · V_i. Ranking metrics: MRR, NDCG.', type: 'FORMULA' },
      { level: 5, content: 'Example: Movie recs. User A likes sci-fi. Collaborative filtering finds similar users and recommends movies they loved; content-based adds films with similar directors/genres.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'ai_causal_inference',
    hints: [
      { level: 1, content: 'Correlation does not imply causation. Causal inference asks: what happens if we intervene?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Identify confounders (variables affecting both treatment and outcome). Use a causal graph (DAG) to reason about them.', type: 'PROCEDURAL' },
      { level: 3, content: 'Randomized controlled trials are the gold standard. When not possible, use matching, propensity scores, or instrumental variables.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Average Treatment Effect (ATE) = E[Y(1) − Y(0)]. Potential outcomes framework defines Y(1) and Y(0).', type: 'FORMULA' },
      { level: 5, content: 'Example: Does a discount increase sales? If you only discount to loyal customers, sales may be higher anyway. Randomly offer discount to a subset and compare outcomes to isolate causal effect.', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // ESSAY WRITING HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'essay_prompt_fit',
    hints: [
      { level: 1, content: 'What is the prompt really asking for? Try to summarize it in one sentence.', type: 'CONCEPTUAL' },
      { level: 2, content: 'List the key words in the prompt (e.g., challenge, community, identity). Make sure your story addresses each one.', type: 'PROCEDURAL' },
      { level: 3, content: 'If someone read only your first paragraph, would they know which prompt you chose?', type: 'CONCEPTUAL' },
      { level: 4, content: 'Check alignment: story (what happened) + reflection (why it matters) + prompt link (how it answers the question).', type: 'PROCEDURAL' },
      { level: 5, content: 'Example: If the prompt asks about a challenge, focus on one obstacle and how you responded, not a list of successes.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_specificity',
    hints: [
      { level: 1, content: 'Where can you add a concrete detail that makes the moment feel real?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Add one sensory detail (what you saw, heard, or felt).', type: 'PROCEDURAL' },
      { level: 3, content: 'Replace abstract words (hard, important, meaningful) with a short example of what that looked like.', type: 'PROCEDURAL' },
      { level: 4, content: 'Aim for a small moment instead of a whole timeline. A focused scene is more specific.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: Instead of "I was nervous," show a detail like shaking hands or a racing heart.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_voice',
    hints: [
      { level: 1, content: 'Does this sound like how you would explain it to a friend? If not, make it more natural.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Cut any formal phrases you would never say out loud.', type: 'PROCEDURAL' },
      { level: 3, content: 'Add a short line that shows your personality or humor, if it fits the moment.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Voice is consistency: keep the same tone from beginning to end so the reader hears you.', type: 'PROCEDURAL' },
      { level: 5, content: 'Example: Simple, clear sentences often sound more authentic than complex ones.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_reflection',
    hints: [
      { level: 1, content: 'What did this experience teach you about yourself?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Add one line that explains why this moment matters now, not just then.', type: 'PROCEDURAL' },
      { level: 3, content: 'Try a before/after contrast: who were you then vs who are you now?', type: 'PROCEDURAL' },
      { level: 4, content: 'Reflection is the so-what. Connect the moment to a value, habit, or belief.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: "It taught me patience" is weaker than explaining how you now approach challenges differently.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_narrative_arc',
    hints: [
      { level: 1, content: 'Where does the story start, and what changes by the end?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Pick one turning point and build the essay around it.', type: 'PROCEDURAL' },
      { level: 3, content: 'Cut extra background so the reader can stay with the main moment.', type: 'PROCEDURAL' },
      { level: 4, content: 'A clear arc: setup → challenge → action → reflection.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: One meaningful day can show growth better than a multi-year summary.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_structure',
    hints: [
      { level: 1, content: 'Does each paragraph have a clear purpose?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Make sure each paragraph leads logically to the next.', type: 'PROCEDURAL' },
      { level: 3, content: 'Use short transitions to guide the reader ("Then," "Because of that").', type: 'PROCEDURAL' },
      { level: 4, content: 'If a paragraph repeats the same idea, combine or cut it.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: A tight 4-5 paragraph flow is often clearer than a long, wandering draft.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_opening',
    hints: [
      { level: 1, content: 'What specific moment can you start with?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Avoid a broad statement; jump into action or a scene.', type: 'PROCEDURAL' },
      { level: 3, content: 'Use one vivid detail in the first two sentences.', type: 'PROCEDURAL' },
      { level: 4, content: 'The opening should hint at the theme without explaining everything.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: A single moment can hook more than a summary of your whole background.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_closing',
    hints: [
      { level: 1, content: 'What do you want the reader to remember most?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Connect the ending to the opening to create closure.', type: 'PROCEDURAL' },
      { level: 3, content: 'Add one line of reflection rather than a list of achievements.', type: 'PROCEDURAL' },
      { level: 4, content: 'End with insight, not a resume line.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: A clear takeaway is stronger than a dramatic quote or slogan.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_theme',
    hints: [
      { level: 1, content: 'What is the one idea that connects your essay together?', type: 'CONCEPTUAL' },
      { level: 2, content: 'If you removed a paragraph, would the theme still be clear? If not, make the theme explicit.', type: 'PROCEDURAL' },
      { level: 3, content: 'Use a small repeated detail or phrase to reinforce the theme.', type: 'PROCEDURAL' },
      { level: 4, content: 'A theme is not a topic. It is what the experience means to you.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: A theme like resilience is stronger when tied to a specific moment.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'essay_revision',
    hints: [
      { level: 1, content: 'What is one sentence you can remove without losing meaning?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Tighten long sentences by splitting them or removing extra adjectives.', type: 'PROCEDURAL' },
      { level: 3, content: 'Read your draft out loud. Anything that feels awkward should be revised.', type: 'PROCEDURAL' },
      { level: 4, content: 'Ask: does every paragraph add new information or reflection?', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: Revision is often about cutting 10-20% of words without losing meaning.', type: 'EXAMPLE' },
    ],
  },

  // ═══════════════════════════════════════════════
  // COLLEGE COUNSELLING HINTS
  // ═══════════════════════════════════════════════

  {
    conceptKey: 'counsel_academic_readiness',
    hints: [
      { level: 1, content: 'What does your grade trend look like over the last few terms?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Pick one class to improve this term and set a weekly plan for it.', type: 'PROCEDURAL' },
      { level: 3, content: 'Consistency matters more than a single perfect term. Focus on small weekly gains.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Track your grades by subject and look for patterns in where you struggle.', type: 'PROCEDURAL' },
      { level: 5, content: 'Example: A steady rise from B to A- to A can be a strong signal of growth.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_course_rigor',
    hints: [
      { level: 1, content: 'Which classes will stretch you while still being realistic to manage?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Balance rigor with performance. One strong AP is better than three that overwhelm you.', type: 'PROCEDURAL' },
      { level: 3, content: 'Choose rigor in your areas of interest when possible.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Plan year by year: increase difficulty gradually so your GPA stays stable.', type: 'PROCEDURAL' },
      { level: 5, content: 'Example: If math is your strength, take a harder math course and keep other courses balanced.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_study_habits',
    hints: [
      { level: 1, content: 'What study habit works best for you right now?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Use small daily blocks instead of last-minute cramming.', type: 'PROCEDURAL' },
      { level: 3, content: 'Make a weekly plan: 3-5 short sessions per subject.', type: 'PROCEDURAL' },
      { level: 4, content: 'Reflect weekly: what worked, what did not, and what to adjust.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: 30 minutes after school each day is more effective than 4 hours on Sunday.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_test_timeline',
    hints: [
      { level: 1, content: 'When do you want to take your first SAT/ACT?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Work backward from the test date and plan prep in 8-12 week blocks.', type: 'PROCEDURAL' },
      { level: 3, content: 'Leave room for one retake if your goal score is not reached.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Use a calendar to mark test dates, prep milestones, and practice tests.', type: 'PROCEDURAL' },
      { level: 5, content: 'Example: If you want a spring test, start prep in winter and schedule a practice test every 2-3 weeks.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_test_baseline',
    hints: [
      { level: 1, content: 'A baseline test helps you see where you are starting, not where you finish.', type: 'CONCEPTUAL' },
      { level: 2, content: 'Take a timed diagnostic test to identify weak sections.', type: 'PROCEDURAL' },
      { level: 3, content: 'Use the baseline to set a realistic goal score.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Track section scores so you know where prep time should go.', type: 'PROCEDURAL' },
      { level: 5, content: 'Example: If math lags behind reading, spend extra time on math practice and review.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_activity_breadth',
    hints: [
      { level: 1, content: 'What activities are you curious to try this year?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Try 2-3 different areas before choosing where to focus.', type: 'PROCEDURAL' },
      { level: 3, content: 'Early breadth helps you discover what you actually enjoy.', type: 'CONCEPTUAL' },
      { level: 4, content: 'Pick one academic, one creative, and one community activity to sample.', type: 'PROCEDURAL' },
      { level: 5, content: 'Example: If you like science, try robotics, science fair, and volunteering at a museum.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_activity_depth',
    hints: [
      { level: 1, content: 'Which activity could you see yourself sticking with for a few years?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Depth means responsibility, impact, or leadership over time.', type: 'PROCEDURAL' },
      { level: 3, content: 'Pick one activity to go deep in and set a growth goal for the year.', type: 'PROCEDURAL' },
      { level: 4, content: 'Impact can be small but real: a club project, a program you started, or consistent mentoring.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: Moving from member to organizer shows depth even if the group is small.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_interest_exploration',
    hints: [
      { level: 1, content: 'What topics make you lose track of time when you learn them?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Try short projects to test interest before committing long-term.', type: 'PROCEDURAL' },
      { level: 3, content: 'Talk to someone who works in a field you are curious about.', type: 'PROCEDURAL' },
      { level: 4, content: 'Exploration is about curiosity, not pressure to choose a career now.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: If you like design, try UX projects, art classes, and engineering clubs to compare.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_major_alignment',
    hints: [
      { level: 1, content: 'Which major best fits both your strengths and your interests?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Research 2-3 majors and list the skills and classes they require.', type: 'PROCEDURAL' },
      { level: 3, content: 'Look at careers that use those majors and see what excites you.', type: 'PROCEDURAL' },
      { level: 4, content: 'Alignment means interest + ability + long-term motivation.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: If you love biology and problem-solving, consider bioengineering and compare it to pre-med.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_application_timeline',
    hints: [
      { level: 1, content: 'What is the next major deadline in your timeline?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Build a checklist: testing, essays, recommendations, activities, applications.', type: 'PROCEDURAL' },
      { level: 3, content: 'Spread big tasks across months instead of weeks.', type: 'PROCEDURAL' },
      { level: 4, content: 'Deadlines include letters and financial aid, not just applications.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: Finish your essay draft before asking for recommendations so you can share your story.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_financial_aid',
    hints: [
      { level: 1, content: 'Financial aid is a process: know what forms are required and when.', type: 'CONCEPTUAL' },
      { level: 2, content: 'FAFSA opens each year and has deadlines. Start early.', type: 'PROCEDURAL' },
      { level: 3, content: 'Scholarships are separate from FAFSA and often have earlier deadlines.', type: 'PROCEDURAL' },
      { level: 4, content: 'Affordability depends on net cost after aid, not sticker price.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: Build a simple list of scholarship deadlines alongside application deadlines.', type: 'EXAMPLE' },
    ],
  },
  {
    conceptKey: 'counsel_middle_school_foundations',
    hints: [
      { level: 1, content: 'What is one habit that helps you feel prepared each day?', type: 'CONCEPTUAL' },
      { level: 2, content: 'Try a simple weekly routine: plan on Sunday, review on Friday.', type: 'PROCEDURAL' },
      { level: 3, content: 'Explore activities that are fun and build confidence.', type: 'PROCEDURAL' },
      { level: 4, content: 'Focus on curiosity and growth, not pressure about college yet.', type: 'CONCEPTUAL' },
      { level: 5, content: 'Example: Choose one small goal for the month, like reading 15 minutes a day.', type: 'EXAMPLE' },
    ],
  },
];

export async function seedHints(client?: PrismaClient) {
  const prisma = client ?? new PrismaClient();
  console.log(`Seeding hints for ${HINT_BANK.length} concepts...`);

  let total = 0;

  for (const entry of HINT_BANK) {
    const concept = await prisma.concept.findUnique({
      where: { conceptKey: entry.conceptKey },
    });
    if (!concept) {
      console.warn(`⚠ Concept not found: ${entry.conceptKey}, skipping`);
      continue;
    }

    for (const hint of entry.hints) {
      await prisma.hint.upsert({
        where: {
          conceptId_level: {
            conceptId: concept.id,
            level: hint.level,
          },
        },
        update: {
          content: hint.content,
          type: hint.type,
        },
        create: {
          conceptId: concept.id,
          level: hint.level,
          content: hint.content,
          type: hint.type,
        },
      });
      total++;
    }
  }

  console.log(`\nHint seed complete: ${total} hints across ${HINT_BANK.length} concepts.`);
  if (!client) {
    await prisma.$disconnect();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedHints()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
