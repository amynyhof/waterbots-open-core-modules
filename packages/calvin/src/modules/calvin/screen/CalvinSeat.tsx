"use client";

import type { CSSProperties, ReactNode } from "react";
import { agentStyle } from "@waterbots/core/agentColours";
import { ReadOnlySeat } from "../../core/readOnly";

/**
 * THE ROOT OF EACH OF CALVIN'S SCREENS (family 4): the read-only seat, and his colour from core's one list (M5.4: Reef,
 * `#0E8A94`). Every colour on his screens reads `var(--agent)`, so one token sets them all, on both sites. The box takes
 * no room of its own (`display: contents`), so it changes no site's layout. Its class scopes the tap size (M5.3).
 */
export default function CalvinSeat({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  return (
    <ReadOnlySeat readOnly={readOnly}>
      <div className="calvin-screen" data-agent="calvin" style={{ display: "contents", ...agentStyle("calvin") } as CSSProperties}>
        {children}
      </div>
    </ReadOnlySeat>
  );
}
