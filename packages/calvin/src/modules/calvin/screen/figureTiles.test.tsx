// The figure tiles above the equations. Their columns follow the panel's width, not the window's, so the
// figures never run into each other when the panel is narrow (a laptop screen with a side rail and chat beside it).
// A unit test cannot measure a layout. This checks the markup that produces it; the maintainer checks the pixels.
// The project is INVENTED.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useCalculatorState, type CalculatorOptions } from "./useCalculatorState";
import CalculatorWork from "./CalculatorWork";
import type { CalvinProject } from "./state";

const project: CalvinProject = {
  name: "Invented test project",
  standards: [],
  technology: "CWS",
  country: "LSO",
  population: { mode: "people", served: 1200 },
  analysis: { fnrbFiledV1: 0.3 },
};

function Seat({ options }: { options: CalculatorOptions }) {
  const calc = useCalculatorState(project, options);
  return <CalculatorWork calc={calc} project={project} appVersion="0.0.0" tab="calculator" />;
}

/** The figure strip's opening tag, and the tiles inside it. */
function strip(options: CalculatorOptions = {}) {
  const html = renderToStaticMarkup(<Seat options={options} />);
  const open = html.match(/<div[^>]*data-figure-tiles[^>]*>/)?.[0];
  const tiles = html.match(/<div class="min-w-0"><div class="flex flex-wrap items-center gap-x-2 gap-y-1">/g) ?? [];
  return { html, open, tiles };
}

describe("the figure tiles", () => {
  it("take their columns from the panel's width, with a smallest tile width", () => {
    const { open } = strip();
    expect(open).toBeDefined();
    expect(open).toContain("grid-template-columns:repeat(auto-fit, minmax(min(9.5rem, 100%), 1fr))");
  });

  it("no longer pick a column count from the window's width", () => {
    const { html } = strip();
    expect(html).not.toContain("sm:grid-cols-4");
  });

  it("let a figure's tag wrap under its number in a narrow tile", () => {
    expect(strip().tiles).toHaveLength(3);
  });

  it("hold a fourth tile in the same strip when the site gives a crediting period", () => {
    expect(strip({ creditingPeriodYears: 10 }).tiles).toHaveLength(4);
  });
});
