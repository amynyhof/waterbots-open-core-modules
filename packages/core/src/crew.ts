/**
 * THE CREW LIST (J5), as code. The file is `roster.yaml`, which the maintainer edits by hand; a test keeps the two the
 * same. The file ships too, as `@waterbots/core/roster.yaml`.
 *
 * What is built at each door is confirmed by each site's own check, so it is not repeated here.
 */

/** The crew list's version, and the date it was ruled. */
export const CREW_VERSION = "0.4.1" as const;

/** What a seat may do at a door. */
export type CrewLevel = "meet" | "screen" | "work" | "later" | "none";
/** The doors as the crew list names them. */
export type CrewDoor = "free" | "commons" | "paid";

export interface CrewSeat {
  id: string;
  name: string;
  faces: readonly string[];
  seat: string;
  job: string;
  helpsWith: readonly string[];
  phase: string;
  doors: Readonly<Record<CrewDoor, CrewLevel>>;
}

export const CREW: readonly CrewSeat[] = [
  {
    id: "wellington",
    name: "Wellington",
    faces: [
      "Wellington"
    ],
    seat: "Team Lead",
    job: "Hosts every door and orchestrates the six phases. Deploys the right specialist for the phase and tracks whether the project moved forward.",
    helpsWith: [
      "Finding where you are on the six-phase journey and the next step",
      "Calling in the right seat for the phase",
      "Answers about safe water, impact funding, and the platform"
    ],
    phase: "all",
    doors: {
      free: "screen",
      commons: "none",
      paid: "work"
    }
  },
  {
    id: "phoebe",
    name: "Phoebe",
    faces: [
      "Phoebe"
    ],
    seat: "Eligibility",
    job: "Works out which monetization pathways a project could fit, and what would make it fit if it does not yet.",
    helpsWith: [
      "Pathway eligibility and feasibility screening",
      "What would change eligibility for a project already built and running"
    ],
    phase: "Eligibility",
    doors: {
      free: "screen",
      commons: "screen",
      paid: "work"
    }
  },
  {
    id: "bridget",
    name: "Bridget & Ally",
    faces: [
      "Bridget",
      "Ally"
    ],
    seat: "Partners",
    job: "One seat with two faces. They host and answer together. Their job is the Partners phase, the map and the partnerships. Stakeholders for implementation and funding, people whose permission is legally required, others needed to deploy the work, and the place and basin.",
    helpsWith: [
      "The project's place and basin on the map",
      "Who the partners are and whose permission is needed"
    ],
    phase: "Partners",
    doors: {
      free: "screen",
      commons: "screen",
      paid: "work"
    }
  },
  {
    id: "calvin",
    name: "Calvin",
    faces: [
      "Calvin"
    ],
    seat: "Carbon credits calculator",
    job: "Quantify. Screening estimate on the Free site, refined estimate with project memory on the Paid site. Posts official values to the project context.",
    helpsWith: [
      "Emission reductions from the deterministic calculators",
      "Methodology questions"
    ],
    phase: "Quantify",
    doors: {
      free: "screen",
      commons: "screen",
      paid: "work"
    }
  },
  {
    id: "violet",
    name: "Violet",
    faces: [
      "Violet"
    ],
    seat: "Volumetric water benefits calculator",
    job: "Quantify. Counts the water a project provides, by the VWBA 2.0 method D-3, Volume Provided.",
    helpsWith: [
      "The volumetric water benefit of a project that supplies water, from the deterministic calculator",
      "Questions about the D-3 method"
    ],
    phase: "Quantify",
    doors: {
      free: "screen",
      commons: "screen",
      paid: "work"
    }
  },
  {
    id: "reggie",
    name: "Reggie",
    faces: [
      "Reggie"
    ],
    seat: "Library",
    job: "Library and official filings. Official outputs that go to standards bodies, such as registration packages and project design documents.",
    helpsWith: [
      "Which documents a project's pathways call for, phase by phase",
      "Registration paperwork and formal filings"
    ],
    phase: "Plan",
    doors: {
      free: "meet",
      commons: "meet",
      paid: "work"
    }
  },
  {
    id: "goldie",
    name: "Goldie",
    faces: [
      "Goldie"
    ],
    seat: "Revenue",
    job: "Revenue specialist. Reads the official numbers other seats post to the project context, such as Calvin's emission reduction, and posts back an official revenue estimate.",
    helpsWith: [
      "What a quantified impact could be worth on each pathway"
    ],
    phase: "Quantify",
    doors: {
      free: "meet",
      commons: "meet",
      paid: "later"
    }
  },
  {
    id: "edgar",
    name: "Edgar",
    faces: [
      "Edgar"
    ],
    seat: "Engineer",
    job: "Engineering and technical design of the water project itself.",
    helpsWith: [
      "Technical design questions about the works on the ground"
    ],
    phase: "Plan",
    doors: {
      free: "meet",
      commons: "meet",
      paid: "later"
    }
  },
  {
    id: "monty",
    name: "Monty",
    faces: [
      "Monty"
    ],
    seat: "Monitor",
    job: "Remote sensing and similar technical evidence once a project is running. A seat of his own.",
    helpsWith: [
      "Remote-sensing evidence for monitoring"
    ],
    phase: "Monitor",
    doors: {
      free: "meet",
      commons: "meet",
      paid: "later"
    }
  },
  {
    id: "melody",
    name: "Melody",
    faces: [
      "Melody"
    ],
    seat: "Evaluation",
    job: "Monitoring and evaluation with people and programs, such as surveys. A seat of her own, not part of Monty.",
    helpsWith: [
      "Survey design and monitoring and evaluation with communities"
    ],
    phase: "Monitor",
    doors: {
      free: "meet",
      commons: "meet",
      paid: "later"
    }
  },
  {
    id: "audrey",
    name: "Audrey",
    faces: [
      "Audrey"
    ],
    seat: "Audit",
    job: "Audit readiness. Helps a team get ready for outside review. Audit preparation support, not a verification stamp.",
    helpsWith: [
      "Getting ready for an outside audit or verification"
    ],
    phase: "Communicate",
    doors: {
      free: "meet",
      commons: "meet",
      paid: "later"
    }
  }
];

/** One seat, or undefined when the crew has none by that id. */
export function crewSeat(id: string): CrewSeat | undefined {
  return CREW.find((s) => s.id === id);
}
