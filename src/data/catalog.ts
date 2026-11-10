// Bundled service catalogue: the snapshot the site serves when the CMS is
// unreachable, and the baseline each CMS document is poured over
// (src/lib/cms-content.ts). Since 12/09/2026 the CMS owns name, copy, price,
// duration, section and order; these values are only what a cold instance
// shows during an outage. Legacy fields (measures/protocol/goodFor/tagline)
// are retained so existing components keep working.

export type ProductCategory =
  | "membership"
  | "assessment"
  | "test"
  | "medical"
  | "training"
  | "package";

export type MembershipDetail = {
  goal: string;
  initialAssessment?: string; // assessment slug
  trainingFrequency?: string;
  doctorInvolvement?: string;
  retesting?: string;
  medicationNote?: string;
  bloodworkNote?: string;
  commitment?: string;
  pausePolicy?: string;
};

export type TrainingDetail = {
  sessionCount?: number;
  validity?: string;
  bookingRules?: string;
};

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  shortDescription?: string; // plain-language card copy (brief)
  price: number; // EUR
  priceTbd?: boolean; // true where the brief marks price [Confirm]
  pricePeriod?: string;
  starred?: boolean;
  section?: string;
  duration?: string;
  durationTbd?: boolean;
  category: ProductCategory;
  categoryLabel: string;
  bookingUrl?: string; // Momence deep-link (added when the account is wired)
  status?: "available" | "coming-soon" | "hidden";
  badges?: string[]; // e.g. "Included in the GLP-1 Medical Membership"
  measures: string[];
  protocol: string[];
  goodFor: string[];
  giftable?: boolean;

  // assessment-specific
  includedTests?: string[]; // test slugs (relational inclusion)
  includedInMembership?: string; // membership slug
  comparisonOrder?: number;

  // membership-specific
  membership?: MembershipDetail;

  // training-specific
  training?: TrainingDetail;
};

export const memberships: Product[] = [
  {
    slug: "health-performance",
    name: "Health & Performance",
    tagline: "Measure. Train. Improve. Repeat.",
    shortDescription:
      "Comprehensive testing and twice-weekly training for measurable progress.",
    price: 450,
    priceTbd: true,
    duration: "per month",
    category: "membership",
    categoryLabel: "Membership",
    status: "available",
    measures: [
      "Initial Performance Assessment",
      "Two training sessions per week",
      "Personalised program",
      "Progress reviews",
      "Scheduled retesting",
    ],
    protocol: [
      "Complete your Performance Assessment to set your baseline.",
      "Build a personalised training program from your results.",
      "Train twice per week with the Volumes Lab trainers.",
      "Review and retest to track progress over time.",
    ],
    goodFor: [
      "People who want to improve health and performance through objective testing and regular training",
    ],
    giftable: false,
    membership: {
      goal: "Health and performance",
      initialAssessment: "performance",
      trainingFrequency: "Two sessions per week",
      doctorInvolvement: "Included at the start",
      retesting: "Every three months",
      commitment: "3-month minimum commitment",
    },
  },
  {
    slug: "glp-1",
    name: "GLP-1 Medical",
    tagline: "Medical weight management. Preserve metabolism, muscle and strength.",
    shortDescription:
      "Doctor-led weight management with objective measurement and weekly training.",
    price: 550,
    priceTbd: true,
    duration: "per month",
    category: "membership",
    categoryLabel: "Membership",
    status: "available",
    measures: [
      "Initial doctor consultation",
      "Foundational Assessment",
      "Prescription where medically appropriate",
      "One training session per week",
      "Unlimited 3D body scans",
      "Quarterly remeasurement and doctor review",
    ],
    protocol: [
      "Meet the team, including your doctor and trainers.",
      "Complete the Foundational Assessment and required external bloodwork before treatment.",
      "Begin treatment where clinically appropriate (medication purchased separately).",
      "Train once per week and track progress with unlimited 3D scans.",
      "Review every three months with your doctor.",
    ],
    goodFor: [
      "Adults pursuing medically supervised weight management while protecting strength, lean mass and metabolic health",
    ],
    giftable: false,
    membership: {
      goal: "Medically supported weight management",
      initialAssessment: "foundational",
      trainingFrequency: "One session per week",
      doctorInvolvement: "Initial consultation, then doctor review every three months",
      retesting: "Every three months",
      medicationNote:
        "Medication is prescribed where medically appropriate and purchased separately. It is not included in the membership price.",
      bloodworkNote:
        "Bloodwork is required before treatment begins and is completed through an external provider, not in-house.",
      commitment: "3-month minimum commitment",
    },
  },
];

