import { PrismaClient, Subject } from '@prisma/client';

const prisma = new PrismaClient();

interface ConceptSeed {
  conceptKey: string;
  subject: Subject;
  topic: string;
  subtopic?: string;
  name: string;
  description: string;
  difficulty: number;
  prerequisites: string[];
}

const CONCEPTS: ConceptSeed[] = [

  // ═══════════════════════════════════════════════
  // PHYSICS (~35 concepts)
  // ═══════════════════════════════════════════════

  // Mechanics
  { conceptKey: 'phys_units_dimensions', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Measurement', name: 'Units & Dimensions', description: 'SI units, dimensional analysis, significant figures, error propagation. Foundation for all quantitative physics.', difficulty: 1, prerequisites: [] },
  { conceptKey: 'phys_kinematics', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Kinematics', name: 'Kinematics', description: 'Motion in one and two dimensions: displacement, velocity, acceleration, equations of motion, projectile motion, relative motion.', difficulty: 2, prerequisites: ['phys_units_dimensions'] },
  { conceptKey: 'phys_newtons_laws', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Dynamics', name: "Newton's Laws of Motion", description: 'Three laws governing force and motion: inertia, F=ma, action-reaction. Free body diagrams, pseudo forces, constraint equations.', difficulty: 2, prerequisites: ['phys_kinematics'] },
  { conceptKey: 'phys_friction', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Friction', name: 'Friction', description: 'Static and kinetic friction, coefficient of friction, inclined planes, circular motion with friction, banking of roads.', difficulty: 2, prerequisites: ['phys_newtons_laws'] },
  { conceptKey: 'phys_circular_motion', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Circular Motion', name: 'Circular Motion', description: 'Uniform and non-uniform circular motion, centripetal acceleration, vertical circles, conical pendulum.', difficulty: 3, prerequisites: ['phys_newtons_laws'] },
  { conceptKey: 'phys_work_energy', subject: 'PHYSICS', topic: 'Energy', subtopic: 'Work-Energy', name: 'Work and Energy', description: 'Work done by constant and variable forces, kinetic energy, potential energy, work-energy theorem, power.', difficulty: 3, prerequisites: ['phys_newtons_laws'] },
  { conceptKey: 'phys_conservation_energy', subject: 'PHYSICS', topic: 'Energy', subtopic: 'Conservation', name: 'Conservation of Energy', description: 'Conservative and non-conservative forces, potential energy curves, mechanical energy conservation, energy in springs.', difficulty: 3, prerequisites: ['phys_work_energy'] },
  { conceptKey: 'phys_com', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Center of Mass', name: 'Center of Mass', description: 'Center of mass of discrete and continuous systems, motion of COM, COM frame of reference.', difficulty: 3, prerequisites: ['phys_newtons_laws'] },
  { conceptKey: 'phys_momentum', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Momentum', name: 'Momentum and Collisions', description: 'Linear momentum, impulse, conservation of momentum, elastic and inelastic collisions in 1D and 2D, rocket propulsion.', difficulty: 3, prerequisites: ['phys_com', 'phys_conservation_energy'] },
  { conceptKey: 'phys_rotational', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Rotation', name: 'Rotational Motion', description: 'Torque, angular momentum, moment of inertia, rolling motion, parallel and perpendicular axis theorems.', difficulty: 4, prerequisites: ['phys_momentum'] },
  { conceptKey: 'phys_gravitation', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Gravitation', name: 'Gravitation', description: "Newton's law of gravitation, gravitational field and potential, orbital mechanics, escape velocity, Kepler's laws, satellites.", difficulty: 3, prerequisites: ['phys_circular_motion', 'phys_conservation_energy'] },
  { conceptKey: 'phys_fluid_mechanics', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Fluids', name: 'Fluid Mechanics', description: "Pressure, Pascal's law, Archimedes' principle, Bernoulli's equation, viscosity, surface tension, capillarity.", difficulty: 3, prerequisites: ['phys_newtons_laws'] },
  { conceptKey: 'phys_elasticity', subject: 'PHYSICS', topic: 'Mechanics', subtopic: 'Elasticity', name: 'Elasticity', description: "Stress, strain, Young's modulus, bulk modulus, shear modulus, Hooke's law, elastic energy.", difficulty: 2, prerequisites: ['phys_work_energy'] },

  // Waves & Oscillations
  { conceptKey: 'phys_shm', subject: 'PHYSICS', topic: 'Waves', subtopic: 'Oscillations', name: 'Simple Harmonic Motion', description: 'Springs, pendulums, restoring force, frequency, amplitude, phase, energy in SHM, superposition of SHMs.', difficulty: 3, prerequisites: ['phys_work_energy'] },
  { conceptKey: 'phys_waves', subject: 'PHYSICS', topic: 'Waves', subtopic: 'Wave Motion', name: 'Waves', description: 'Transverse and longitudinal waves, wave equation, superposition, interference, standing waves, harmonics.', difficulty: 3, prerequisites: ['phys_shm'] },
  { conceptKey: 'phys_sound', subject: 'PHYSICS', topic: 'Waves', subtopic: 'Sound', name: 'Sound Waves', description: 'Speed of sound in media, Doppler effect, resonance, beats, organ pipes, vibrating strings.', difficulty: 3, prerequisites: ['phys_waves'] },

  // Optics
  { conceptKey: 'phys_optics', subject: 'PHYSICS', topic: 'Optics', subtopic: 'Geometric', name: 'Geometric Optics', description: 'Reflection, refraction, mirrors, lenses, ray diagrams, lens maker formula, prisms, total internal reflection.', difficulty: 3, prerequisites: ['phys_waves'] },
  { conceptKey: 'phys_wave_optics', subject: 'PHYSICS', topic: 'Optics', subtopic: 'Wave Optics', name: 'Wave Optics', description: "Interference, Young's double slit, thin films, diffraction, Fraunhofer single slit, polarization, resolving power.", difficulty: 4, prerequisites: ['phys_optics'] },
  { conceptKey: 'phys_optical_instruments', subject: 'PHYSICS', topic: 'Optics', subtopic: 'Instruments', name: 'Optical Instruments', description: 'Human eye, microscopes, telescopes, magnifying power, aberrations.', difficulty: 2, prerequisites: ['phys_optics'] },

  // Thermodynamics
  { conceptKey: 'phys_thermo_1', subject: 'PHYSICS', topic: 'Thermodynamics', subtopic: 'Heat Transfer', name: 'Thermal Physics', description: 'Temperature scales, thermal expansion, calorimetry, specific heat, latent heat, heat transfer: conduction, convection, radiation.', difficulty: 2, prerequisites: ['phys_work_energy'] },
  { conceptKey: 'phys_kinetic_theory', subject: 'PHYSICS', topic: 'Thermodynamics', subtopic: 'Kinetic Theory', name: 'Kinetic Theory of Gases', description: 'Ideal gas law, kinetic interpretation of temperature, degrees of freedom, specific heats of gases, mean free path.', difficulty: 3, prerequisites: ['phys_thermo_1'] },
  { conceptKey: 'phys_thermo_2', subject: 'PHYSICS', topic: 'Thermodynamics', subtopic: 'Laws', name: 'Thermodynamics Laws', description: 'Zeroth, first, and second laws, entropy, isothermal/adiabatic/isochoric processes, Carnot cycle, heat engines, refrigerators.', difficulty: 4, prerequisites: ['phys_kinetic_theory'] },

  // Electricity & Magnetism
  { conceptKey: 'phys_electrostatics', subject: 'PHYSICS', topic: 'Electricity', subtopic: 'Electrostatics', name: 'Electrostatics', description: "Coulomb's law, electric field and field lines, electric potential, equipotential surfaces, Gauss's law, electric dipole.", difficulty: 3, prerequisites: [] },
  { conceptKey: 'phys_capacitors', subject: 'PHYSICS', topic: 'Electricity', subtopic: 'Capacitors', name: 'Capacitors & Dielectrics', description: 'Parallel plate capacitor, series/parallel combinations, energy stored, effect of dielectrics, Van de Graaff generator.', difficulty: 3, prerequisites: ['phys_electrostatics'] },
  { conceptKey: 'phys_current_elec', subject: 'PHYSICS', topic: 'Electricity', subtopic: 'Current', name: 'Current Electricity', description: "Ohm's law, drift velocity, resistance, resistivity, Kirchhoff's laws, Wheatstone bridge, potentiometer, meter bridge.", difficulty: 3, prerequisites: ['phys_electrostatics'] },
  { conceptKey: 'phys_magnetism', subject: 'PHYSICS', topic: 'Electricity', subtopic: 'Magnetism', name: 'Moving Charges & Magnetism', description: "Biot-Savart law, Ampere's law, Lorentz force, motion in magnetic field, cyclotron, solenoid, toroid.", difficulty: 4, prerequisites: ['phys_current_elec'] },
  { conceptKey: 'phys_magnetism_matter', subject: 'PHYSICS', topic: 'Electricity', subtopic: 'Magnetism in Matter', name: 'Magnetism & Matter', description: 'Earth magnetism, magnetic properties of materials, dia/para/ferromagnetism, hysteresis, bar magnet as dipole.', difficulty: 3, prerequisites: ['phys_magnetism'] },
  { conceptKey: 'phys_em_induction', subject: 'PHYSICS', topic: 'Electricity', subtopic: 'EM Induction', name: 'Electromagnetic Induction', description: "Faraday's law, Lenz's law, motional EMF, eddy currents, self and mutual inductance, AC generator.", difficulty: 4, prerequisites: ['phys_magnetism'] },
  { conceptKey: 'phys_ac', subject: 'PHYSICS', topic: 'Electricity', subtopic: 'AC', name: 'Alternating Current', description: 'AC voltage, phasor diagrams, RLC circuits, resonance, power factor, transformers, LC oscillations.', difficulty: 4, prerequisites: ['phys_em_induction', 'phys_capacitors'] },
  { conceptKey: 'phys_em_waves', subject: 'PHYSICS', topic: 'Electricity', subtopic: 'EM Waves', name: 'Electromagnetic Waves', description: "Maxwell's equations (qualitative), EM wave spectrum, properties, uses of different bands.", difficulty: 2, prerequisites: ['phys_em_induction'] },

  // Modern Physics
  { conceptKey: 'phys_dual_nature', subject: 'PHYSICS', topic: 'Modern Physics', subtopic: 'Dual Nature', name: 'Dual Nature of Radiation', description: 'Photoelectric effect, Einstein equation, de Broglie wavelength, Davisson-Germer experiment, photon energy.', difficulty: 3, prerequisites: ['phys_wave_optics'] },
  { conceptKey: 'phys_atoms', subject: 'PHYSICS', topic: 'Modern Physics', subtopic: 'Atoms', name: 'Atoms & Spectra', description: "Bohr model, hydrogen spectrum, energy levels, X-rays, Moseley's law.", difficulty: 3, prerequisites: ['phys_dual_nature', 'phys_electrostatics'] },
  { conceptKey: 'phys_nuclei', subject: 'PHYSICS', topic: 'Modern Physics', subtopic: 'Nuclear', name: 'Nuclei & Radioactivity', description: 'Nuclear binding energy, mass defect, radioactive decay (alpha, beta, gamma), half-life, fission, fusion.', difficulty: 3, prerequisites: ['phys_atoms'] },
  { conceptKey: 'phys_semiconductors', subject: 'PHYSICS', topic: 'Modern Physics', subtopic: 'Semiconductors', name: 'Semiconductor Electronics', description: 'p-n junction, diode, LED, photodiode, solar cell, transistor, logic gates, Boolean algebra.', difficulty: 3, prerequisites: ['phys_current_elec'] },

  // ═══════════════════════════════════════════════
  // CHEMISTRY (~30 concepts)
  // ═══════════════════════════════════════════════

  // Physical Chemistry
  { conceptKey: 'chem_atomic', subject: 'CHEMISTRY', topic: 'Structure', name: 'Atomic Structure', description: 'Bohr model, quantum numbers, electron configuration, aufbau principle, periodic trends, photoelectric effect.', difficulty: 2, prerequisites: [] },
  { conceptKey: 'chem_periodic_table', subject: 'CHEMISTRY', topic: 'Structure', name: 'Periodic Table & Properties', description: 'Periodicity in atomic radius, ionization energy, electron affinity, electronegativity, metallic character.', difficulty: 2, prerequisites: ['chem_atomic'] },
  { conceptKey: 'chem_bonding', subject: 'CHEMISTRY', topic: 'Structure', name: 'Chemical Bonding', description: 'Ionic, covalent, metallic bonds, VSEPR theory, hybridization (sp, sp2, sp3, sp3d, sp3d2), molecular orbital theory, bond order.', difficulty: 3, prerequisites: ['chem_atomic'] },
  { conceptKey: 'chem_states', subject: 'CHEMISTRY', topic: 'Physical Chemistry', name: 'States of Matter', description: 'Ideal gas law, real gases, van der Waals equation, liquefaction, intermolecular forces, liquid state properties.', difficulty: 2, prerequisites: ['chem_bonding'] },
  { conceptKey: 'chem_thermo', subject: 'CHEMISTRY', topic: 'Physical Chemistry', name: 'Chemical Thermodynamics', description: 'Internal energy, enthalpy, Hess law, bond enthalpy, entropy, Gibbs free energy, spontaneity criteria.', difficulty: 3, prerequisites: ['chem_states'] },
  { conceptKey: 'chem_equilibrium', subject: 'CHEMISTRY', topic: 'Physical Chemistry', name: 'Chemical Equilibrium', description: "Le Chatelier's principle, equilibrium constants (Kp, Kc, Ksp), ionic equilibrium, pH, buffer solutions, Henderson-Hasselbalch.", difficulty: 3, prerequisites: ['chem_thermo'] },
  { conceptKey: 'chem_kinetics', subject: 'CHEMISTRY', topic: 'Physical Chemistry', name: 'Chemical Kinetics', description: 'Rate laws, order and molecularity, integrated rate equations, half-life, Arrhenius equation, collision theory, catalysis.', difficulty: 3, prerequisites: ['chem_equilibrium'] },
  { conceptKey: 'chem_solutions', subject: 'CHEMISTRY', topic: 'Physical Chemistry', name: 'Solutions', description: "Colligative properties (boiling point elevation, freezing point depression, osmotic pressure), Raoult's law, Henry's law, Van't Hoff factor.", difficulty: 3, prerequisites: ['chem_states'] },
  { conceptKey: 'chem_redox', subject: 'CHEMISTRY', topic: 'Physical Chemistry', name: 'Electrochemistry', description: 'Oxidation numbers, balancing redox, galvanic cells, electrode potential, Nernst equation, electrolysis, Faraday laws, batteries, corrosion.', difficulty: 3, prerequisites: ['chem_kinetics'] },
  { conceptKey: 'chem_solid_state', subject: 'CHEMISTRY', topic: 'Physical Chemistry', name: 'Solid State', description: 'Crystal lattices, unit cells (cubic systems), packing efficiency, defects, electrical and magnetic properties.', difficulty: 3, prerequisites: ['chem_bonding'] },
  { conceptKey: 'chem_surface', subject: 'CHEMISTRY', topic: 'Physical Chemistry', name: 'Surface Chemistry', description: 'Adsorption (physisorption vs chemisorption), catalysis, colloids (types, properties, Tyndall effect), emulsions.', difficulty: 3, prerequisites: ['chem_solutions'] },

  // Inorganic Chemistry
  { conceptKey: 'chem_hydrogen', subject: 'CHEMISTRY', topic: 'Inorganic', name: 'Hydrogen & s-Block', description: 'Hydrogen isotopes, water properties, alkali and alkaline earth metals, diagonal relationship, biological importance.', difficulty: 2, prerequisites: ['chem_periodic_table'] },
  { conceptKey: 'chem_p_block_1', subject: 'CHEMISTRY', topic: 'Inorganic', name: 'p-Block Elements (Group 13-14)', description: 'Boron family, carbon family, allotropy, borax, silicones, silicates, important compounds.', difficulty: 2, prerequisites: ['chem_periodic_table'] },
  { conceptKey: 'chem_p_block_2', subject: 'CHEMISTRY', topic: 'Inorganic', name: 'p-Block Elements (Group 15-18)', description: 'Nitrogen, phosphorus, oxygen, sulphur families, halogens, noble gases, ozone, interhalogen compounds.', difficulty: 3, prerequisites: ['chem_p_block_1'] },
  { conceptKey: 'chem_d_block', subject: 'CHEMISTRY', topic: 'Inorganic', name: 'd-Block & f-Block Elements', description: 'Transition metals, variable oxidation states, color, magnetic properties, catalytic activity, lanthanoids, actinoids.', difficulty: 3, prerequisites: ['chem_periodic_table'] },
  { conceptKey: 'chem_coordination', subject: 'CHEMISTRY', topic: 'Inorganic', name: 'Coordination Compounds', description: 'Werner theory, IUPAC naming, isomerism (geometric, optical), crystal field theory, spectrochemical series, stability.', difficulty: 4, prerequisites: ['chem_d_block', 'chem_bonding'] },
  { conceptKey: 'chem_qualitative', subject: 'CHEMISTRY', topic: 'Inorganic', name: 'Qualitative Analysis', description: 'Systematic analysis of cations and anions, flame tests, group reagents, confirmatory tests.', difficulty: 2, prerequisites: ['chem_equilibrium'] },

  // Organic Chemistry
  { conceptKey: 'chem_organic_basics', subject: 'CHEMISTRY', topic: 'Organic', name: 'Organic Chemistry Basics', description: 'Nomenclature (IUPAC), structural and stereoisomerism, electronic effects (inductive, mesomeric, hyperconjugation), reaction intermediates.', difficulty: 3, prerequisites: ['chem_bonding'] },
  { conceptKey: 'chem_hydrocarbons', subject: 'CHEMISTRY', topic: 'Organic', name: 'Hydrocarbons', description: 'Alkanes (combustion, halogenation), alkenes (addition), alkynes, aromatic compounds (electrophilic substitution), Huckel rule.', difficulty: 3, prerequisites: ['chem_organic_basics'] },
  { conceptKey: 'chem_haloalkanes', subject: 'CHEMISTRY', topic: 'Organic', name: 'Haloalkanes & Haloarenes', description: 'SN1, SN2 mechanisms, E1, E2 elimination, nucleophilic substitution, Grignard reagents, Wurtz reaction.', difficulty: 3, prerequisites: ['chem_hydrocarbons'] },
  { conceptKey: 'chem_alcohols', subject: 'CHEMISTRY', topic: 'Organic', name: 'Alcohols, Phenols, Ethers', description: 'Preparation, properties, acidity comparison, reactions, Williamson synthesis, electrophilic substitution in phenols.', difficulty: 3, prerequisites: ['chem_haloalkanes'] },
  { conceptKey: 'chem_carbonyls', subject: 'CHEMISTRY', topic: 'Organic', name: 'Aldehydes, Ketones, Carboxylic Acids', description: 'Nucleophilic addition, aldol condensation, Cannizzaro, acidity of carboxylic acids, ester formation, anhydrides.', difficulty: 4, prerequisites: ['chem_alcohols'] },
  { conceptKey: 'chem_amines', subject: 'CHEMISTRY', topic: 'Organic', name: 'Amines & Diazonium', description: 'Classification, basicity, preparation, Gabriel synthesis, Hofmann elimination, diazonium salts, coupling reactions.', difficulty: 3, prerequisites: ['chem_carbonyls'] },
  { conceptKey: 'chem_polymers', subject: 'CHEMISTRY', topic: 'Applied', name: 'Polymers', description: 'Addition vs condensation, natural and synthetic polymers (nylon, Bakelite, rubber), biodegradable polymers.', difficulty: 2, prerequisites: ['chem_organic_basics'] },
  { conceptKey: 'chem_biomolecules', subject: 'CHEMISTRY', topic: 'Applied', name: 'Biomolecules', description: 'Carbohydrates (mono/di/polysaccharides), amino acids, proteins, enzymes, vitamins, nucleic acids, DNA/RNA.', difficulty: 2, prerequisites: ['chem_organic_basics'] },
  { conceptKey: 'chem_env', subject: 'CHEMISTRY', topic: 'Applied', name: 'Environmental Chemistry', description: 'Air/water/soil pollution, greenhouse effect, ozone depletion, acid rain, green chemistry principles, waste management.', difficulty: 1, prerequisites: [] },
  { conceptKey: 'chem_everyday', subject: 'CHEMISTRY', topic: 'Applied', name: 'Chemistry in Everyday Life', description: 'Drugs (analgesics, antibiotics, antiseptics), soaps, detergents, food preservatives, artificial sweeteners.', difficulty: 1, prerequisites: ['chem_organic_basics'] },

  // ═══════════════════════════════════════════════
  // MATHEMATICS (~30 concepts)
  // ═══════════════════════════════════════════════

  // Algebra
  { conceptKey: 'math_sets', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Sets, Relations & Functions', description: 'Set operations, Venn diagrams, types of relations (reflexive, symmetric, transitive, equivalence), types of functions (injective, surjective, bijective).', difficulty: 1, prerequisites: [] },
  { conceptKey: 'math_complex', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Complex Numbers', description: 'Argand plane, modulus, argument, polar and exponential form, De Moivre theorem, nth roots of unity, geometric applications.', difficulty: 3, prerequisites: ['math_sets'] },
  { conceptKey: 'math_quadratic', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Quadratic Equations & Inequalities', description: 'Discriminant, nature of roots, Vieta formulas, quadratic inequalities, modulus equations, location of roots.', difficulty: 2, prerequisites: ['math_sets'] },
  { conceptKey: 'math_sequences', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Sequences & Series', description: 'AP, GP, HP, AGP, summation techniques (telescoping, V_n method), AM-GM-HM inequality, convergence.', difficulty: 3, prerequisites: ['math_quadratic'] },
  { conceptKey: 'math_binomial', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Binomial Theorem', description: 'Binomial expansion, general term, middle term, properties of binomial coefficients, multinomial theorem.', difficulty: 3, prerequisites: ['math_permutations'] },
  { conceptKey: 'math_permutations', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Permutations & Combinations', description: 'Fundamental counting principle, nPr, nCr, arrangements with restrictions, circular permutations, derangements, distribution problems.', difficulty: 3, prerequisites: ['math_sets'] },
  { conceptKey: 'math_matrices', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Matrices & Determinants', description: 'Matrix operations, types, inverse, adjoint, determinant properties, Cramer rule, system of linear equations, rank.', difficulty: 3, prerequisites: ['math_sets'] },
  { conceptKey: 'math_mathematical_induction', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Mathematical Induction', description: 'Principle of induction, strong induction, proving divisibility, inequality, and summation identities.', difficulty: 2, prerequisites: ['math_sequences'] },
  { conceptKey: 'math_logarithms', subject: 'MATHEMATICS', topic: 'Algebra', name: 'Logarithms & Exponentials', description: 'Laws of logarithms, change of base, logarithmic equations and inequalities, exponential growth/decay.', difficulty: 2, prerequisites: ['math_sets'] },

  // Trigonometry
  { conceptKey: 'math_trig', subject: 'MATHEMATICS', topic: 'Trigonometry', name: 'Trigonometric Functions', description: 'Ratios, identities (sum/difference, double/half angle), trigonometric equations, domain, range, graphs.', difficulty: 2, prerequisites: ['math_sets'] },
  { conceptKey: 'math_inverse_trig', subject: 'MATHEMATICS', topic: 'Trigonometry', name: 'Inverse Trigonometric Functions', description: 'Principal values, properties, composition formulas, equations involving inverse trig functions.', difficulty: 3, prerequisites: ['math_trig'] },
  { conceptKey: 'math_trig_equations', subject: 'MATHEMATICS', topic: 'Trigonometry', name: 'Solution of Triangles', description: 'Sine rule, cosine rule, projection formula, area formulas, circumradius, inradius, heights and distances.', difficulty: 3, prerequisites: ['math_trig'] },

  // Calculus
  { conceptKey: 'math_limits', subject: 'MATHEMATICS', topic: 'Calculus', name: 'Limits & Continuity', description: "Limit evaluation (algebraic, trigonometric, exponential), L'Hopital rule, sandwich theorem, continuity, IVT.", difficulty: 3, prerequisites: ['math_trig'] },
  { conceptKey: 'math_derivatives', subject: 'MATHEMATICS', topic: 'Calculus', name: 'Differentiation', description: 'First principles, chain rule, product/quotient rule, implicit and parametric differentiation, logarithmic differentiation.', difficulty: 3, prerequisites: ['math_limits'] },
  { conceptKey: 'math_applications_derivatives', subject: 'MATHEMATICS', topic: 'Calculus', name: 'Applications of Derivatives', description: 'Tangent/normal, rate of change, monotonicity, maxima/minima, Rolle and Lagrange MVT, curve sketching.', difficulty: 3, prerequisites: ['math_derivatives'] },
  { conceptKey: 'math_integrals', subject: 'MATHEMATICS', topic: 'Calculus', name: 'Indefinite Integration', description: 'Standard integrals, substitution, partial fractions, integration by parts, reduction formulas, special techniques.', difficulty: 3, prerequisites: ['math_derivatives'] },
  { conceptKey: 'math_definite_integrals', subject: 'MATHEMATICS', topic: 'Calculus', name: 'Definite Integrals & Area', description: 'Properties of definite integrals, Leibniz rule, Walli formula, area under curves, area between curves.', difficulty: 4, prerequisites: ['math_integrals'] },
  { conceptKey: 'math_diffeq', subject: 'MATHEMATICS', topic: 'Calculus', name: 'Differential Equations', description: 'Formation, order and degree, variable separable, homogeneous, linear first order, exact equations, applications.', difficulty: 4, prerequisites: ['math_integrals'] },

  // Coordinate Geometry
  { conceptKey: 'math_straight_lines', subject: 'MATHEMATICS', topic: 'Geometry', name: 'Straight Lines', description: 'Slope, intercept forms, distance formulas, angle between lines, family of lines, concurrency, locus problems.', difficulty: 2, prerequisites: ['math_sets'] },
  { conceptKey: 'math_circles', subject: 'MATHEMATICS', topic: 'Geometry', name: 'Circles', description: 'Standard and general equation, tangent, normal, chord of contact, family of circles, radical axis, coaxial circles.', difficulty: 3, prerequisites: ['math_straight_lines'] },
  { conceptKey: 'math_conics', subject: 'MATHEMATICS', topic: 'Geometry', name: 'Conic Sections', description: 'Parabola, ellipse, hyperbola: standard forms, tangents, normals, focal chords, eccentricity, latus rectum.', difficulty: 4, prerequisites: ['math_circles'] },
  { conceptKey: 'math_vectors', subject: 'MATHEMATICS', topic: 'Geometry', name: 'Vectors', description: 'Dot product, cross product, scalar triple product, section formula, area of triangle/parallelogram, coplanarity.', difficulty: 3, prerequisites: ['math_matrices'] },
  { conceptKey: 'math_3d_geometry', subject: 'MATHEMATICS', topic: 'Geometry', name: '3D Geometry', description: 'Direction cosines/ratios, equations of line and plane, angle between planes, skew lines, shortest distance.', difficulty: 3, prerequisites: ['math_vectors'] },

  // Statistics & Probability
  { conceptKey: 'math_statistics', subject: 'MATHEMATICS', topic: 'Statistics', name: 'Statistics', description: 'Mean, median, mode, variance, standard deviation, grouped/ungrouped data, ogives.', difficulty: 2, prerequisites: ['math_sets'] },
  { conceptKey: 'math_probability', subject: 'MATHEMATICS', topic: 'Statistics', name: 'Probability', description: 'Conditional probability, Bayes theorem, independent events, random variables, binomial distribution, expectation.', difficulty: 3, prerequisites: ['math_permutations'] },

  // ═══════════════════════════════════════════════
  // BIOLOGY (~25 concepts)
  // ═══════════════════════════════════════════════

  // Cell Biology & Biochemistry
  { conceptKey: 'bio_cell', subject: 'BIOLOGY', topic: 'Cell Biology', name: 'Cell Structure', description: 'Prokaryotic vs eukaryotic cells, cell organelles (nucleus, mitochondria, ER, Golgi, lysosomes, ribosomes), cell membrane structure.', difficulty: 2, prerequisites: [] },
  { conceptKey: 'bio_cell_division', subject: 'BIOLOGY', topic: 'Cell Biology', name: 'Cell Division', description: 'Cell cycle phases, mitosis (stages, significance), meiosis (stages, crossing over, significance), comparison.', difficulty: 3, prerequisites: ['bio_cell'] },
  { conceptKey: 'bio_biomolecules', subject: 'BIOLOGY', topic: 'Biochemistry', name: 'Biomolecules', description: 'Carbohydrates, proteins (primary to quaternary structure), lipids, nucleic acids, vitamins, enzymes (lock-and-key, induced fit).', difficulty: 2, prerequisites: ['bio_cell'] },
  { conceptKey: 'bio_cell_transport', subject: 'BIOLOGY', topic: 'Cell Biology', name: 'Transport in Cells', description: 'Passive transport (diffusion, osmosis, facilitated), active transport, endocytosis, exocytosis, membrane potential.', difficulty: 2, prerequisites: ['bio_cell'] },

  // Genetics & Evolution
  { conceptKey: 'bio_mendelian', subject: 'BIOLOGY', topic: 'Genetics', name: 'Mendelian Genetics', description: "Mendel's laws, monohybrid and dihybrid crosses, incomplete dominance, codominance, multiple alleles, pleiotropy.", difficulty: 3, prerequisites: ['bio_cell_division'] },
  { conceptKey: 'bio_chromosomal', subject: 'BIOLOGY', topic: 'Genetics', name: 'Chromosomal Inheritance', description: 'Sex determination (XX-XY, ZW-ZZ), sex-linked inheritance, linkage, crossing over, chromosomal disorders (Down, Turner, Klinefelter).', difficulty: 3, prerequisites: ['bio_mendelian'] },
  { conceptKey: 'bio_molecular', subject: 'BIOLOGY', topic: 'Genetics', name: 'Molecular Biology', description: 'DNA structure (Watson-Crick), replication (semi-conservative), transcription, genetic code, translation, gene regulation (lac operon).', difficulty: 4, prerequisites: ['bio_chromosomal'] },
  { conceptKey: 'bio_biotech_principles', subject: 'BIOLOGY', topic: 'Biotechnology', name: 'Biotechnology Principles', description: 'Restriction enzymes, cloning vectors, PCR, gel electrophoresis, recombinant DNA technology, DNA fingerprinting.', difficulty: 4, prerequisites: ['bio_molecular'] },
  { conceptKey: 'bio_biotech_applications', subject: 'BIOLOGY', topic: 'Biotechnology', name: 'Biotechnology Applications', description: 'Transgenic organisms, gene therapy, GMOs, Bt crops, golden rice, insulin production, ethical issues.', difficulty: 3, prerequisites: ['bio_biotech_principles'] },
  { conceptKey: 'bio_evolution', subject: 'BIOLOGY', topic: 'Evolution', name: 'Evolution', description: 'Origin of life, Darwinism, modern synthetic theory, Hardy-Weinberg equilibrium, natural selection types, speciation, human evolution.', difficulty: 3, prerequisites: ['bio_mendelian'] },

  // Human Physiology
  { conceptKey: 'bio_digestion', subject: 'BIOLOGY', topic: 'Human Physiology', name: 'Digestion & Absorption', description: 'Alimentary canal, digestive glands, enzymes, digestion in mouth/stomach/intestine, absorption, disorders.', difficulty: 3, prerequisites: ['bio_biomolecules'] },
  { conceptKey: 'bio_breathing', subject: 'BIOLOGY', topic: 'Human Physiology', name: 'Breathing & Gas Exchange', description: 'Respiratory organs, mechanism of breathing, gas exchange, oxygen and CO2 transport, respiratory volumes, disorders.', difficulty: 3, prerequisites: ['bio_cell'] },
  { conceptKey: 'bio_circulation', subject: 'BIOLOGY', topic: 'Human Physiology', name: 'Body Fluids & Circulation', description: 'Blood composition, blood groups (ABO, Rh), coagulation, heart anatomy, cardiac cycle, ECG, blood pressure, disorders.', difficulty: 3, prerequisites: ['bio_cell'] },
  { conceptKey: 'bio_excretion', subject: 'BIOLOGY', topic: 'Human Physiology', name: 'Excretory System', description: 'Kidney structure, nephron, urine formation (filtration, reabsorption, secretion), regulation, dialysis, disorders.', difficulty: 3, prerequisites: ['bio_circulation'] },
  { conceptKey: 'bio_locomotion', subject: 'BIOLOGY', topic: 'Human Physiology', name: 'Locomotion & Movement', description: 'Types of movement, skeletal system, joints, muscle structure, sliding filament theory, disorders (arthritis, osteoporosis).', difficulty: 2, prerequisites: ['bio_cell'] },
  { conceptKey: 'bio_neural', subject: 'BIOLOGY', topic: 'Human Physiology', name: 'Neural Control', description: 'Neuron structure, nerve impulse transmission, synapse, central and peripheral nervous system, reflex arc, brain anatomy.', difficulty: 3, prerequisites: ['bio_cell_transport'] },
  { conceptKey: 'bio_hormones', subject: 'BIOLOGY', topic: 'Human Physiology', name: 'Chemical Coordination', description: 'Endocrine glands, hormones and their functions, feedback mechanisms, disorders (diabetes, dwarfism, goitre).', difficulty: 3, prerequisites: ['bio_neural'] },
  { conceptKey: 'bio_immunity', subject: 'BIOLOGY', topic: 'Human Physiology', name: 'Immunity', description: 'Innate and adaptive immunity, humoral and cell-mediated, antibodies, vaccination, allergies, autoimmunity, AIDS.', difficulty: 3, prerequisites: ['bio_circulation'] },

  // Plant Biology
  { conceptKey: 'bio_plant_morphology', subject: 'BIOLOGY', topic: 'Plant Biology', name: 'Plant Morphology & Anatomy', description: 'Root, stem, leaf modifications, flower parts, inflorescence types, tissue systems (meristematic, permanent).', difficulty: 2, prerequisites: [] },
  { conceptKey: 'bio_photosynthesis', subject: 'BIOLOGY', topic: 'Plant Biology', name: 'Photosynthesis', description: 'Light reactions, photosystems I & II, Calvin cycle, C3/C4/CAM pathways, photorespiration, factors affecting.', difficulty: 3, prerequisites: ['bio_cell', 'bio_biomolecules'] },
  { conceptKey: 'bio_respiration', subject: 'BIOLOGY', topic: 'Plant Biology', name: 'Plant Respiration', description: 'Glycolysis, Krebs cycle, electron transport chain, oxidative phosphorylation, fermentation, respiratory quotient.', difficulty: 3, prerequisites: ['bio_photosynthesis'] },
  { conceptKey: 'bio_plant_growth', subject: 'BIOLOGY', topic: 'Plant Biology', name: 'Plant Growth & Hormones', description: 'Growth phases, plant hormones (auxins, gibberellins, cytokinins, ethylene, ABA), photoperiodism, vernalization.', difficulty: 3, prerequisites: ['bio_plant_morphology'] },

  // Ecology & Reproduction
  { conceptKey: 'bio_ecology', subject: 'BIOLOGY', topic: 'Ecology', name: 'Ecology & Ecosystems', description: 'Organism interactions, population attributes, food chains/webs, ecological pyramids, nutrient cycling, ecological succession.', difficulty: 2, prerequisites: [] },
  { conceptKey: 'bio_biodiversity', subject: 'BIOLOGY', topic: 'Ecology', name: 'Biodiversity & Conservation', description: 'Patterns of biodiversity, loss of biodiversity, conservation strategies (in-situ, ex-situ), hotspots, Red Data Book.', difficulty: 2, prerequisites: ['bio_ecology'] },
  { conceptKey: 'bio_reproduction', subject: 'BIOLOGY', topic: 'Reproduction', name: 'Reproduction in Organisms', description: 'Asexual (fission, budding, fragmentation, spores), sexual reproduction in flowering plants (pollination, fertilization, embryo).', difficulty: 3, prerequisites: ['bio_cell_division'] },
  { conceptKey: 'bio_human_reproduction', subject: 'BIOLOGY', topic: 'Reproduction', name: 'Human Reproduction', description: 'Male and female reproductive systems, gametogenesis, menstrual cycle, fertilization, implantation, pregnancy, parturition.', difficulty: 3, prerequisites: ['bio_reproduction'] },
  { conceptKey: 'bio_reproductive_health', subject: 'BIOLOGY', topic: 'Reproduction', name: 'Reproductive Health', description: 'Population control, contraception methods, STDs, infertility treatments (IVF, ICSI), amniocentesis, MTP.', difficulty: 2, prerequisites: ['bio_human_reproduction'] },

  // ═══════════════════════════════════════════════
  // CODING (~50 concepts)
  // ═══════════════════════════════════════════════

  // ── Basics ─────────────────────────────────────
  { conceptKey: 'code_intro', subject: 'CODING', topic: 'Basics', name: 'Introduction to Programming', description: 'What is programming, compiled vs interpreted languages, IDEs and editors, writing and running first program, stdin/stdout, REPL.', difficulty: 1, prerequisites: [] },
  { conceptKey: 'code_variables', subject: 'CODING', topic: 'Basics', name: 'Variables & Data Types', description: 'Declaring variables, integers, floats, strings, booleans, type conversion (implicit/explicit), constants, naming conventions, dynamic vs static typing.', difficulty: 1, prerequisites: ['code_intro'] },
  { conceptKey: 'code_operators', subject: 'CODING', topic: 'Basics', name: 'Operators & Expressions', description: 'Arithmetic, comparison, logical, bitwise operators, operator precedence, type coercion, short-circuit evaluation, ternary expressions.', difficulty: 1, prerequisites: ['code_variables'] },
  { conceptKey: 'code_control', subject: 'CODING', topic: 'Basics', name: 'Control Flow', description: 'If/else, switch/case, ternary operator, nested conditions, boolean algebra, truthiness/falsiness, guard clauses, early returns.', difficulty: 1, prerequisites: ['code_operators'] },
  { conceptKey: 'code_loops', subject: 'CODING', topic: 'Basics', name: 'Loops', description: 'For, while, do-while, for-each/for-in/for-of, break, continue, nested loops, loop patterns (accumulator, sentinel, counter).', difficulty: 2, prerequisites: ['code_control'] },
  { conceptKey: 'code_functions', subject: 'CODING', topic: 'Basics', name: 'Functions', description: 'Defining and calling functions, parameters/arguments, return values, scope (local/global/block), default/rest params, closures, pure functions, first-class functions.', difficulty: 2, prerequisites: ['code_loops'] },
  { conceptKey: 'code_recursion', subject: 'CODING', topic: 'Basics', name: 'Recursion', description: 'Base case and recursive case, call stack visualization, factorial, fibonacci, Tower of Hanoi, recursion vs iteration, tail recursion, memoization intro.', difficulty: 3, prerequisites: ['code_functions'] },
  { conceptKey: 'code_error_handling', subject: 'CODING', topic: 'Basics', name: 'Error Handling & Debugging', description: 'Syntax vs runtime vs logical errors, try/catch/finally, custom exceptions, debugger tools, breakpoints, print debugging, reading stack traces.', difficulty: 2, prerequisites: ['code_functions'] },
  { conceptKey: 'code_io_files', subject: 'CODING', topic: 'Basics', name: 'File I/O & Streams', description: 'Reading/writing files, text vs binary mode, file paths, buffered I/O, CSV/JSON parsing, stdin/stdout redirection, with/using statements for resource cleanup.', difficulty: 2, prerequisites: ['code_functions'] },

  // ── Data Structures ────────────────────────────
  { conceptKey: 'code_arrays', subject: 'CODING', topic: 'Data Structures', name: 'Arrays & Lists', description: 'Creation, indexing, iteration, slicing, multi-dimensional arrays, common operations (map, filter, reduce), dynamic arrays (ArrayList/vector), time complexity.', difficulty: 2, prerequisites: ['code_loops'] },
  { conceptKey: 'code_strings', subject: 'CODING', topic: 'Data Structures', name: 'Strings', description: 'Immutability, concatenation, slicing, searching, StringBuilder/StringBuffer, regular expressions, encoding (ASCII, UTF-8, Unicode).', difficulty: 2, prerequisites: ['code_arrays'] },
  { conceptKey: 'code_hashmaps', subject: 'CODING', topic: 'Data Structures', name: 'Hash Maps & Sets', description: 'Key-value storage, hash functions, collision handling (chaining, open addressing), O(1) average lookup, sets, frequency counting patterns, load factor.', difficulty: 3, prerequisites: ['code_arrays'] },
  { conceptKey: 'code_stacks_queues', subject: 'CODING', topic: 'Data Structures', name: 'Stacks & Queues', description: 'LIFO/FIFO principles, array and linked-list implementations, monotonic stack, deque, applications (expression evaluation, BFS, undo, bracket matching).', difficulty: 3, prerequisites: ['code_arrays'] },
  { conceptKey: 'code_linked_lists', subject: 'CODING', topic: 'Data Structures', name: 'Linked Lists', description: 'Singly and doubly linked lists, insertion/deletion at various positions, cycle detection (Floyd), reversal, sentinel nodes, skip lists.', difficulty: 3, prerequisites: ['code_functions'] },
  { conceptKey: 'code_trees', subject: 'CODING', topic: 'Data Structures', name: 'Trees', description: 'Binary trees, BST (insert, search, delete), tree traversals (inorder, preorder, postorder, level-order), height, balanced trees (AVL, Red-Black overview).', difficulty: 4, prerequisites: ['code_linked_lists', 'code_recursion'] },
  { conceptKey: 'code_tries', subject: 'CODING', topic: 'Data Structures', name: 'Tries & Advanced Trees', description: 'Trie (prefix tree) for string lookup, insertion, autocomplete. Segment trees for range queries. Fenwick tree (BIT) for prefix sums. Applications in competitive programming.', difficulty: 4, prerequisites: ['code_trees'] },
  { conceptKey: 'code_heaps', subject: 'CODING', topic: 'Data Structures', name: 'Heaps & Priority Queues', description: 'Min-heap, max-heap, heapify, insert/extract operations, heap sort, priority queue applications (K-th largest, merge K sorted, scheduling, median stream).', difficulty: 4, prerequisites: ['code_trees'] },
  { conceptKey: 'code_graphs_ds', subject: 'CODING', topic: 'Data Structures', name: 'Graph Representations', description: 'Adjacency list vs matrix, directed/undirected, weighted graphs, graph terminology (degree, path, cycle, connectivity), implicit graphs.', difficulty: 3, prerequisites: ['code_hashmaps'] },
  { conceptKey: 'code_union_find', subject: 'CODING', topic: 'Data Structures', name: 'Union-Find (Disjoint Set)', description: 'Union by rank, path compression, amortized near-O(1) operations, applications (connected components, Kruskal MST, cycle detection in undirected graphs).', difficulty: 4, prerequisites: ['code_graphs_ds'] },

  // ── OOP & Design ───────────────────────────────
  { conceptKey: 'code_objects', subject: 'CODING', topic: 'OOP', name: 'Objects & Classes', description: 'Defining classes, creating instances, constructors, properties, methods, this/self reference, encapsulation, access modifiers (public/private/protected).', difficulty: 3, prerequisites: ['code_functions'] },
  { conceptKey: 'code_inheritance', subject: 'CODING', topic: 'OOP', name: 'Inheritance & Polymorphism', description: 'Extending classes, method overriding, super keyword, interfaces/protocols, abstract classes, composition vs inheritance, Liskov substitution.', difficulty: 3, prerequisites: ['code_objects'] },
  { conceptKey: 'code_design_patterns', subject: 'CODING', topic: 'OOP', name: 'Design Patterns', description: 'Singleton, Factory, Observer, Strategy, Decorator, Builder. When to use each, SOLID principles, DRY, KISS, dependency injection basics.', difficulty: 4, prerequisites: ['code_inheritance'] },

  // ── Algorithms ──────────────────────────────────
  { conceptKey: 'code_complexity', subject: 'CODING', topic: 'Algorithms', name: 'Time & Space Complexity', description: 'Big O/Omega/Theta notation, best/average/worst case, O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n), space complexity, amortized analysis, master theorem.', difficulty: 3, prerequisites: ['code_functions', 'code_arrays'] },
  { conceptKey: 'code_sorting', subject: 'CODING', topic: 'Algorithms', name: 'Sorting Algorithms', description: 'Bubble, selection, insertion (O(n^2)), merge sort, quicksort (O(n log n)), counting/radix sort (O(n+k)), stability, comparison lower bound Ω(n log n), practical choices.', difficulty: 3, prerequisites: ['code_complexity'] },
  { conceptKey: 'code_searching', subject: 'CODING', topic: 'Algorithms', name: 'Searching & Binary Search', description: 'Linear search, binary search (iterative/recursive), binary search on answer, two pointers, sliding window, bisect left/right, rotated array search.', difficulty: 3, prerequisites: ['code_sorting'] },
  { conceptKey: 'code_graph_algos', subject: 'CODING', topic: 'Algorithms', name: 'Graph Algorithms', description: 'BFS, DFS, topological sort (Kahn, DFS-based), cycle detection, shortest path (Dijkstra, Bellman-Ford, Floyd-Warshall), MST (Prim, Kruskal), bipartite check.', difficulty: 4, prerequisites: ['code_graphs_ds', 'code_stacks_queues'] },
  { conceptKey: 'code_dp', subject: 'CODING', topic: 'Algorithms', name: 'Dynamic Programming', description: 'Overlapping subproblems, optimal substructure, memoization (top-down), tabulation (bottom-up), state optimization, classic problems (knapsack, LCS, LIS, coin change, edit distance, matrix chain).', difficulty: 5, prerequisites: ['code_recursion', 'code_complexity'] },
  { conceptKey: 'code_greedy', subject: 'CODING', topic: 'Algorithms', name: 'Greedy Algorithms', description: 'Greedy choice property, activity selection, Huffman coding, fractional knapsack, interval scheduling, job sequencing, proving correctness via exchange argument.', difficulty: 4, prerequisites: ['code_sorting', 'code_complexity'] },
  { conceptKey: 'code_backtracking', subject: 'CODING', topic: 'Algorithms', name: 'Backtracking', description: 'Exhaustive search with pruning, N-Queens, Sudoku solver, permutations/combinations generation, subset sum, constraint satisfaction, branch and bound overview.', difficulty: 4, prerequisites: ['code_recursion'] },
  { conceptKey: 'code_bit_manipulation', subject: 'CODING', topic: 'Algorithms', name: 'Bit Manipulation', description: 'AND, OR, XOR, NOT, left/right shift, checking/setting/clearing bits, counting set bits, power of 2 check, XOR tricks (single number, swap), bitmask DP intro.', difficulty: 3, prerequisites: ['code_operators'] },
  { conceptKey: 'code_string_algos', subject: 'CODING', topic: 'Algorithms', name: 'String Algorithms', description: 'Pattern matching (KMP, Rabin-Karp), Z-algorithm, longest palindromic substring (Manacher), suffix array overview, anagram/permutation problems.', difficulty: 4, prerequisites: ['code_strings', 'code_hashmaps'] },
  { conceptKey: 'code_math_algos', subject: 'CODING', topic: 'Algorithms', name: 'Mathematical Algorithms', description: 'GCD (Euclidean), prime sieve (Eratosthenes), modular arithmetic, fast exponentiation, combinatorics in code (nCr mod p), matrix exponentiation for recurrences.', difficulty: 4, prerequisites: ['code_complexity'] },

  // ── Functional Programming ─────────────────────
  { conceptKey: 'code_fp_basics', subject: 'CODING', topic: 'Functional Programming', name: 'Functional Programming Concepts', description: 'Pure functions, immutability, higher-order functions, map/filter/reduce, function composition, currying, partial application, avoiding side effects.', difficulty: 3, prerequisites: ['code_functions'] },
  { conceptKey: 'code_closures_iterators', subject: 'CODING', topic: 'Functional Programming', name: 'Closures, Generators & Iterators', description: 'Lexical scoping and closures, generator functions (yield), lazy evaluation, iterator protocol, async generators, practical uses (pagination, streaming).', difficulty: 3, prerequisites: ['code_fp_basics'] },

  // ── Web Development ────────────────────────────
  { conceptKey: 'code_html_css', subject: 'CODING', topic: 'Web Development', name: 'HTML & CSS', description: 'Semantic HTML5, forms, accessibility (ARIA), CSS selectors, box model, flexbox, grid, responsive design, media queries, CSS variables, animations.', difficulty: 2, prerequisites: ['code_intro'] },
  { conceptKey: 'code_js_dom', subject: 'CODING', topic: 'Web Development', name: 'JavaScript & the DOM', description: 'DOM manipulation, event listeners, event bubbling/capturing, fetch API, promises, async/await, localStorage, JSON, ES6+ features.', difficulty: 3, prerequisites: ['code_html_css', 'code_functions'] },
  { conceptKey: 'code_react', subject: 'CODING', topic: 'Web Development', name: 'React Fundamentals', description: 'Components, JSX, props, state (useState), effects (useEffect), conditional rendering, lists/keys, event handling, lifting state, component lifecycle.', difficulty: 3, prerequisites: ['code_js_dom'] },
  { conceptKey: 'code_react_advanced', subject: 'CODING', topic: 'Web Development', name: 'Advanced React Patterns', description: 'Context API, useReducer, custom hooks, React Router, code splitting (lazy/Suspense), performance (memo, useMemo, useCallback), state management (Zustand/Redux overview).', difficulty: 4, prerequisites: ['code_react'] },
  { conceptKey: 'code_node_express', subject: 'CODING', topic: 'Web Development', name: 'Node.js & Express', description: 'Event loop, modules (CommonJS/ESM), npm/yarn, Express routing, middleware, request/response cycle, error handling, environment variables, CORS.', difficulty: 3, prerequisites: ['code_js_dom'] },
  { conceptKey: 'code_rest_apis', subject: 'CODING', topic: 'Web Development', name: 'REST APIs & HTTP', description: 'HTTP methods (GET, POST, PUT, DELETE, PATCH), status codes, headers, request/response body, REST principles, API versioning, authentication (JWT, API keys), rate limiting.', difficulty: 3, prerequisites: ['code_node_express'] },
  { conceptKey: 'code_typescript', subject: 'CODING', topic: 'Web Development', name: 'TypeScript', description: 'Static typing, type annotations, interfaces, type aliases, generics, enums, union/intersection types, type guards, utility types (Partial, Omit, Pick), strict mode.', difficulty: 3, prerequisites: ['code_js_dom'] },

  // ── Databases ──────────────────────────────────
  { conceptKey: 'code_sql', subject: 'CODING', topic: 'Databases', name: 'SQL & Relational Databases', description: 'Tables, rows, columns, primary/foreign keys, SELECT, JOINs (inner, left, right), WHERE, GROUP BY, HAVING, indexes, normalization (1NF–3NF), transactions, ACID.', difficulty: 3, prerequisites: ['code_functions'] },
  { conceptKey: 'code_nosql', subject: 'CODING', topic: 'Databases', name: 'NoSQL & Document Databases', description: 'Document stores (MongoDB), key-value (Redis), column-family, graph databases, CAP theorem, eventual consistency, when to use SQL vs NoSQL, JSON document modeling.', difficulty: 3, prerequisites: ['code_sql'] },
  { conceptKey: 'code_orm', subject: 'CODING', topic: 'Databases', name: 'ORMs & Query Builders', description: 'Object-Relational Mapping concepts, Prisma/Sequelize/SQLAlchemy, migrations, schema design, N+1 problem, eager vs lazy loading, raw queries when needed.', difficulty: 3, prerequisites: ['code_sql'] },

  // ── DevOps & Tools ─────────────────────────────
  { conceptKey: 'code_git', subject: 'CODING', topic: 'DevOps & Tools', name: 'Git & Version Control', description: 'Repositories, staging, commits, branching, merging, rebasing, resolving conflicts, pull requests, .gitignore, git log, cherry-pick, stash, collaborative workflows (Gitflow, trunk-based).', difficulty: 2, prerequisites: ['code_intro'] },
  { conceptKey: 'code_cli', subject: 'CODING', topic: 'DevOps & Tools', name: 'Command Line & Shell', description: 'Terminal navigation, file operations, piping, redirection, environment variables, PATH, shell scripting basics, cron jobs, SSH, common tools (curl, grep, awk).', difficulty: 2, prerequisites: ['code_intro'] },
  { conceptKey: 'code_docker', subject: 'CODING', topic: 'DevOps & Tools', name: 'Containers & Docker', description: 'Containerization vs VMs, Dockerfile, images, containers, volumes, docker-compose, networking, container registries, multi-stage builds, CI/CD pipeline basics.', difficulty: 3, prerequisites: ['code_cli', 'code_node_express'] },
  { conceptKey: 'code_testing', subject: 'CODING', topic: 'DevOps & Tools', name: 'Testing', description: 'Unit tests, integration tests, end-to-end tests, test pyramid, TDD basics, mocking/stubbing, code coverage, testing frameworks (Jest, pytest, JUnit), assertion patterns.', difficulty: 3, prerequisites: ['code_functions', 'code_error_handling'] },
  { conceptKey: 'code_cicd', subject: 'CODING', topic: 'DevOps & Tools', name: 'CI/CD & Deployment', description: 'Continuous integration, continuous delivery/deployment, GitHub Actions/GitLab CI, automated testing pipelines, staging vs production, blue-green deployments, rollbacks.', difficulty: 3, prerequisites: ['code_testing', 'code_git'] },

  // ── System Design (Intro) ─────────────────────
  { conceptKey: 'code_sysdesign_basics', subject: 'CODING', topic: 'System Design', name: 'System Design Fundamentals', description: 'Client-server architecture, load balancers, caching (Redis, CDN), horizontal vs vertical scaling, databases vs message queues, microservices vs monolith, latency vs throughput.', difficulty: 4, prerequisites: ['code_rest_apis', 'code_sql'] },
  { conceptKey: 'code_auth_security', subject: 'CODING', topic: 'System Design', name: 'Authentication & Security', description: 'Password hashing (bcrypt), JWT tokens, OAuth 2.0 flow, session management, HTTPS/TLS, XSS, CSRF, SQL injection prevention, input validation, CORS, rate limiting.', difficulty: 3, prerequisites: ['code_rest_apis'] },
  { conceptKey: 'code_networking', subject: 'CODING', topic: 'System Design', name: 'Networking Basics', description: 'DNS, IP, TCP vs UDP, HTTP vs HTTPS, request/response lifecycle, latency sources, keep-alive, WebSockets, common HTTP headers.', difficulty: 3, prerequisites: ['code_rest_apis'] },
  { conceptKey: 'code_concurrency', subject: 'CODING', topic: 'System Design', name: 'Concurrency & Async', description: 'Processes vs threads, async/await, event loop, race conditions, locks, deadlocks, parallelism vs concurrency, when to use workers/queues.', difficulty: 3, prerequisites: ['code_functions'] },
  { conceptKey: 'code_caching', subject: 'CODING', topic: 'System Design', name: 'Caching & CDNs', description: 'Cache-aside vs write-through, TTLs, cache invalidation, CDN edge caching, stale-while-revalidate, cache stampede, cache hit ratio.', difficulty: 4, prerequisites: ['code_sysdesign_basics'] },
  { conceptKey: 'code_message_queues', subject: 'CODING', topic: 'System Design', name: 'Message Queues & Eventing', description: 'Asynchronous processing, queues vs topics, producers/consumers, at-least-once vs exactly-once delivery, retries and DLQs, pub/sub patterns.', difficulty: 4, prerequisites: ['code_sysdesign_basics'] },
  { conceptKey: 'code_api_design', subject: 'CODING', topic: 'Web Development', name: 'API Design & Versioning', description: 'RESTful resource modeling, consistent error responses, pagination strategies, versioning (URI, headers), idempotency, rate limits, API documentation (OpenAPI).', difficulty: 3, prerequisites: ['code_rest_apis'] },

  // ═══════════════════════════════════════════════
  // AI LEARNING (~40 concepts)
  // ═══════════════════════════════════════════════

  // ── Foundations ─────────────────────────────────
  { conceptKey: 'ai_what_is_ai', subject: 'AI_LEARNING', topic: 'Foundations', name: 'What is Artificial Intelligence?', description: 'Defining AI, brief history (Turing, McCarthy, AlexNet moment, ChatGPT era), narrow vs general vs super AI, AI in daily life, AI winters and springs.', difficulty: 1, prerequisites: [] },
  { conceptKey: 'ai_ml_types', subject: 'AI_LEARNING', topic: 'Foundations', name: 'Types of Machine Learning', description: 'Supervised learning (classification, regression), unsupervised learning (clustering, dimensionality reduction), reinforcement learning, semi-supervised, self-supervised.', difficulty: 2, prerequisites: ['ai_what_is_ai'] },
  { conceptKey: 'ai_data_basics', subject: 'AI_LEARNING', topic: 'Foundations', name: 'Data for AI', description: 'Structured vs unstructured data, data collection strategies, data cleaning, handling missing values and outliers, train/validation/test splits, data leakage pitfalls.', difficulty: 2, prerequisites: ['ai_what_is_ai'] },
  { conceptKey: 'ai_data_labeling', subject: 'AI_LEARNING', topic: 'Foundations', name: 'Data Labeling & Quality', description: 'Labeling strategies (manual, weak supervision), inter-annotator agreement, labeling bias, gold standards, active learning, data audits for quality and coverage.', difficulty: 2, prerequisites: ['ai_data_basics'] },
  { conceptKey: 'ai_python_for_ml', subject: 'AI_LEARNING', topic: 'Foundations', name: 'Python for ML', description: 'NumPy (arrays, broadcasting, vectorized ops), Pandas (DataFrames, groupby, merging), Matplotlib/Seaborn visualization, Jupyter notebooks, scikit-learn API patterns.', difficulty: 2, prerequisites: ['ai_data_basics'] },

  // ── Math for ML ────────────────────────────────
  { conceptKey: 'ai_linear_algebra', subject: 'AI_LEARNING', topic: 'Math for ML', name: 'Linear Algebra for ML', description: 'Vectors, matrices, dot product, matrix multiplication, transpose, inverse, eigenvalues/eigenvectors, SVD, PCA connection, how neural nets are matrix operations.', difficulty: 3, prerequisites: ['ai_what_is_ai'] },
  { conceptKey: 'ai_calculus_ml', subject: 'AI_LEARNING', topic: 'Math for ML', name: 'Calculus for ML', description: 'Derivatives and gradients, partial derivatives, chain rule (backprop foundation), gradient descent intuition, convexity, loss landscape, Hessian overview.', difficulty: 3, prerequisites: ['ai_linear_algebra'] },
  { conceptKey: 'ai_probability_stats', subject: 'AI_LEARNING', topic: 'Math for ML', name: 'Probability & Statistics for ML', description: 'Bayes theorem, distributions (normal, Bernoulli, categorical), expectation/variance, MLE, MAP estimation, hypothesis testing, p-values, A/B testing.', difficulty: 3, prerequisites: ['ai_what_is_ai'] },

  // ── Core ML Concepts ───────────────────────────
  { conceptKey: 'ai_features_labels', subject: 'AI_LEARNING', topic: 'Core Concepts', name: 'Features & Labels', description: 'Input features vs target labels, feature engineering (polynomial, interaction), feature selection (correlation, mutual information), one-hot encoding, normalization/standardization, embeddings preview.', difficulty: 2, prerequisites: ['ai_data_basics'] },
  { conceptKey: 'ai_classification', subject: 'AI_LEARNING', topic: 'Core Concepts', name: 'Classification', description: 'Binary and multiclass classification, decision boundaries, logistic regression, K-nearest neighbors, decision trees, Naive Bayes, SVM, confusion matrix, ROC curve.', difficulty: 3, prerequisites: ['ai_features_labels'] },
  { conceptKey: 'ai_regression', subject: 'AI_LEARNING', topic: 'Core Concepts', name: 'Regression', description: 'Linear regression, polynomial regression, regularized regression (Ridge, Lasso, ElasticNet), loss functions (MSE, MAE, Huber), gradient descent, learning rate, R-squared, residual analysis.', difficulty: 3, prerequisites: ['ai_features_labels'] },
  { conceptKey: 'ai_clustering', subject: 'AI_LEARNING', topic: 'Core Concepts', name: 'Clustering', description: 'K-means (initialization, convergence), hierarchical clustering (agglomerative), DBSCAN (density-based), Gaussian mixture models, silhouette score, elbow method, applications.', difficulty: 3, prerequisites: ['ai_features_labels'] },
  { conceptKey: 'ai_dim_reduction', subject: 'AI_LEARNING', topic: 'Core Concepts', name: 'Dimensionality Reduction', description: 'Curse of dimensionality, PCA (eigendecomposition, explained variance), t-SNE (perplexity, visualization), UMAP, feature importance, when and why to reduce dimensions.', difficulty: 3, prerequisites: ['ai_linear_algebra', 'ai_features_labels'] },
  { conceptKey: 'ai_causal_inference', subject: 'AI_LEARNING', topic: 'Core Concepts', name: 'Causal Inference', description: 'Correlation vs causation, confounders, causal graphs (DAGs), do-calculus intuition, randomized experiments, propensity scores, counterfactual reasoning.', difficulty: 4, prerequisites: ['ai_probability_stats'] },
  { conceptKey: 'ai_ensemble', subject: 'AI_LEARNING', topic: 'Core Concepts', name: 'Ensemble Methods', description: 'Random forests, bagging, boosting (AdaBoost, gradient boosting, XGBoost, LightGBM), stacking, why ensembles reduce variance, feature importance from trees.', difficulty: 4, prerequisites: ['ai_classification'] },

  // ── Training & Evaluation ──────────────────────
  { conceptKey: 'ai_training', subject: 'AI_LEARNING', topic: 'Training & Evaluation', name: 'Model Training', description: 'Training loop, loss minimization, gradient descent variants (SGD, momentum, Adam, AdaGrad), learning rate scheduling (warmup, cosine decay), convergence criteria, batch size effects.', difficulty: 3, prerequisites: ['ai_classification', 'ai_regression'] },
  { conceptKey: 'ai_evaluation', subject: 'AI_LEARNING', topic: 'Training & Evaluation', name: 'Model Evaluation', description: 'Accuracy, precision, recall, F1 score, ROC-AUC, PR curves, cross-validation (k-fold, stratified), confusion matrix interpretation, class imbalance strategies (SMOTE, class weights).', difficulty: 3, prerequisites: ['ai_training'] },
  { conceptKey: 'ai_overfitting', subject: 'AI_LEARNING', topic: 'Training & Evaluation', name: 'Overfitting & Regularization', description: 'Bias-variance tradeoff, underfitting vs overfitting diagnosis (learning curves), L1/L2 regularization, dropout, early stopping, data augmentation, model selection.', difficulty: 3, prerequisites: ['ai_evaluation'] },
  { conceptKey: 'ai_hyperparameter', subject: 'AI_LEARNING', topic: 'Training & Evaluation', name: 'Hyperparameter Tuning', description: 'Grid search, random search, Bayesian optimization (Optuna), learning rate, batch size, architecture choices, nested cross-validation, computational budgets.', difficulty: 3, prerequisites: ['ai_overfitting'] },

  // ── Deep Learning ──────────────────────────────
  { conceptKey: 'ai_neural_nets', subject: 'AI_LEARNING', topic: 'Deep Learning', name: 'Neural Networks', description: 'Perceptron, multi-layer networks, activation functions (sigmoid, tanh, ReLU, GELU, Swish), forward pass, backpropagation, weight initialization (Xavier, He), batch normalization.', difficulty: 4, prerequisites: ['ai_training', 'ai_calculus_ml'] },
  { conceptKey: 'ai_cnn', subject: 'AI_LEARNING', topic: 'Deep Learning', name: 'Convolutional Neural Networks', description: 'Convolution operation, filters/kernels, stride/padding, pooling, feature maps, architectures (LeNet → AlexNet → VGG → ResNet → EfficientNet), transfer learning, data augmentation for images.', difficulty: 4, prerequisites: ['ai_neural_nets'] },
  { conceptKey: 'ai_rnn', subject: 'AI_LEARNING', topic: 'Deep Learning', name: 'Recurrent Neural Networks', description: 'Sequential data, vanishing/exploding gradients, LSTM (forget/input/output gates), GRU, bidirectional RNNs, sequence-to-sequence with attention, applications (time series, language).', difficulty: 4, prerequisites: ['ai_neural_nets'] },
  { conceptKey: 'ai_transformers', subject: 'AI_LEARNING', topic: 'Deep Learning', name: 'Transformers', description: 'Attention mechanism, self-attention (Q, K, V), multi-head attention, positional encoding, encoder-decoder architecture, BERT (bidirectional), GPT (autoregressive), T5, scaling laws.', difficulty: 5, prerequisites: ['ai_rnn'] },
  { conceptKey: 'ai_autoencoders', subject: 'AI_LEARNING', topic: 'Deep Learning', name: 'Autoencoders & VAEs', description: 'Encoder-decoder bottleneck, reconstruction loss, denoising autoencoders, variational autoencoders (reparameterization trick, ELBO), latent space, anomaly detection applications.', difficulty: 4, prerequisites: ['ai_neural_nets'] },
  { conceptKey: 'ai_gans', subject: 'AI_LEARNING', topic: 'Deep Learning', name: 'Generative Adversarial Networks', description: 'Generator vs discriminator, minimax game, mode collapse, training instability, DCGAN, StyleGAN, conditional GANs, FID score, image synthesis and editing applications.', difficulty: 5, prerequisites: ['ai_neural_nets'] },
  { conceptKey: 'ai_diffusion', subject: 'AI_LEARNING', topic: 'Deep Learning', name: 'Diffusion Models', description: 'Forward (noise-adding) and reverse (denoising) process, DDPM, noise scheduling, U-Net backbone, classifier-free guidance, Stable Diffusion architecture, text-to-image generation.', difficulty: 5, prerequisites: ['ai_autoencoders'] },
  { conceptKey: 'ai_graph_ml', subject: 'AI_LEARNING', topic: 'Deep Learning', name: 'Graph Neural Networks', description: 'Graph data representation, message passing, Graph Convolutional Networks (GCN), node/edge embeddings, link prediction, graph classification, real-world uses (social networks, molecules).', difficulty: 5, prerequisites: ['ai_neural_nets'] },

  // ── NLP Deep Dive ──────────────────────────────
  { conceptKey: 'ai_nlp_basics', subject: 'AI_LEARNING', topic: 'NLP', name: 'NLP Fundamentals', description: 'Tokenization (word, subword, BPE), word embeddings (Word2Vec, GloVe), bag of words, TF-IDF, text preprocessing (stopwords, stemming, lemmatization), sentiment analysis.', difficulty: 3, prerequisites: ['ai_neural_nets'] },
  { conceptKey: 'ai_llm_internals', subject: 'AI_LEARNING', topic: 'NLP', name: 'LLM Architecture & Training', description: 'GPT architecture deep dive, pre-training (next token prediction), tokenizer (BPE, SentencePiece), context window, KV cache, Flash Attention, training data curation, compute scaling.', difficulty: 5, prerequisites: ['ai_transformers'] },
  { conceptKey: 'ai_prompt_engineering', subject: 'AI_LEARNING', topic: 'NLP', name: 'Prompt Engineering', description: 'Zero-shot, few-shot, chain-of-thought prompting, system/user/assistant roles, temperature/top-p, structured output (JSON mode), prompt injection awareness, evaluation of prompts.', difficulty: 3, prerequisites: ['ai_transformers'] },
  { conceptKey: 'ai_rag', subject: 'AI_LEARNING', topic: 'NLP', name: 'RAG & Information Retrieval', description: 'Retrieval-Augmented Generation, vector embeddings, semantic search, vector databases (Pinecone, Chroma, pgvector), chunking strategies, re-ranking, hybrid search, hallucination reduction.', difficulty: 4, prerequisites: ['ai_prompt_engineering'] },
  { conceptKey: 'ai_finetuning', subject: 'AI_LEARNING', topic: 'NLP', name: 'Fine-Tuning & Adaptation', description: 'Full fine-tuning vs parameter-efficient (LoRA, QLoRA, adapters), instruction tuning, RLHF (reward model, PPO), DPO, dataset preparation, evaluation (perplexity, BLEU, human eval).', difficulty: 5, prerequisites: ['ai_llm_internals'] },

  // ── Applications ──────────────────────────────
  { conceptKey: 'ai_time_series', subject: 'AI_LEARNING', topic: 'Applications', name: 'Time Series Forecasting', description: 'Trend/seasonality, stationarity, ARIMA, exponential smoothing, forecasting metrics (MAE, MAPE), sequence models (LSTM/Transformer), anomaly detection in time series.', difficulty: 4, prerequisites: ['ai_regression', 'ai_rnn'] },
  { conceptKey: 'ai_recommenders', subject: 'AI_LEARNING', topic: 'Applications', name: 'Recommendation Systems', description: 'Collaborative filtering, content-based filtering, matrix factorization, implicit vs explicit feedback, ranking metrics (MRR, NDCG), cold-start problem, hybrid recommenders.', difficulty: 4, prerequisites: ['ai_linear_algebra', 'ai_clustering'] },

  // ── Computer Vision Deep Dive ──────────────────
  { conceptKey: 'ai_cv_basics', subject: 'AI_LEARNING', topic: 'Computer Vision', name: 'Computer Vision Fundamentals', description: 'Image classification, object detection (YOLO, SSD, Faster R-CNN), semantic/instance segmentation, face recognition, pose estimation, image preprocessing, data augmentation.', difficulty: 4, prerequisites: ['ai_cnn'] },
  { conceptKey: 'ai_vision_transformers', subject: 'AI_LEARNING', topic: 'Computer Vision', name: 'Vision Transformers', description: 'ViT (patch embedding, position encoding), CLIP (contrastive text-image learning), DINO (self-supervised), SAM (segment anything), multimodal vision-language models.', difficulty: 5, prerequisites: ['ai_cv_basics', 'ai_transformers'] },

  // ── Reinforcement Learning ─────────────────────
  { conceptKey: 'ai_rl_basics', subject: 'AI_LEARNING', topic: 'Reinforcement Learning', name: 'Reinforcement Learning Fundamentals', description: 'Markov decision processes, states/actions/rewards, policy vs value functions, Bellman equation, Q-learning, SARSA, exploration vs exploitation (epsilon-greedy, UCB).', difficulty: 4, prerequisites: ['ai_neural_nets'] },
  { conceptKey: 'ai_deep_rl', subject: 'AI_LEARNING', topic: 'Reinforcement Learning', name: 'Deep Reinforcement Learning', description: 'DQN (experience replay, target networks), policy gradient (REINFORCE), actor-critic (A2C, A3C), PPO, applications (Atari, Go, robotics, RLHF for LLMs).', difficulty: 5, prerequisites: ['ai_rl_basics'] },

  // ── MLOps & Deployment ─────────────────────────
  { conceptKey: 'ai_mlops', subject: 'AI_LEARNING', topic: 'MLOps', name: 'MLOps & Model Deployment', description: 'ML lifecycle, experiment tracking (MLflow, W&B), model versioning, containerization (Docker), serving (FastAPI, TorchServe, TF Serving), A/B testing, monitoring, data/concept drift.', difficulty: 4, prerequisites: ['ai_overfitting'] },
  { conceptKey: 'ai_model_optimization', subject: 'AI_LEARNING', topic: 'MLOps', name: 'Model Optimization & Efficiency', description: 'Quantization (INT8, INT4, GPTQ), pruning, knowledge distillation, ONNX, TensorRT, edge deployment, latency vs accuracy tradeoffs, batch inference, model compression.', difficulty: 4, prerequisites: ['ai_mlops'] },
  { conceptKey: 'ai_model_monitoring', subject: 'AI_LEARNING', topic: 'MLOps', name: 'Model Monitoring & Drift', description: 'Monitoring accuracy and latency in production, data drift vs concept drift, alerting thresholds, shadow deployments, feedback loops, retraining triggers.', difficulty: 4, prerequisites: ['ai_mlops'] },

  // ── AI Agents & Tools ──────────────────────────
  { conceptKey: 'ai_agents', subject: 'AI_LEARNING', topic: 'AI Agents', name: 'AI Agents & Tool Use', description: 'ReAct pattern (reason + act), function calling, multi-step planning, memory (short-term, long-term), tool orchestration, LangChain/LlamaIndex overview, agent evaluation.', difficulty: 4, prerequisites: ['ai_prompt_engineering'] },
  { conceptKey: 'ai_multimodal', subject: 'AI_LEARNING', topic: 'AI Agents', name: 'Multimodal AI', description: 'Text + image (GPT-4V, Gemini), text + audio (Whisper + TTS), video understanding, cross-modal embeddings, CLIP, multimodal reasoning, real-world applications.', difficulty: 4, prerequisites: ['ai_agents', 'ai_cv_basics'] },

  // ── Ethics & Safety (expanded) ─────────────────
  { conceptKey: 'ai_bias_fairness', subject: 'AI_LEARNING', topic: 'Ethics & Safety', name: 'AI Bias & Fairness', description: 'Sources of bias (data, algorithmic, societal), fairness metrics (demographic parity, equalized odds), bias detection tools, dataset documentation (datasheets, model cards).', difficulty: 2, prerequisites: ['ai_what_is_ai'] },
  { conceptKey: 'ai_safety_ethics', subject: 'AI_LEARNING', topic: 'Ethics & Safety', name: 'AI Safety & Alignment', description: 'AI alignment problem, Goodhart law, reward hacking, interpretability (LIME, SHAP, attention visualization), privacy (differential privacy, federated learning), deepfakes, regulation (EU AI Act).', difficulty: 3, prerequisites: ['ai_bias_fairness'] },
  { conceptKey: 'ai_responsible', subject: 'AI_LEARNING', topic: 'Ethics & Safety', name: 'Responsible AI Development', description: 'Model documentation, red-teaming, content filtering, watermarking AI outputs, environmental cost of training, open vs closed source tradeoffs, licensing (Apache, MIT, RAIL).', difficulty: 2, prerequisites: ['ai_safety_ethics'] },

  // ═══════════════════════════════════════════════
  // ECONOMICS (~15 concepts)
  // ═══════════════════════════════════════════════

  // Microeconomics
  { conceptKey: 'econ_intro', subject: 'ECONOMICS', topic: 'Foundations', name: 'Introduction to Economics', description: 'Scarcity, opportunity cost, economic systems (market, command, mixed), positive vs normative economics.', difficulty: 1, prerequisites: [] },
  { conceptKey: 'econ_demand_supply', subject: 'ECONOMICS', topic: 'Microeconomics', name: 'Demand & Supply', description: 'Law of demand/supply, elasticity (price, income, cross), determinants, market equilibrium, shifts vs movements.', difficulty: 2, prerequisites: ['econ_intro'] },
  { conceptKey: 'econ_consumer', subject: 'ECONOMICS', topic: 'Microeconomics', name: 'Consumer Theory', description: 'Utility (cardinal, ordinal), indifference curves, budget line, consumer equilibrium, income/substitution effects.', difficulty: 3, prerequisites: ['econ_demand_supply'] },
  { conceptKey: 'econ_production', subject: 'ECONOMICS', topic: 'Microeconomics', name: 'Production & Costs', description: 'Production function, returns to scale, short-run vs long-run costs, average/marginal cost, economies of scale.', difficulty: 3, prerequisites: ['econ_demand_supply'] },
  { conceptKey: 'econ_market_structures', subject: 'ECONOMICS', topic: 'Microeconomics', name: 'Market Structures', description: 'Perfect competition, monopoly, monopolistic competition, oligopoly, price determination, profit maximization.', difficulty: 3, prerequisites: ['econ_production'] },
  { conceptKey: 'econ_market_failures', subject: 'ECONOMICS', topic: 'Microeconomics', name: 'Market Failures', description: 'Externalities (positive, negative), public goods, common resources, information asymmetry, government intervention.', difficulty: 3, prerequisites: ['econ_market_structures'] },

  // Macroeconomics
  { conceptKey: 'econ_national_income', subject: 'ECONOMICS', topic: 'Macroeconomics', name: 'National Income Accounting', description: 'GDP, GNP, NNP, methods of calculation (income, expenditure, value-added), nominal vs real GDP, GDP deflator.', difficulty: 2, prerequisites: ['econ_intro'] },
  { conceptKey: 'econ_money_banking', subject: 'ECONOMICS', topic: 'Macroeconomics', name: 'Money & Banking', description: 'Functions of money, commercial banking (credit creation), central bank (monetary policy tools: repo, CRR, SLR, OMO), money multiplier.', difficulty: 3, prerequisites: ['econ_national_income'] },
  { conceptKey: 'econ_fiscal', subject: 'ECONOMICS', topic: 'Macroeconomics', name: 'Government Budget & Fiscal Policy', description: 'Revenue and capital receipts/expenditure, budget deficit types (revenue, fiscal, primary), fiscal policy tools, public debt.', difficulty: 3, prerequisites: ['econ_national_income'] },
  { conceptKey: 'econ_inflation', subject: 'ECONOMICS', topic: 'Macroeconomics', name: 'Inflation & Unemployment', description: 'Types of inflation (demand-pull, cost-push), Phillips curve, CPI, WPI, unemployment types, stagflation.', difficulty: 3, prerequisites: ['econ_money_banking'] },

  // International & Indian Economy
  { conceptKey: 'econ_trade', subject: 'ECONOMICS', topic: 'International', name: 'International Trade', description: 'Comparative advantage, balance of payments (current, capital account), exchange rate determination, trade policies (tariffs, quotas).', difficulty: 3, prerequisites: ['econ_demand_supply'] },
  { conceptKey: 'econ_indian_planning', subject: 'ECONOMICS', topic: 'Indian Economy', name: 'Indian Economic Development', description: 'Five year plans, liberalization (1991 reforms: LPG), NITI Aayog, poverty, inequality, HDI, demographic dividend.', difficulty: 2, prerequisites: ['econ_intro'] },
  { conceptKey: 'econ_agriculture', subject: 'ECONOMICS', topic: 'Indian Economy', name: 'Indian Agriculture', description: 'Green revolution, organic farming, agricultural marketing, MSP, food security, subsidies, land reforms.', difficulty: 2, prerequisites: ['econ_indian_planning'] },
  { conceptKey: 'econ_industry_infra', subject: 'ECONOMICS', topic: 'Indian Economy', name: 'Industry & Infrastructure', description: 'Industrial policy, PSEs, disinvestment, energy, transport, telecommunications, rural development.', difficulty: 2, prerequisites: ['econ_indian_planning'] },
  { conceptKey: 'econ_sustainable', subject: 'ECONOMICS', topic: 'Indian Economy', name: 'Sustainable Development', description: 'Environmental economics, resource depletion, climate change economics, SDGs, green GDP, circular economy.', difficulty: 2, prerequisites: ['econ_market_failures'] },
];

async function seed() {
  console.log(`Seeding ${CONCEPTS.length} concepts...`);

  let created = 0;
  let updated = 0;

  for (const c of CONCEPTS) {
    const result = await prisma.concept.upsert({
      where: { conceptKey: c.conceptKey },
      update: {
        name: c.name,
        description: c.description,
        subject: c.subject,
        topic: c.topic,
        subtopic: c.subtopic,
        difficulty: c.difficulty,
        prerequisites: c.prerequisites,
      },
      create: {
        conceptKey: c.conceptKey,
        name: c.name,
        description: c.description,
        subject: c.subject,
        topic: c.topic,
        subtopic: c.subtopic,
        difficulty: c.difficulty,
        prerequisites: c.prerequisites,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  // Summary stats
  const bySubject = CONCEPTS.reduce<Record<string, number>>((acc, c) => {
    acc[c.subject] = (acc[c.subject] || 0) + 1;
    return acc;
  }, {});

  const prereqCount = CONCEPTS.reduce((sum, c) => sum + c.prerequisites.length, 0);

  console.log(`\nSeed complete:`);
  console.log(`  Total concepts: ${CONCEPTS.length}`);
  console.log(`  Prerequisite edges: ${prereqCount}`);
  console.log(`  By subject:`);
  for (const [subj, count] of Object.entries(bySubject).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${subj}: ${count}`);
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
