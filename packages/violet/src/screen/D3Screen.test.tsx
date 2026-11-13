// The D-3 screen, rendered to markup. Invented projects only.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import D3Screen, { seedD3Input } from "./D3Screen.js";

const project = { name: "Invented test project", standards: [], population: { mode: "people" as const, served: 1200 } };

describe("the D-3 screen", () => {
  it("starts ex-ante with sliders, and shows what is still awaited", () => {
    const html = renderToStaticMarkup(<D3Screen project={project} />);
    expect(html).toMatch(/type="range"/);
    expect(html).toMatch(/awaiting user project input/);
    expect(html).toMatch(/Table D3\.3, p\.46/);
  });

  it("shows typed boxes and no sliders ex-post", () => {
    const html = renderToStaticMarkup(<D3Screen project={project} view="ex-post" />);
    expect(html).not.toMatch(/type="range"/);
    expect(html).toMatch(/Metered water for the year/);
  });

  it("locked to ex-ante, offers no view switch", () => {
    const html = renderToStaticMarkup(<D3Screen project={project} lockView="ex-ante" />);
    expect(html).not.toMatch(/After the project runs/);
  });

  it("takes project facts from the record and guesses none", () => {
    expect(seedD3Input(project, "ex-ante")).toEqual({ view: "ex-ante", option: "beneficiaries", population: { mode: "people", served: 1200 } });
    expect(seedD3Input(undefined, "ex-post")).toEqual({ view: "ex-post", option: "metered" });
  });

  it("never shows a carbon figure or a total", () => {
    const html = renderToStaticMarkup(<D3Screen project={project} />);
    expect(html).not.toMatch(/carbon|tCO/i);
  });
});
