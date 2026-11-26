/**
 * THE PROJECT TYPES WELLINGTON MATCHES A PROJECT TO: the guidebook's twenty water stewardship activity types, and none of
 * these. The ids are core's (`PROJECT_TYPE_IDS`); a test keeps the two the same. Each has the guidebook's own name and one
 * plain sentence, from the open site's shared list (`product-shared/project-types.md`, commit 0f16957), with the page cites
 * left out of the short form as they were there.
 *
 * NO CLASSES (the maintainer, 2026-11-25). The four safe-water technology classes are not on his list: he learns the source,
 * the treatment and the water's safety as plain facts, and core works out how a project is counted. C-19's sentence no
 * longer says it is asked for a class.
 */
import type { ProjectStage, ProjectTypeId } from "@waterbots/core/record";

export interface ProjectType {
  id: ProjectTypeId;
  name: string;
  plain: string;
}

export const PROJECT_TYPES: readonly ProjectType[] = [
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

/** One type by its id. */
export function projectType(id: string): ProjectType | undefined {
  return PROJECT_TYPES.find((t) => t.id === id);
}

/** The stages, as he asks them. The ids are core's. */
export const PROJECT_STAGES: readonly { id: ProjectStage; words: string; plain: string }[] = [
  { id: "paper", words: "on paper", plain: "still a plan — nothing has been spent on building it yet" },
  { id: "building", words: "being built", plain: "work has started and it is not running yet" },
  { id: "running", words: "already running", plain: "it is in use today" },
];

/** The list as he reads it: an id, the standard's own name and one plain sentence each. */
export function projectTypesText(): string {
  const line = (t: ProjectType): string => `- ${t.id} — ${t.name}: ${t.plain}`;
  return [
    "## Water stewardship activity types — the VWBA guidebook",
    "",
    ...PROJECT_TYPES.filter((t) => t.id !== "NONE").map(line),
    "",
    "## None of these",
    "",
    ...PROJECT_TYPES.filter((t) => t.id === "NONE").map(line),
    "",
  ].join("\n");
}
