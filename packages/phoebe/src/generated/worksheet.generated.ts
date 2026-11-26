/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Written by scripts/build-worksheet-module.mjs from the tool definition files
 * in Phoebe's packs and from the roster. Edit those, not this file, then re-run:
 *
 *   node scripts/build-worksheet-module.mjs
 *
 * The build gate fails if this has drifted from its sources, so the relay and
 * the console cannot hold different rows.
 *
 * Sources: knowledge-packs/phoebe-eligibility/vwba-2.0/tool/eligibility-worksheet.yaml, knowledge-packs/phoebe-eligibility/gs-paa-v2.0/tool/eligibility-worksheet.yaml, knowledge-packs/product-shared/roster.yaml
 */

/** One row of the worksheet, as its tool file writes it. */
export interface ToolRow {
  id: string;
  title: string;
  /** The phase on the navigation where the row is acted on, or "to-remain-eligible". */
  asked: string;
  takes: { kind: string; of?: string };
  /** Where the value may come from, in the file's own words. */
  from: string[];
  /** The card's own "Can it be fixed?" value. Only a row that is not "yes" can ever be Blocked. */
  fixable: string;
  /** The route cards this row may name, by id. A route outside this list is not this row's. */
  routes: string[];
  /** The card that carries the row's words, as "set/id". The tool names a card; it never copies one. */
  card: string;
  /** Which projects the row exists for. Absent means every project on the pathway. */
  applies?: string[];
}

/** A word from one of the tool's closed lists, with what it carries and its colour. */
export interface ToolWord {
  id: string;
  label: string;
  carries: string;
  colour: string | null;
}

/** One pack's section of the worksheet. */
export interface ToolSection {
  pack: string;
  version: string;
  sectionId: string;
  sectionName: string;
  pathway: string;
  rows: ToolRow[];
  versionFlags: ToolWord[];
  appliesTo: ToolWord[];
  /** The project-context fields this section reads before it asks anything. */
  record: { field: string; asks: string; takes: string; provenance: string[] }[];
}

/** The tool itself, from the files' own `tool` block. */
export const TOOL = {
  "id": "eligibility-worksheet",
  "name": "The eligibility worksheet",
  "purpose": "Works out, one question at a time, whether a project can count a benefit on a pathway — and where it cannot yet, what would change that."
};

/** The navigation's phases, in the order a visitor meets them. */
export const PHASES = [
  "eligibility",
  "partners",
  "quantify",
  "plan",
  "monitor",
  "communicate"
] as const;

/** The tag a row carries when it is kept up while the project runs. */
export const TO_REMAIN = "to-remain-eligible";

/** How each phase is named on screen. */
export const PHASE_LABEL: Record<string, string> = {
  "eligibility": "Eligibility",
  "partners": "Partners",
  "quantify": "Quantify",
  "plan": "Plan",
  "monitor": "Monitor",
  "communicate": "Communicate"
};

/** How the record's fields are named where a visitor and an agent read them. */
export const RECORD_LABEL: Record<string, string> = {
  "does": "What it does",
  "name": "What it is called",
  "place": "Where it is",
  "type": "What type",
  "stage": "Stage",
  "pin": "The basin pin"
};

/** The seat that helps at each phase, read from the roster. */
export const PHASE_SEATS: readonly { phase: string; label: string; seats: { names: string[]; seat: string }[] }[] = [
  {
    "phase": "eligibility",
    "label": "Eligibility",
    "seats": [
      {
        "names": [
          "Phoebe"
        ],
        "seat": "Eligibility"
      }
    ]
  },
  {
    "phase": "partners",
    "label": "Partners",
    "seats": [
      {
        "names": [
          "Bridget",
          "Ally"
        ],
        "seat": "Partners"
      }
    ]
  },
  {
    "phase": "quantify",
    "label": "Quantify",
    "seats": [
      {
        "names": [
          "Calvin"
        ],
        "seat": "Carbon credits calculator"
      },
      {
        "names": [
          "Violet"
        ],
        "seat": "Volumetric water benefits calculator"
      },
      {
        "names": [
          "Goldie"
        ],
        "seat": "Revenue"
      }
    ]
  },
  {
    "phase": "plan",
    "label": "Plan",
    "seats": [
      {
        "names": [
          "Reggie"
        ],
        "seat": "Library"
      },
      {
        "names": [
          "Edgar"
        ],
        "seat": "Engineer"
      }
    ]
  },
  {
    "phase": "monitor",
    "label": "Monitor",
    "seats": [
      {
        "names": [
          "Monty"
        ],
        "seat": "Monitor"
      },
      {
        "names": [
          "Melody"
        ],
        "seat": "Evaluation"
      }
    ]
  },
  {
    "phase": "communicate",
    "label": "Communicate",
    "seats": [
      {
        "names": [
          "Audrey"
        ],
        "seat": "Audit"
      }
    ]
  }
];

