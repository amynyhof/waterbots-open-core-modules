/**
 * CALVIN IN THE AGENT COMMONS (J2; was V17). Added by this repo, not part of the seed.
 *
 * In the Agent Commons there is no project record, so Calvin opens with two choices. Each one sets whether the project
 * was already credited under V1.0. The Commons host only draws the buttons. On the Free site and the Paid site the
 * record sets that fact, and no choice is shown.
 *
 * The words on the two buttons, and his opening line, wait for the maintainer's ruling. None are written here.
 */
import type { Place } from "@waterbots/core/places";
import type { GivenFacts } from "@waterbots/core/record";

export type CommonsChoiceId = "new-project-estimate" | "compare-old-and-new-rules";

export interface CommonsChoice {
  id: CommonsChoiceId;
  /** The fact the choice sets. */
  sets: { creditedUnderV1: boolean };
  /** True when the choice still needs the project's filed V1.0 fNRB before any comparison is shown. */
  needsFiledV1Fnrb: boolean;
}

/** Calvin's two choices in the Agent Commons, in the order they show. */
export const CALVIN_COMMONS_CHOICES: readonly CommonsChoice[] = [
  { id: "new-project-estimate", sets: { creditedUnderV1: false }, needsFiledV1Fnrb: false },
  { id: "compare-old-and-new-rules", sets: { creditedUnderV1: true }, needsFiledV1Fnrb: true },
];

/** True only in the Agent Commons. On the sites the record sets the fact, and at MCP the user's own AI passes it. */
export function showsCommonsChoices(place: Place): boolean {
  return place === "agent-commons";
}

/** The fact a choice gives, ready for `addCalvinFacts`. */
export function commonsChoiceFacts(id: CommonsChoiceId): GivenFacts {
  const choice = CALVIN_COMMONS_CHOICES.find((c) => c.id === id);
  if (choice === undefined) throw new Error(`"${id}" is not one of Calvin's choices in the Agent Commons.`);
  return { creditedUnderV1: choice.sets.creditedUnderV1 };
}
