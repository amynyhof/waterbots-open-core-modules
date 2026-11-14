// The screens with a site's own country tables (V13), rendered in place. `scripts/check-screen-entry.mjs` does the
// same from the packed files. Every table here is INVENTED, and so is the project.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useCalculatorState, type CalculatorOptions } from "./useCalculatorState";
import CalculatorWork from "./CalculatorWork";
import type { CalvinProject } from "./state";
import type { SiteTables } from "../engine";

const INVENTED = "Invented site table for the screen test";

const project = (country: string, analysis: CalvinProject["analysis"] = {}): CalvinProject => ({
  name: "Invented test project",
  standards: [],
  technology: "CWS",
  country,
  population: { mode: "people", served: 1200 },
  analysis: { fnrbFiledV1: 0.3, ...analysis },
});

function Seat({ p, options, tab }: { p: CalvinProject; options: CalculatorOptions; tab: string }) {
  const calc = useCalculatorState(p, options);
  return <CalculatorWork calc={calc} project={p} appVersion="0.0.0" tab={tab} />;
}
const render = (p: CalvinProject, options: CalculatorOptions = {}, tab = "calculator") =>
  renderToStaticMarkup(<Seat p={p} options={options} tab={tab} />);

const dafTable: SiteTables = {
  daf: { source: INVENTED, countries: { LSO: { name: "Lesotho", daf_2026_2030: 0.0321, basis: "invented basis" } } },
};

describe("the screens with a site's tables", () => {
  it("print the site's DAF and its source, not the package's default", () => {
    const html = render(project("LSO"), { tables: dafTable });
    expect(html).toContain("0.0321");
    expect(html).toContain(INVENTED);
    expect(html).not.toContain("Default value: 0.0125");
  });

  it("print the package's default with no tables passed", () => {
    const html = render(project("LSO"));
    expect(html).toContain("Default value: 0.0125");
    expect(html).not.toContain(INVENTED);
  });

  it("name the site's source in the report too", () => {
    expect(render(project("LSO"), { tables: dafTable }, "report")).toContain(INVENTED);
  });

  it("run a country only the site's tables have, and the report names it", () => {
    const tables: SiteTables = {
      householdSize: { source: INVENTED, countries: { AND: { name: "Andorra", peoplePerHousehold: 2.5 } } },
      fnrb: { "mofuss-adm0-csv": { source: INVENTED, countries: { AND: { name: "Andorra", fnrb: 0.2 } } } },
    };
    const p = { ...project("AND"), population: { mode: "households" as const, served: 400 } };
    expect(render(p)).not.toContain("Andorra fNRB");
    const html = render(p, { tables }, "report");
    expect(html).toContain("Andorra");
    expect(html).toContain(INVENTED);
  });

  it("refuse a bad table loudly", () => {
    const bad = { daf: { source: INVENTED, countries: { LSO: { name: "Lesotho", daf_2026_2030: 2, basis: "x" } } } };
    expect(() => render(project("LSO"), { tables: bad })).toThrow(/daf table cannot be used \(row LSO\)/);
  });
});