/** The five row states, in the order a row moves through them. */
export const ROW_STATES: readonly ToolWord[] = [
  {
    "id": "unchecked",
    "label": "Not yet checked",
    "carries": "nothing",
    "colour": "--state-locked"
  },
  {
    "id": "met",
    "label": "Met",
    "carries": "one sentence on what settled it",
    "colour": "--state-approved"
  },
  {
    "id": "fixable",
    "label": "Fixable",
    "carries": "the route card's id, so the console draws the route with its citation; never prose alone",
    "colour": "--state-pending"
  },
  {
    "id": "unknown",
    "label": "Unknown",
    "carries": "what to find out, in a sentence; and where the gap is a baseline or a survey, the save-and-design offer",
    "colour": "--state-pending"
  },
  {
    "id": "blocked",
    "label": "Blocked",
    "carries": "the card's own reason, cited",
    "colour": "--state-pending"
  }
];

/** Whether a pathway is in play. Never a verdict on the project. */
export const PATHWAY_STATES: readonly ToolWord[] = [
  {
    "id": "unchecked",
    "label": "Not yet checked",
    "carries": "nothing",
    "colour": null
  },
  {
    "id": "applies",
    "label": "Applies",
    "carries": "nothing",
    "colour": null
  },
  {
    "id": "does-not-apply",
    "label": "Does not apply",
    "carries": "which kind of no it is — fixable with a cited route, unknown, or blocked — and that the other pathway is separate",
    "colour": null
  }
];

/** The readiness read, drawn from the rows and never from prose. */
export const READINESS_READS: readonly ToolWord[] = [
  {
    "id": "likely-eligible",
    "label": "Likely",
    "carries": "nothing beyond the rows it was drawn from",
    "colour": null
  },
  {
    "id": "likely-not",
    "label": "Unlikely",
    "carries": "the blocked row's own reason",
    "colour": null
  },
  {
    "id": "not-enough-known",
    "label": "More to learn",
    "carries": "the list of rows still open, each with its route or its question",
    "colour": null
  }
];

