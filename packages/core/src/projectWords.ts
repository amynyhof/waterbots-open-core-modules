/**
 * THE WORDS FOR A PROJECT'S TYPE AND STAGE: one copy, which both sites and every agent read (the maintainer, 2026-11-25).
 * Each word is the open site's own, from its shared list of project types (`product-shared/project-types.md`, commit
 * 0f16957, carried on 2026-11-25), with no word changed. The ids are the record's (`PROJECT_TYPE_IDS`, `PROJECT_STAGES`);
 * a test keeps them the same.
 *
 * ONE SENTENCE IS LEFT OUT: C-19's second sentence, that a project of this type is also asked for its carbon class. No
 * class is asked under today's rules (the maintainer, 2026-11-25): the source, the treatment and the water's safety are
 * asked as plain facts, and core works out how a project is counted.
 *
 * THE FOUR CLASSES are kept only to read a screening made before today's rules, which keeps its class. They are never
 * asked.
 */
import type { ProjectStage, ProjectTypeId } from "./record.js";
import type { TechnologyClass } from "./technologyLabels.js";

/** A type, or a class, as the sites name it: the standard's own name and one plain sentence. */
export interface NamedWords<Id extends string> {
  id: Id;
  name: string;
  plain: string;
}

/** The guidebook's twenty water stewardship activity types, and none of these, in the list's order. */
export const PROJECT_TYPE_WORDS: readonly NamedWords<ProjectTypeId>[] = [
  { id: "C-1", name: "Agricultural best management practices", plain: "Farming in ways that help the land hold water and shed less of it, such as cover crops, no-till, terraces, contour planting or managed grazing." },
  { id: "C-2", name: "Agricultural input management", plain: "Managing what goes onto fields, such as fertiliser, pesticide or herbicide, so less of it ends up in the water." },
  { id: "C-3", name: "Irrigation efficiency and conversion", plain: "Changing how crops are watered so less water is used, such as switching to drip or fixing the system." },
  { id: "C-4", name: "Activities that reduce demand", plain: "Cutting how much water is taken in the first place, such as buying or leasing water rights so the water stays in the river or aquifer." },
  { id: "C-5", name: "Leak detection and repair", plain: "Finding leaks in a water system and fixing them." },
  { id: "C-6", name: "Vegetation and land-use changes that cut water use", plain: "Changing what grows on the land so it drinks less, such as removing invasive plants, thinning forest or switching crops." },
  { id: "C-7", name: "Runoff capture features", plain: "Built features that catch rain and runoff and hold it, such as rain gardens, bioswales or ponds." },
  { id: "C-8", name: "Treatment-focused green infrastructure", plain: "Natural-style features built to clean water, such as constructed wetlands." },
  { id: "C-9", name: "Gray infrastructure for treatment", plain: "Built plants and pipes that clean wastewater." },
  { id: "C-10", name: "Gray infrastructure for reuse and recycling", plain: "Built systems that let used water be cleaned and used again." },
  { id: "C-11", name: "New or alternative water supply", plain: "Opening up a new source of water for farms or homes, such as a new well, a rebuilt well, rainwater collection, a piped system or a household connection." },
  { id: "C-12", name: "Instream and habitat restoration", plain: "Repairing rivers and streams and the land beside them, such as removing barriers, re-timing dam releases or reconnecting floodplains." },
  { id: "C-13", name: "Recharge-focused infrastructure", plain: "Features built to get more water into the ground, such as recharge basins or spreading grounds." },
  { id: "C-14", name: "Wetland and aquatic habitat restoration and creation", plain: "Bringing back or making wetlands and other watery habitats that store water." },
  { id: "C-15", name: "Protection of existing water-storing habitat", plain: "Agreements such as conservation easements that keep existing wetlands and similar places from being lost." },
  { id: "C-16", name: "Urban surface and runoff management", plain: "Managing city surfaces so runoff is cleaner or smaller, such as street sweeping, washing stations or disconnecting paved areas from drains." },
  { id: "C-17", name: "Preserving existing vegetation cover", plain: "Keeping forest, meadow or other land cover as it is instead of clearing it." },
  { id: "C-18", name: "Restoring vegetation cover", plain: "Bringing trees, grassland or other cover back onto land that lost it." },
  { id: "C-19", name: "Access to potable water supply", plain: "Giving households or a community access to water that is safe to drink." },
  { id: "C-20", name: "Access to sanitation", plain: "Giving people access to toilets and safe ways to handle waste." },
  { id: "NONE", name: "None of these", plain: "The project is real and does not match any type above. Logged as honestly as any other; the guidebook says an activity absent from its table is not ruled out, and Phoebe's applies test says what follows." },
];

/** The four drinking-water classes, for a screening made before today's rules only. */
export const CLASS_WORDS: readonly NamedWords<TechnologyClass>[] = [
  { id: "HWT", name: "Household water treatment technologies", plain: "The water is made safe in the home, at the point where it is drunk, by a filter, chlorine or UV light." },
  { id: "IWT", name: "Institutional water treatment technologies", plain: "The water is made safe on the premises of a school, clinic, prison or camp, the same ways." },
  { id: "CWT", name: "Community level water treatment technologies", plain: "The water is made safe at one central point, then piped to homes or collected there at a kiosk or tap." },
  { id: "CWS", name: "Community water supply technologies", plain: "A new or restored source of water for a community, such as a borehole handpump, a protected spring or a solar pump; if its water is not safe on its own, it is paired with one of the three kinds of treatment above." },
];

/** A stage, as Wellington asks it: the words and one plain line. */
export interface StageWords {
  id: ProjectStage;
  words: string;
  plain: string;
}

/** On paper, being built, or already running. */
export const STAGE_WORDS: readonly StageWords[] = [
  { id: "paper", words: "on paper", plain: "still a plan — nothing has been spent on building it yet" },
  { id: "building", words: "being built", plain: "work has started and it is not running yet" },
  { id: "running", words: "already running", plain: "it is in use today" },
];

/** A type's words by its id; undefined for an id the list does not hold. */
export function typeWords(id: string): NamedWords<ProjectTypeId> | undefined {
  return PROJECT_TYPE_WORDS.find((t) => t.id === id);
}

/** A class's words by its id, for a screening made before today's rules. */
export function classWords(id: string): NamedWords<TechnologyClass> | undefined {
  return CLASS_WORDS.find((t) => t.id === id);
}

/** A stage's words by its id. */
export function stageWords(id: string): StageWords | undefined {
  return STAGE_WORDS.find((s) => s.id === id);
}
