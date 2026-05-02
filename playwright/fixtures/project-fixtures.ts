/**
 * Hand-rolled fixture data shaped to match the GROQ projections used by the
 * portfolio surfaces. Kept here (not imported from `lib/`) so the Playwright
 * suite stays decoupled from server-only modules.
 */

export const emptyReferenceData = {
  groups: [],
  directorates: [],
  businessAreas: [],
  people: [],
  capabilities: [],
  actions: [],
};

export const sampleReferenceData = {
  groups: [{ _id: "g-crime", name: "Crime", pendingReview: false }],
  directorates: [
    {
      _id: "d-crime-tech",
      name: "Crime Tech",
      pendingReview: false,
      group: { _id: "g-crime", name: "Crime" },
    },
  ],
  businessAreas: [{ _id: "ba-courts", name: "Courts", pendingReview: false }],
  people: [
    {
      _id: "p-1",
      name: "Alice Owner",
      email: "alice@example.gov.uk",
      pendingReview: false,
    },
  ],
  capabilities: [{ _id: "c-1", name: "Summarisation", pendingReview: false }],
  actions: [],
};

/**
 * Shape returned by the portfolio LIST GROQ query (lib/portfolio/queries.ts).
 * Reference fields are flattened to plain names by the projection.
 */
export const projects = {
  alpha: {
    _id: "project-alpha",
    name: "Alpha pilot",
    description: "Summarising crown court bundles for triage.",
    projectStage: "pilot",
    group: "Crime",
    directorate: "Crime Tech",
    businessAreas: ["Courts"],
    capability: "Summarisation",
    deliveryOwner: { name: "Alice Owner", email: "alice@example.gov.uk" },
    linkedActionsCount: 0,
    lastUpdatedAt: "2026-04-01T10:00:00Z",
  },
  beta: {
    _id: "project-beta",
    name: "Beta scan",
    description: "Scanning vendor catalogue for capability gaps.",
    projectStage: "scan",
    group: "Crime",
    directorate: "Crime Tech",
    businessAreas: ["Courts"],
    capability: "Discovery",
    deliveryOwner: { name: "Bob Owner", email: "bob@example.gov.uk" },
    linkedActionsCount: 1,
    lastUpdatedAt: "2026-03-15T09:30:00Z",
  },
  gamma: {
    _id: "project-gamma",
    name: "Gamma scale",
    description: "Scaling jury notice automation across regions.",
    projectStage: "scale",
    group: "Crime",
    directorate: "Crime Tech",
    businessAreas: ["Courts"],
    capability: "Automation",
    deliveryOwner: { name: "Carol Owner", email: "carol@example.gov.uk" },
    linkedActionsCount: 2,
    lastUpdatedAt: "2026-02-28T14:00:00Z",
  },
};

/**
 * Shape returned by the dossier GROQ query (lib/portfolio/dossier.ts).
 * Includes a single Update with Portable Text content so the dossier test
 * can assert on rendered rich text.
 */
export const dossiers = {
  alpha: {
    _id: "project-alpha",
    name: "Alpha pilot",
    description: "Summarising crown court bundles for triage.",
    projectStage: "pilot",
    group: { _id: "g-crime", name: "Crime" },
    directorate: {
      _id: "d-crime-tech",
      name: "Crime Tech",
      group: { _id: "g-crime", name: "Crime" },
    },
    businessAreas: [{ _id: "ba-courts", name: "Courts" }],
    deliveryOwner: { name: "Alice Owner", email: "alice@example.gov.uk" },
    additionalDeliveryOwners: [],
    businessLead: null,
    legalLead: null,
    capability: { _id: "c-1", name: "Summarisation" },
    additionalCapabilities: [],
    actionPlanLinks: [],
    governanceTier: 2,
    governanceBody: "Crime Programme Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "in-progress",
    mojEthicsFrameworkUse: "in-progress",
    githubUrl: null,
    updates: [
      {
        _key: "u1",
        title: "Pilot wave 1 complete",
        body: [
          {
            _type: "block",
            _key: "u1b1",
            style: "normal",
            children: [
              {
                _type: "span",
                _key: "u1b1s1",
                text: "Two courts onboarded; jury bundle triage time down 38%.",
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
        authorEmail: "alice@example.gov.uk",
        timestamp: "2026-04-01T10:00:00Z",
      },
    ],
    lastUpdatedAt: "2026-04-01T10:00:00Z",
  },
};

/**
 * FAQ entries shaped to match the help GROQ projection
 * (lib/help/list.ts) — flat array, sorted by section then number.
 */
export const faqEntries = [
  {
    _id: "faq-1",
    section: "1. Getting started",
    number: 1,
    question: "How do I request access to the portfolio?",
    answer: [
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        children: [
          { _type: "span", _key: "s1", text: "Email the team to request access.", marks: [] },
        ],
        markDefs: [],
      },
    ],
  },
  {
    _id: "faq-2",
    section: "1. Getting started",
    number: 2,
    question: "Where can I find the roadmap?",
    answer: [
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s1",
            text: "The roadmap is published quarterly in the portfolio.",
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
  },
  {
    _id: "faq-3",
    section: "5. Data security and privacy",
    number: 1,
    question: "Do we need a DPIA for new pilots?",
    answer: [
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s1",
            text: "Yes. Every new pilot requires a Data Protection Impact Assessment.",
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
  },
];