export const TOOL_SECTIONS: readonly ToolSection[] = [
  {
    "pack": "vwba-2.0",
    "version": "0.12.1",
    "sectionId": "water",
    "sectionName": "The water pathway",
    "pathway": "water",
    "rows": [
      {
        "id": "W1",
        "title": "A water stewardship activity with a volume behind it",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "pathway-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the project's own description of what the activity does and which shared water challenge it takes on"
        ],
        "fixable": "depends",
        "routes": [
          "R-2",
          "R-3",
          "R-1"
        ],
        "card": "applies/W1"
      },
      {
        "id": "W2",
        "title": "A mapped route to counting it",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "pathway-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the project design document's statement of the activity type and the method named for counting it"
        ],
        "fixable": "yes",
        "routes": [
          "R-3",
          "R-8"
        ],
        "card": "applies/W2"
      },
      {
        "id": "1",
        "title": "A working route to a countable benefit",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the project design document's section on the indicator chosen and the method that counts it"
        ],
        "fixable": "yes",
        "routes": [
          "R-3",
          "R-8",
          "R-1"
        ],
        "card": "eligibility/1"
      },
      {
        "id": "2",
        "title": "The problem is real in that specific place",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: place",
          "record: does",
          "conversation",
          "documents: the catchment assessment, or the desktop study of the local water challenges"
        ],
        "fixable": "yes",
        "routes": [
          "R-2"
        ],
        "card": "eligibility/2"
      },
      {
        "id": "3",
        "title": "Support from inside and from the neighbours",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the consultation record, and the reasoning behind the decision to back the project"
        ],
        "fixable": "yes",
        "routes": [
          "R-4",
          "R-9"
        ],
        "card": "eligibility/3"
      },
      {
        "id": "4",
        "title": "The benefit is genuinely additional",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the review of what the sponsor is legally obliged to do, and of what it funds beyond that"
        ],
        "fixable": "depends",
        "routes": [
          "R-5"
        ],
        "card": "eligibility/4"
      },
      {
        "id": "5",
        "title": "A route to keep checking the volumes",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the tracking and reporting plan drawn up with the implementer, and the money and people written into the agreement"
        ],
        "fixable": "yes",
        "routes": [
          "R-6",
          "R-9"
        ],
        "card": "eligibility/5"
      },
      {
        "id": "6",
        "title": "The downsides have been looked for and cut back",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the trade-off assessment made before the activity began, and what was done about what it found"
        ],
        "fixable": "yes",
        "routes": [
          "R-7"
        ],
        "card": "eligibility/6"
      }
    ],
    "versionFlags": [],
    "appliesTo": [
      {
        "id": "all",
        "label": "Every project on this pathway",
        "carries": "",
        "colour": null
      }
    ],
    "record": [
      {
        "field": "does",
        "asks": "What the project does, in the visitor's own words.",
        "takes": "text",
        "provenance": [
          "chat"
        ]
      },
      {
        "field": "name",
        "asks": "What the project is called.",
        "takes": "text",
        "provenance": [
          "typed",
          "chat"
        ]
      },
      {
        "field": "place",
        "asks": "Where the project is — a country or a named place.",
        "takes": "text",
        "provenance": [
          "typed",
          "chat",
          "pin"
        ]
      },
      {
        "field": "type",
        "asks": "Which of the cited project types this is.",
        "takes": "choice",
        "provenance": [
          "chat"
        ]
      },
      {
        "field": "stage",
        "asks": "How far along the project is.",
        "takes": "choice",
        "provenance": [
          "chat"
        ]
      },
      {
        "field": "pin",
        "asks": "The one basin this visit is about.",
        "takes": "text",
        "provenance": [
          "pin"
        ]
      }
    ]
  },
  {
    "pack": "gs-paa-v2.0",
    "version": "0.8.1",
    "sectionId": "carbon",
    "sectionName": "The carbon pathway",
    "pathway": "carbon",
    "rows": [
      {
        "id": "T1",
        "title": "Safe drinking water from a technology that gives off little or nothing",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "pathway-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the project’s own description of what it supplies and how it is powered"
        ],
        "fixable": "depends",
        "routes": [],
        "card": "applies/T1"
      },
      {
        "id": "T2",
        "title": "Today, people boil, or go without",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "pathway-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the baseline survey, or the household questionnaire on how people get and treat their water today"
        ],
        "fixable": "depends",
        "routes": [],
        "card": "applies/T2"
      },
      {
        "id": "T3",
        "title": "One of four kinds of technology",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "pathway-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the project design document’s statement of where the water is treated or produced, and for whom"
        ],
        "fixable": "depends",
        "routes": [],
        "card": "applies/T3"
      },
      {
        "id": "T4",
        "title": "Which version the project is judged on",
        "asked": "eligibility",
        "takes": {
          "kind": "choice",
          "of": "version-flag"
        },
        "from": [
          "conversation",
          "documents: the Gold Standard registration record for the project, and its certification documents where it has any"
        ],
        "fixable": "yes",
        "routes": [],
        "card": "applies/T4"
      },
      {
        "id": "M1",
        "title": "A technology the method names",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the technology specification naming the treatment or supply technology used"
        ],
        "fixable": "depends",
        "routes": [
          "R-2"
        ],
        "card": "eligibility/M1"
      },
      {
        "id": "M2",
        "title": "No pump on its own fossil-fuel engine",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the pump specification, naming its drive"
        ],
        "fixable": "depends",
        "routes": [],
        "card": "eligibility/M2",
        "applies": [
          "cws"
        ]
      },
      {
        "id": "M3",
        "title": "The treatment technology is shown to work",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the product’s laboratory report, its listing under the WHO evaluation scheme, or the national notice"
        ],
        "fixable": "yes",
        "routes": [
          "R-2"
        ],
        "card": "eligibility/M3",
        "applies": [
          "hwt",
          "iwt"
        ]
      },
      {
        "id": "M4",
        "title": "The water at the collection point is safe",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the water-quality test results for the collection point"
        ],
        "fixable": "yes",
        "routes": [
          "R-3"
        ],
        "card": "eligibility/M4",
        "applies": [
          "cwt",
          "cws"
        ]
      },
      {
        "id": "M5",
        "title": "The people served boil today, or go without",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the baseline survey’s findings on how people get and treat their water today"
        ],
        "fixable": "depends",
        "routes": [
          "R-1",
          "R-4"
        ],
        "card": "eligibility/M5"
      },
      {
        "id": "M6",
        "title": "Suppressed demand only for small and micro-scale projects",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the project design document’s statement of scale, and what it claims as suppressed demand"
        ],
        "fixable": "depends",
        "routes": [],
        "card": "eligibility/M6"
      },
      {
        "id": "M7",
        "title": "Suppressed demand comes with basic service",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the service-level evidence for the water supplied, and the network’s test results where there is a network"
        ],
        "fixable": "yes",
        "routes": [
          "R-4"
        ],
        "card": "eligibility/M7"
      },
      {
        "id": "M8",
        "title": "Collected water is within reach",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the service-area map, and the distance or time evidence for the people counted"
        ],
        "fixable": "yes",
        "routes": [
          "R-5"
        ],
        "card": "eligibility/M8",
        "applies": [
          "cwt",
          "cws"
        ]
      },
      {
        "id": "M9",
        "title": "A restored system was really out of action",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the outage history of the system being restored, with dates and evidence"
        ],
        "fixable": "depends",
        "routes": [
          "R-6"
        ],
        "card": "eligibility/M9",
        "applies": [
          "cwt",
          "cws"
        ]
      },
      {
        "id": "M10",
        "title": "The technology's life is known, and replacement is planned",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the technology’s specification or guarantee, and the replacement plan"
        ],
        "fixable": "yes",
        "routes": [
          "R-7"
        ],
        "card": "eligibility/M10"
      },
      {
        "id": "M11",
        "title": "Nothing is counted twice",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the unit database, the registry searches, and the double-counting declaration"
        ],
        "fixable": "yes",
        "routes": [
          "R-8"
        ],
        "card": "eligibility/M11"
      },
      {
        "id": "M12",
        "title": "No law already requires it, and the host country has not excluded it",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: place",
          "conversation",
          "documents: the review of the host country’s law, and of its list of excluded activity types"
        ],
        "fixable": "depends",
        "routes": [
          "R-9"
        ],
        "card": "eligibility/M12"
      },
      {
        "id": "M13",
        "title": "Additional, by the positive list or by analysis",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the additionality demonstration: the positive-list check, or the financial analysis"
        ],
        "fixable": "depends",
        "routes": [
          "R-10",
          "R-11"
        ],
        "card": "eligibility/M13"
      },
      {
        "id": "M14",
        "title": "Not yet common practice",
        "asked": "quantify",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the common-practice analysis for the area claimed"
        ],
        "fixable": "depends",
        "routes": [],
        "card": "eligibility/M14"
      },
      {
        "id": "M15",
        "title": "No lock-in",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the lock-in assessment, or the maker’s evidence of the technology’s life"
        ],
        "fixable": "yes",
        "routes": [
          "R-12"
        ],
        "card": "eligibility/M15"
      },
      {
        "id": "M16",
        "title": "Groundwater is drawn within what the aquifer can give",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: place",
          "conversation",
          "documents: the groundwater assessment, or the abstraction permit"
        ],
        "fixable": "yes",
        "routes": [
          "R-13"
        ],
        "card": "eligibility/M16",
        "applies": [
          "cws"
        ]
      },
      {
        "id": "M17",
        "title": "The running rules are in the design",
        "asked": "to-remain-eligible",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the design’s regulatory summary, maintenance plan and awareness campaign"
        ],
        "fixable": "yes",
        "routes": [
          "R-6"
        ],
        "card": "eligibility/M17"
      },
      {
        "id": "P1",
        "title": "The right version of the method",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the project’s certification record, and the Paris-alignment design change where it is transitioning"
        ],
        "fixable": "depends",
        "routes": [
          "R-19"
        ],
        "card": "eligibility/P1"
      },
      {
        "id": "P2",
        "title": "A community-services activity",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: does",
          "conversation",
          "documents: the project design document’s statement of who the water serves"
        ],
        "fixable": "yes",
        "routes": [],
        "card": "eligibility/P2"
      },
      {
        "id": "G1",
        "title": "A real activity on the ground, with a boundary",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the project boundary and the site descriptions"
        ],
        "fixable": "yes",
        "routes": [],
        "card": "eligibility/G1"
      },
      {
        "id": "G2",
        "title": "The project keeps the host country's law",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: place",
          "conversation",
          "documents: the permits, and the review of which national rules touch safe-water supply"
        ],
        "fixable": "yes",
        "routes": [],
        "card": "eligibility/G2"
      },
      {
        "id": "G3",
        "title": "Everyone involved is named and in good standing",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the registration and good-standing documents for every party involved"
        ],
        "fixable": "yes",
        "routes": [],
        "card": "eligibility/G3"
      },
      {
        "id": "G4",
        "title": "Ownership of the credits is clear and agreed",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the ownership statement, the consent forms and the contracts"
        ],
        "fixable": "yes",
        "routes": [
          "R-8"
        ],
        "card": "eligibility/G4"
      },
      {
        "id": "G5",
        "title": "The other rights the project rests on are not in dispute",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the land, water and access rights the project rests on"
        ],
        "fixable": "yes",
        "routes": [],
        "card": "eligibility/G5"
      },
      {
        "id": "G6",
        "title": "Aid money is declared, and none of it buys the credits",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "record: place",
          "conversation",
          "documents: the funding agreements, and the conditions attached to any aid money"
        ],
        "fixable": "depends",
        "routes": [],
        "card": "eligibility/G6"
      },
      {
        "id": "G7",
        "title": "Three Sustainable Development Goals, one of them climate",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the project design document’s Sustainable Development Goal section and its indicators"
        ],
        "fixable": "yes",
        "routes": [],
        "card": "eligibility/G7"
      },
      {
        "id": "G8",
        "title": "The safeguarding assessment is done and answered",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the completed safeguarding assessment and its mitigation plan"
        ],
        "fixable": "yes",
        "routes": [
          "R-16"
        ],
        "card": "eligibility/G8"
      },
      {
        "id": "G9",
        "title": "The people affected were consulted, in two rounds, before the start",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the records of the two consultation rounds, with their dates"
        ],
        "fixable": "yes",
        "routes": [
          "R-14"
        ],
        "card": "eligibility/G9"
      },
      {
        "id": "G10",
        "title": "A way to raise a grievance, for the life of the project",
        "asked": "partners",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the grievance procedure agreed at the consultation meeting"
        ],
        "fixable": "yes",
        "routes": [
          "R-15"
        ],
        "card": "eligibility/G10"
      },
      {
        "id": "G11",
        "title": "Gender-sensitive by design",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the gender assessment, and the three steps it calls for"
        ],
        "fixable": "yes",
        "routes": [
          "R-17"
        ],
        "card": "eligibility/G11"
      },
      {
        "id": "G12",
        "title": "Submitted within a year of starting",
        "asked": "eligibility",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the project start date and the submission date"
        ],
        "fixable": "depends",
        "routes": [
          "R-18"
        ],
        "card": "eligibility/G12"
      },
      {
        "id": "G13",
        "title": "A plan to monitor and report",
        "asked": "plan",
        "takes": {
          "kind": "state",
          "of": "row-state"
        },
        "from": [
          "conversation",
          "documents: the monitoring and reporting plan written into the design"
        ],
        "fixable": "yes",
        "routes": [
          "R-6"
        ],
        "card": "eligibility/G13"
      }
    ],
    "versionFlags": [
      {
        "id": "new",
        "label": "New project",
        "carries": "nothing",
        "colour": null
      },
      {
        "id": "transitioning",
        "label": "Transitioning project",
        "carries": "where the Paris-alignment design change stands, and when the current crediting period ends",
        "colour": null
      },
      {
        "id": "unknown",
        "label": "Not known yet",
        "carries": "the one fact that would settle it — a Gold Standard registration under the 2021 version — and that the project is treated as new meanwhile",
        "colour": null
      }
    ],
    "appliesTo": [
      {
        "id": "all",
        "label": "Every project on this pathway",
        "carries": "",
        "colour": null
      },
      {
        "id": "hwt",
        "label": "Household treatment",
        "carries": "",
        "colour": null
      },
      {
        "id": "iwt",
        "label": "Institutional treatment",
        "carries": "",
        "colour": null
      },
      {
        "id": "cwt",
        "label": "Community treatment",
        "carries": "",
        "colour": null
      },
      {
        "id": "cws",
        "label": "Community supply",
        "carries": "",
        "colour": null
      },
      {
        "id": "transitioning",
        "label": "A transitioning project",
        "carries": "",
        "colour": null
      },
      {
        "id": "new",
        "label": "A new project",
        "carries": "",
        "colour": null
      }
    ],
    "record": [
      {
        "field": "does",
        "asks": "What the project does, in the visitor's own words.",
        "takes": "text",
        "provenance": [
          "chat"
        ]
      },
      {
        "field": "name",
        "asks": "What the project is called.",
        "takes": "text",
        "provenance": [
          "typed",
          "chat"
        ]
      },
      {
        "field": "place",
        "asks": "Where the project is — a country or a named place.",
        "takes": "text",
        "provenance": [
          "typed",
          "chat",
          "pin"
        ]
      },
      {
        "field": "type",
        "asks": "Which of the cited project types this is.",
        "takes": "choice",
        "provenance": [
          "chat"
        ]
      },
      {
        "field": "stage",
        "asks": "How far along the project is.",
        "takes": "choice",
        "provenance": [
          "chat"
        ]
      },
      {
        "field": "pin",
        "asks": "The one basin this visit is about.",
        "takes": "text",
        "provenance": [
          "pin"
        ]
      }
    ]
  }
];

