import { describe, it, expect } from "vitest";
import { beatRows, BEATS } from "./pyramidBeats.js";

describe("beatRows", () => {
  it("returns the rows for a given beat index", () => {
    expect(beatRows("flaw", 0).every((r) => r.owner === "A")).toBe(true);
  });

  it("clamps below zero to the first beat", () => {
    expect(beatRows("flaw", -5)).toEqual(beatRows("flaw", 0));
  });

  it("clamps above the last beat to the last beat", () => {
    const last = BEATS.flaw.length - 1;
    expect(beatRows("flaw", 999)).toEqual(beatRows("flaw", last));
  });

  it("flaw: merge beat mixes both owners in one column", () => {
    const merged = beatRows("flaw", BEATS.flaw.length - 1);
    const owners = new Set(merged.map((r) => r.owner));
    expect(owners.has("A") && owners.has("B")).toBe(true);
    expect(new Set(merged.map((r) => r.group))).toEqual(new Set([0]));
  });

  it("fix: final beat shows two separate single-owner columns", () => {
    const fixed = beatRows("fix", BEATS.fix.length - 1);
    const g0 = fixed.filter((r) => r.group === 0);
    const g1 = fixed.filter((r) => r.group === 1);
    expect(new Set(g0.map((r) => r.owner))).toEqual(new Set(["A"]));
    expect(new Set(g1.map((r) => r.owner))).toEqual(new Set(["B"]));
  });

  it("strengths: rows accumulate into one growing pyramid", () => {
    const counts = BEATS.strengths.map((_, i) => beatRows("strengths", i).length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
  });
});