export const assessments: Product[] = [
  {
    slug: "foundational",
    name: "Foundational",
    tagline: "Establish your essential baseline.",
    shortDescription:
      "Establish your essential baseline across body composition, bone density, strength and metabolism.",
    price: 490,
    priceTbd: true,
    duration: "90 minutes",
    durationTbd: true,
    category: "assessment",
    categoryLabel: "Complete Assessment",
    status: "available",
    comparisonOrder: 1,
    includedTests: ["3d-body-composition", "bone-mineral-density", "grip-strength", "metabolic-assessment"],
    includedInMembership: "glp-1",
    badges: ["Included in the GLP-1 Medical Membership"],
    measures: ["3-D Body Composition", "Bone Mineral Density", "Grip Strength", "Metabolic Assessment"],
    protocol: [
      "Intake and health history review.",
      "Full body composition and bone density scan.",
      "Strength and metabolic baseline testing.",
      "Clinical debrief with a personalised action plan.",
    ],
    goodFor: ["First-time visitors", "Anyone establishing a health baseline"],
    giftable: true,
  },
  {
    slug: "longevity",
    name: "Longevity",
    tagline: "Understand the major drivers of long-term physical health.",
    shortDescription:
      "Add cardiovascular fitness and full strength testing for a broader view of long-term health.",
    price: 890,
    priceTbd: true,
    duration: "3 hours",
    durationTbd: true,
    category: "assessment",
    categoryLabel: "Complete Assessment",
    status: "available",
    comparisonOrder: 2,
    includedTests: [
      "3d-body-composition",
      "bone-mineral-density",
      "grip-strength",
      "metabolic-assessment",
      "strength-assessment",
      "vo2max",
    ],
    measures: ["Everything in Foundational", "Advanced Strength Assessment", "VO2max Test"],
    protocol: [
      "Foundational tests plus VO2max and full strength testing.",
      "Cardio-metabolic screening with our physician.",
      "Longevity-focused report with recommendations.",
    ],
    goodFor: ["Adults optimizing for healthspan", "Preventive-health focused clients"],
    giftable: true,
  },
  {
    slug: "performance",
    name: "Performance",
    tagline: "Our most complete health and performance assessment.",
    shortDescription: "Our most comprehensive assessment, adding mobility and gait analysis.",
    price: 1190,
    priceTbd: true,
    duration: "3.5 hours",
    durationTbd: true,
    category: "assessment",
    categoryLabel: "Complete Assessment",
    status: "available",
    comparisonOrder: 3,
    includedTests: [
      "3d-body-composition",
      "bone-mineral-density",
      "grip-strength",
      "metabolic-assessment",
      "strength-assessment",
      "vo2max",
      "mobility-assessment",
      "gait-analysis",
    ],
    includedInMembership: "health-performance",
    badges: ["Included in the Health & Performance Membership"],
    measures: ["Everything in Longevity", "Mobility Assessment", "Gait Analysis"],
    protocol: [
      "Complete lab performance workup across all six pillars.",
      "Full physiological, movement and gait analysis.",
      "Coach-led debrief translating results into a plan.",
    ],
    goodFor: ["Anyone chasing measurable gains", "People wanting the complete picture"],
    giftable: true,
  },
];