/**
 * The packs Phoebe reads today.
 *
 * The carbon section is shown on the worksheet and on her Knowledge tab before
 * she reads it, because hiding a pack that exists would be less honest than
 * saying it is not hers yet. This list is what her prompt is built from.
 */
export const HER_PACKS: readonly string[] = [
  "vwba-2.0",
  "gs-paa-v2.0"
];

/* The ids as literals, so a state that is not one of them does not compile. */
export const ROW_STATE_IDS = [
  "unchecked",
  "met",
  "fixable",
  "unknown",
  "blocked"
] as const;
export const PATHWAY_STATE_IDS = [
  "unchecked",
  "applies",
  "does-not-apply"
] as const;
export const READINESS_IDS = [
  "likely-eligible",
  "likely-not",
  "not-enough-known"
] as const;

export type RowStateId = (typeof ROW_STATE_IDS)[number];
export type PathwayStateId = (typeof PATHWAY_STATE_IDS)[number];
export type ReadinessId = (typeof READINESS_IDS)[number];

/** How each row state is named on screen. Complete words, never a symbol alone. */
export const ROW_STATE_LABEL: Record<string, string> = Object.fromEntries(
  ROW_STATES.map((s) => [s.id, s.label])
);

/** The brand token each row state carries, from the tool file. */
export const ROW_STATE_COLOUR: Record<string, string | null> = Object.fromEntries(
  ROW_STATES.map((s) => [s.id, s.colour])
);

