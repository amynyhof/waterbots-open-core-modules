"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * READ-ONLY SEAT — one answer to "may I change anything here?", read by the small set of input
 * primitives a seat is built from ([#97], Amy 2026-08-12: *"a Contributor must not be able to
 * modify calculator inputs at all — not even on-screen"*).
 *
 * ── WHY A CONTEXT AND NOT A PROP, because a prop was tried on paper first ──────────────────
 * The calculator's editable controls are reached through **four primitives** — `Segmented`,
 * `Param`, `InRowNum`, `FallbackDial` — but those primitives are used at roughly **twenty call
 * sites**, several inside sub-render helpers that take `patch` as an argument. Threading a
 * `readOnly` prop to all of them is a sweep, and **a sweep is exactly the shape that misses
 * one**: the miss would be an input a Contributor can still move, which is the defect this
 * closes. Reading it at the primitive means **no call site has to know**, and a control added
 * tomorrow inherits the rule instead of having to remember it.
 *
 * ── IT IS A SECOND LOCK, NOT THE LOCK ─────────────────────────────────────────────────────
 * The real guarantee is the database (`can_write_org`), and the guarantee that nothing reaches
 * the database is `useCalculatorState`, whose `patch` is inert when read-only. **This context
 * only stops the surface OFFERING what the other two would refuse** — Amy's framing exactly:
 * *"the UI's job is to stop offering what the database will refuse."* If this context were
 * bypassed, nothing would persist; if it is missing, the product lies about what you may do.
 *
 * ── DEFAULT IS WRITABLE, DELIBERATELY ─────────────────────────────────────────────────────
 * A component rendered outside any provider is editable, because every surface that existed
 * before this one was. **The alternative — defaulting to read-only — fails safe for data and
 * badly for people:** a provider accidentally omitted would silently render a member's whole
 * seat inert with no explanation, and a control that does nothing for no stated reason is the
 * defect [#114] and governing statement 9 both exist to prevent. Data safety is already held
 * by the two locks above, so this one is free to default to the honest state.
 *
 * GLOBAL BY CONSTRUCTION (`build global, consume locally`). The calculator seat is the first
 * consumer; the documents domain's seats (rung 6) are the second, and they need no new
 * mechanism — they wrap and their primitives read.
 */
const ReadOnlySeatContext = createContext(false);

/** Wrap a seat whose inputs must not be offered. */
export function ReadOnlySeat({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  return <ReadOnlySeatContext.Provider value={readOnly}>{children}</ReadOnlySeatContext.Provider>;
}

/** True when the surrounding seat is read-only. False outside any provider. */
export function useReadOnlySeat(): boolean {
  return useContext(ReadOnlySeatContext);
}

/*
 * THE SENTENCE A READ-ONLY SEAT SAYS IS THE HOST'S, NOT THE MODULE'S (the cut, seam S5). Why a
 * seat is read-only depends on the host's own rules, so a module takes `readOnly` and
 * `readOnlyReason` as props and never names a role. Each host writes its own sentence.
 */