// Order = the order on the homepage until the CMS says otherwise (each SKU
// has an Order field since 12/09/2026): body & bone, metabolism & cardio,
// strength & movement.
export const tests: Product[] = [
  {
    slug: "3d-body-composition",
    name: "3D Body Composition",
    tagline: "Track body shape, measurements and body composition over time.",
    shortDescription: "Track body shape, physical measurements and body composition changes over time.",
    price: 90,
    priceTbd: true,
    duration: "20 minutes",
    category: "test",
    categoryLabel: "Individual Test",
    status: "available",
    measures: ["Segmental body fat & lean mass", "Circumferences", "Posture symmetry"],
    protocol: ["Change into scan attire.", "30-second full-body 3-D scan.", "Results walkthrough with your coach."],
    goodFor: ["Anyone tracking body-composition changes objectively"],
    giftable: true,
  },
  {
    slug: "bone-mineral-density",
    name: "Bone Mineral Density",
    tagline: "Measure bone density and identify areas that may require attention.",
    shortDescription: "Measure bone density and identify areas that may require attention.",
    price: 180,
    priceTbd: true,
    duration: "30 minutes",
    category: "test",
    categoryLabel: "Individual Test",
    status: "available",
    measures: ["Bone mineral density", "T-score & Z-score", "Fracture-risk context"],
    protocol: ["Screening questionnaire.", "Bone density scan of hip and lumbar spine.", "Physician-led results review."],
    goodFor: ["Adults 40+", "Post-menopausal women", "People with high training loads"],
    giftable: true,
  },
  {
    slug: "metabolic-assessment",
    name: "Metabolic Assessment",
    tagline: "Measure how much energy your body uses at rest.",
    shortDescription: "Measure how much energy your body uses at rest.",
    price: 190,
    priceTbd: true,
    duration: "45 minutes",
    category: "test",
    categoryLabel: "Individual Test",
    status: "available",
    measures: ["Resting metabolic rate", "Substrate utilisation", "Caloric requirements"],
    protocol: ["Fasted arrival.", "Indirect calorimetry.", "Nutrition-focused debrief."],
    goodFor: ["Anyone dialling in body composition or nutrition"],
    giftable: true,
  },
  {
    slug: "vo2max",
    name: "VO2Max Test",
    tagline: "Measure cardiorespiratory fitness and aerobic capacity.",
    shortDescription: "Measure cardiorespiratory fitness and aerobic capacity.",
    price: 260,
    priceTbd: true,
    duration: "60 minutes",
    category: "test",
    categoryLabel: "Individual Test",
    status: "available",
    measures: ["VO2max", "Ventilatory thresholds", "Heart-rate training zones"],
    protocol: [
      "Warm-up and calibration.",
      "Graded exercise test on treadmill or bike until volitional exhaustion.",
      "Personalised training zones and debrief.",
    ],
    goodFor: ["Runners, cyclists, triathletes", "Anyone building a science-based training plan"],
    giftable: true,
  },
  {
    slug: "grip-strength",
    name: "Grip Strength",
    tagline: "Measure handgrip strength as a simple indicator of physical capacity.",
    shortDescription: "Measure handgrip strength as a simple indicator of physical capacity.",
    price: 40,
    priceTbd: true,
    duration: "15 minutes",
    category: "test",
    categoryLabel: "Individual Test",
    status: "available",
    measures: ["Peak grip force", "Left-right asymmetry", "Age-normed percentile"],
    protocol: ["Warm-up.", "Standardised handgrip trials.", "Instant percentile scoring."],
    goodFor: ["Everyone, grip strength is one of the strongest predictors of longevity"],
    giftable: true,
  },
  {
    slug: "strength-assessment",
    name: "Strength Assessment",
    tagline: "Measure strength across key movement patterns and establish a practical baseline.",
    shortDescription: "Measure strength across key movement patterns and establish a practical baseline.",
    price: 160,
    priceTbd: true,
    duration: "60 minutes",
    category: "test",
    categoryLabel: "Individual Test",
    status: "available",
    measures: ["Isometric force", "Left-right asymmetry", "Force-velocity profile"],
    protocol: ["Warm-up.", "Force-plate strength tests.", "Coach-led debrief."],
    goodFor: ["Strength athletes", "Anyone benchmarking force production"],
    giftable: true,
  },
  {
    slug: "mobility-assessment",
    name: "Mobility Assessment",
    tagline: "Assess range of motion and identify movement restrictions.",
    shortDescription: "Assess range of motion and identify movement restrictions.",
    price: 130,
    priceTbd: true,
    duration: "45 minutes",
    category: "test",
    categoryLabel: "Individual Test",
    status: "available",
    measures: ["Joint ROM", "Movement patterns", "Asymmetry index"],
    protocol: ["Movement interview.", "Full-body mobility screen.", "Corrective exercise plan."],
    goodFor: ["Desk workers", "People wanting durability"],
    giftable: true,
  },
  {
    slug: "gait-analysis",
    name: "Gait Analysis",
    tagline: "Understand how you walk or run and identify relevant movement patterns.",
    shortDescription: "Understand how you walk or run and identify relevant movement patterns.",
    price: 220,
    priceTbd: true,
    duration: "60 minutes",
    category: "test",
    categoryLabel: "Individual Test",
    status: "available",
    measures: ["Kinematics", "Ground contact & cadence", "Asymmetries"],
    protocol: ["Movement screen.", "Instrumented treadmill capture.", "Coach debrief with cues and drills."],
    goodFor: ["Runners", "People returning from injury"],
    giftable: true,
  },
];

// Medical appointments (client homepage architecture, 07/08/2026):
// "MEDICAL APPOINTMENT: Talk to a doctor about peptides / GLP-1".
export const medical: Product[] = [
  {
    slug: "doctor-meeting",
    name: "Doctor Meeting",
    tagline: "Talk to a doctor about peptides and GLP-1.",
    shortDescription:
      "A 30-minute consultation with a Volumes Lab doctor to discuss peptide and GLP-1 treatment.",
    price: 90,
    priceTbd: true,
    duration: "30 minutes",
    durationTbd: true,
    category: "medical",
    categoryLabel: "Medical Appointment",
    status: "available",
    measures: [
      "One-to-one consultation with a doctor",
      "Review of your goals and medical history",
      "Discussion of peptide and GLP-1 options",
      "Clear next steps, including any required bloodwork",
    ],
    protocol: [
      "Book a 30-minute slot with the medical team.",
      "Discuss your goals, history and suitability for treatment.",
      "Agree next steps, including testing and external bloodwork where needed.",
    ],
    goodFor: [
      "Anyone considering medically supervised weight management or peptide therapy",
    ],
    giftable: false,
  },
];