export const PATHWAY_STATE_LABEL: Record<string, string> = Object.fromEntries(
  PATHWAY_STATES.map((s) => [s.id, s.label])
);

export const READINESS_LABEL: Record<string, string> = Object.fromEntries(
  READINESS_READS.map((r) => [r.id, r.label])
);

export function section(pack: string): ToolSection | undefined {
  return TOOL_SECTIONS.find((s) => s.pack === pack);
}

/** What the project is known to be, for sorting which rows it has. */
export interface RowContext {
  /** The Gold Standard technology class, where one is known. */
  gsClass?: string;
  /** The version flag the carbon pack's own test sets. */
  versionFlag?: string;
}

/**
 * Which rows this project has.
 *
 * A row with no `applies` key exists for every project on the pathway. A row
 * with one exists only for the classes or versions it names — and while the
 * class is unknown, no row is hidden, because hiding a row on a guess would
 * tell the visitor their project has fewer requirements than it may have.
 */
export function rowsFor(pack: string, context: RowContext = {}): ToolRow[] {
  const found = section(pack);
  if (!found) return [];
  const known = [context.gsClass, context.versionFlag].filter((v): v is string => !!v);
  return found.rows.filter((row) => {
    if (!row.applies) return true;
    if (known.length === 0) return true;
    return row.applies.some((value) => known.includes(value));
  });
}

