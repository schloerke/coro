export const COLORS = { A: "#38bdf8", B: "#f472b6" };

const row = (id, owner, width, group = 0, dim = false) => ({
  id,
  owner,
  color: COLORS[owner],
  width,
  group,
  dim,
});

// Each entry is one beat (one space/-> press). Rows are listed bottom-to-top.
export const BEATS = {
  // Act 1: one clean teal pyramid grows.
  strengths: [
    [row("a1", "A", 1.0)],
    [row("a1", "A", 1.0), row("a2", "A", 0.75)],
    [row("a1", "A", 1.0), row("a2", "A", 0.75), row("a3", "A", 0.5)],
    [row("a1", "A", 1.0), row("a2", "A", 0.75), row("a3", "A", 0.5), row("a4", "A", 0.28)],
  ],
  // Act 2: A builds, suspends (dim), B stacks on top, then merge into one tower.
  flaw: [
    [row("a1", "A", 1.0), row("a2", "A", 0.72), row("a3", "A", 0.46)],
    [row("a1", "A", 1.0, 0, true), row("a2", "A", 0.72, 0, true), row("a3", "A", 0.46, 0, true)],
    [
      row("a1", "A", 1.0, 0, true), row("a2", "A", 0.72, 0, true), row("a3", "A", 0.46, 0, true),
      row("b1", "B", 0.9), row("b2", "B", 0.6),
    ],
    [
      row("a1", "A", 1.0), row("b1", "B", 0.85), row("a2", "A", 0.7),
      row("b2", "B", 0.55), row("a3", "A", 0.4),
    ],
  ],
  // Act 3: A builds; await pops A (teardown); B builds clean; A resumes -> two separate pyramids.
  fix: [
    [row("a1", "A", 1.0), row("a2", "A", 0.72), row("a3", "A", 0.46)],
    [],
    [row("b1", "B", 1.0, 1), row("b2", "B", 0.72, 1), row("b3", "B", 0.46, 1)],
    [
      row("a1", "A", 1.0, 0), row("a2", "A", 0.72, 0), row("a3", "A", 0.46, 0),
      row("b1", "B", 1.0, 1), row("b2", "B", 0.72, 1), row("b3", "B", 0.46, 1),
    ],
  ],
};

export function beatRows(name, step) {
  const beats = BEATS[name];
  if (!beats) throw new Error(`unknown beats: ${name}`);
  const i = Math.max(0, Math.min(step, beats.length - 1));
  return beats[i];
}