// Training: standalone session + packages (brief section 8).
export const training: Product[] = [
  {
    slug: "training-session",
    name: "Personal Training Session",
    tagline: "Book one personal training session with the Volumes Lab performance team.",
    shortDescription:
      "A single private session. May include strength, cardiovascular training, intervals, conditioning and mobility.",
    price: 70,
    priceTbd: true,
    duration: "60 minutes",
    durationTbd: true,
    category: "training",
    categoryLabel: "Training Session",
    status: "available",
    measures: ["Private 1:1 session", "Adapted to your ability and goals"],
    protocol: ["Book a slot with the performance team.", "Train around your goals, not a fixed format."],
    goodFor: ["Anyone wanting to train without joining a membership"],
    giftable: true,
    training: { sessionCount: 1 },
  },
  {
    slug: "pt-pack-3",
    name: "Personal Training, 3 sessions",
    tagline: "A short block of sessions to get started properly.",
    shortDescription: "Three private sessions with the Volumes Lab performance team.",
    price: 240,
    priceTbd: true,
    category: "training",
    categoryLabel: "Training Package",
    status: "available",
    measures: ["3 x 1h sessions", "Adapted to your ability and goals"],
    protocol: ["Use within 2 months."],
    goodFor: ["Anyone trying personal training before committing to more"],
    giftable: true,
    training: { sessionCount: 3, validity: "2 months" },
  },
  {
    slug: "pt-pack-5",
    name: "Personal Training, 5 sessions",
    tagline: "Train regularly for a full training block.",
    shortDescription: "Five private sessions with the Volumes Lab performance team.",
    price: 390,
    priceTbd: true,
    category: "training",
    categoryLabel: "Training Package",
    status: "available",
    measures: ["5 x 1h sessions", "Programme design", "Progress notes"],
    protocol: ["Use within 3 months."],
    goodFor: ["Anyone training consistently without a membership"],
    giftable: true,
    training: { sessionCount: 5, validity: "3 months" },
  },
  {
    slug: "pt-pack-10",
    name: "Personal Training, 10 sessions",
    tagline: "Purchase a set of sessions and train regularly without joining a membership.",
    shortDescription: "Ten private sessions with the Volumes Lab performance team.",
    price: 750,
    priceTbd: true,
    category: "training",
    categoryLabel: "Training Package",
    status: "available",
    measures: ["10 x 1h sessions", "Programme design", "Retest at end"],
    protocol: ["Use within 4 months."],
    goodFor: ["Committed clients wanting structure without a full membership"],
    giftable: true,
    training: { sessionCount: 10, validity: "4 months" },
  },
  {
    slug: "cardio-pack-4",
    name: "Cardio Pack, 4 sessions",
    tagline: "Four VO2max-informed cardio sessions with a coach.",
    shortDescription: "Four coached cardio sessions with heart-rate zone guidance.",
    price: 320,
    priceTbd: true,
    category: "training",
    categoryLabel: "Training Package",
    status: "available",
    measures: ["4 x 1h sessions", "Heart-rate zone coaching", "Progress notes"],
    protocol: ["Book at your own pace within 3 months."],
    goodFor: ["Anyone starting structured cardio"],
    giftable: true,
    training: { sessionCount: 4, validity: "3 months" },
  },
];

const _catalogue = [...memberships, ...assessments, ...tests, ...medical, ...training];
export const allProducts: Product[] = _catalogue.filter(
  (p, i) => _catalogue.findIndex((x) => x.slug === p.slug) === i,
);

export function findProduct(slug: string): Product | undefined {
  return allProducts.find((p) => p.slug === slug);
}

export function getTests(slugs: string[]): Product[] {
  return slugs.map((s) => tests.find((t) => t.slug === s)).filter((t): t is Product => Boolean(t));
}

// Canonical path for a product's detail page: flat, straight off the root
// (client, 14/09/2026: "volumeslab.com/private-training-session"). The old
// /tests/…, /assessments/…, /medical/…, /training/… and /memberships/…
// addresses redirect here permanently, so a slug has to be unique across the
// five collections: two SKUs with the same slug would share one address and
// the first in catalogue order wins.
export function productPath(p: Pick<Product, "slug">): string {
  return `/${p.slug}`;
}