/** True for a row whose answer says whether the pathway is in play at all. */
export function isPathwayRow(row: ToolRow): boolean {
  return row.takes.of === 'pathway-state';
}

/** True for the one row that sorts a project into a version of its method. */
export function isVersionRow(row: ToolRow): boolean {
  return row.takes.of === 'version-flag';
}

/**
 * The rows asked on this site: the Eligibility-phase rows, and no others.
 *
 * The maintainer's ruling of 23 Sep 2026. Every other row is shown once,
 * grouped by the phase where it is acted on, and is never asked here and never
 * counted against a project.
 */
export function askedRows(pack: string, context: RowContext = {}): ToolRow[] {
  return rowsFor(pack, context).filter((row) => row.asked === 'eligibility');
}

/** The Eligibility rows that carry a verdict — the applies tests are not verdicts. */
export function verdictRows(pack: string, context: RowContext = {}): ToolRow[] {
  return askedRows(pack, context).filter((row) => !isPathwayRow(row) && !isVersionRow(row));
}

/** The applies tests, in the order they are run. */
export function pathwayRows(pack: string, context: RowContext = {}): ToolRow[] {
  return rowsFor(pack, context).filter(isPathwayRow);
}

/**
 * The rows shown once, grouped by phase in the navigation's order.
 *
 * Communicate is returned even when nothing is a row there, because an honest
 * empty group says more than a hidden one — ruling R5 of the phase-tags
 * proposal. A row tagged "to-remain-eligible" shows inside Monitor.
 */
