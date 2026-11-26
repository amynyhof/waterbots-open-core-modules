// Her Tool tab, drawn on a made-up worksheet.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { HER_PACKS } from "./generated/worksheet.generated";
import { EligibilityWorksheet } from "./screen";
import { EMPTY_SHEET, applyUpdates } from "./worksheet";

const W = "vwba-2.0";

describe("the eligibility worksheet on screen", () => {
  test("a worksheet nobody has worked shows every row as not yet checked, with no reading and no banner", () => {
    const html = renderToStaticMarkup(<EligibilityWorksheet sheet={EMPTY_SHEET} gsClass="" herPacks={HER_PACKS} />);
    expect(html).toContain("Which pathways could this project count on?");
    expect(html).toContain("Nothing has been checked yet. Rows change as you work through them with Phoebe.");
    expect(html).not.toContain("reset if you reload");
    expect(html).not.toContain("This pathway reads likely");
    expect(html).not.toContain("<img");
    expect(html).toContain("Ten selection considerations");
  });
  test("a pathway whose rows are all met reads likely; the map button is the site's", () => {
    const sheet = applyUpdates(EMPTY_SHEET, {
      pathways: [{ pack: W, id: "W1", state: "applies" }, { pack: W, id: "W2", state: "applies" }],
      rows: ["1", "2", "4"].map((id) => ({ pack: W, id, state: "met" as const, because: "Said." })),
    });
    const withMap = renderToStaticMarkup(<EligibilityWorksheet sheet={sheet} gsClass="" herPacks={HER_PACKS} onOpenMap={() => {}} portrait="phoebe.svg" resetsOnReload />);
    expect(withMap).toContain("This pathway reads likely — next stop: Partners");
    expect(withMap).toContain("Open the map");
    expect(withMap).toContain('src="phoebe.svg"');
    expect(renderToStaticMarkup(<EligibilityWorksheet sheet={sheet} gsClass="" herPacks={HER_PACKS} />)).not.toContain("Open the map");
  });
  test("a pack she does not read says so", () => {
    expect(renderToStaticMarkup(<EligibilityWorksheet sheet={EMPTY_SHEET} gsClass="" herPacks={[W]} />)).toContain("Phoebe does not read this pathway’s cards yet");
  });
});