export function shownGroups(
  pack: string,
  context: RowContext = {}
): { phase: string; label: string; seats: { names: string[]; seat: string }[]; rows: ToolRow[] }[] {
  const rows = rowsFor(pack, context).filter((row) => row.asked !== 'eligibility');
  return PHASE_SEATS.filter((group) => group.phase !== 'eligibility').map((group) => ({
    phase: group.phase,
    label: group.label,
    seats: group.seats,
    rows: rows.filter((row) =>
      group.phase === 'monitor' ? row.asked === 'monitor' || row.asked === TO_REMAIN : row.asked === group.phase
    ),
  }));
}

/** Whether a row could ever be Blocked: only where its card says so. */
export function canBlock(pack: string, id: string): boolean {
  const row = section(pack)?.rows.find((r) => r.id === id);
  return row ? row.fixable !== 'yes' : false;
}

/** The route ids this row may name, and no others. */
export function routesOf(pack: string, id: string): string[] {
  return section(pack)?.rows.find((r) => r.id === id)?.routes ?? [];
}

/**
 * The pathway's state, from its own test rows and from nothing else.
 *
 * Any test answered "does not apply" settles it. Every test answered "applies"
 * settles it the other way. Anything else is not yet checked, which is an
 * absence and never a verdict.
 */
export function pathwayStateOf(
  pack: string,
  states: Record<string, string>,
  context: RowContext = {}
): PathwayStateId {
  const tests = pathwayRows(pack, context);
  if (tests.length === 0) return 'unchecked';
  if (tests.some((row) => states[row.id] === 'does-not-apply')) return 'does-not-apply';
  if (tests.every((row) => states[row.id] === 'applies')) return 'applies';
  return 'unchecked';
}

/**
 * The readiness read for one pathway.
 *
 * Likely eligible when every Eligibility row this project has is Met; likely
 * not when any is Blocked; not enough known yet for everything else, which
 * includes a worksheet nobody has touched. "Likely" is the honest word:
 * nothing on this site verifies anything.
 */
export function readinessOf(
  pack: string,
  states: Record<string, string>,
  context: RowContext = {}
): ReadinessId {
  const rows = verdictRows(pack, context);
  if (rows.some((row) => states[row.id] === 'blocked')) return 'likely-not';
  if (rows.length > 0 && rows.every((row) => states[row.id] === 'met')) return 'likely-eligible';
  return 'not-enough-known';
}
