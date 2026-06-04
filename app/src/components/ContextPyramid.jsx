import React from "react";
import { useSteps } from "spectacle";
import { beatRows, BEATS } from "../pyramidBeats.js";

const VIEW_W = 960;
// 5 rows max × (46+8) = 270px; 300 gives a little headroom at the top.
const VIEW_H = 300;
const ROW_H = 46;
const ROW_GAP = 8;

// Lay rows out as centered, stacked bars per group (column).
function layout(rows) {
  const groups = [...new Set(rows.map((r) => r.group))].sort();
  const colW = VIEW_W / groups.length;
  const placed = [];
  groups.forEach((g, gi) => {
    const colRows = rows.filter((r) => r.group === g);
    const cx = colW * gi + colW / 2;
    colRows.forEach((r, idx) => {
      const w = r.width * (colW * 0.82);
      placed.push({
        ...r,
        x: cx - w / 2,
        y: VIEW_H - (idx + 1) * (ROW_H + ROW_GAP),
        w,
      });
    });
  });
  return placed;
}

export default function ContextPyramid({ name, caption }) {
  // useSteps returns { step, placeholder, isActive, stepId }.
  // `step` starts at -1 (inactive / before first advance) and increments to
  // numSteps-1.  We pass (length - 1) so the range is -1 … length-2, then
  // shift by +1 to get beat indices 0 … length-1.
  // The placeholder element MUST be rendered or Spectacle won't register the
  // steps and `step` stays permanently at -1.
  const numSteps = BEATS[name].length - 1;
  const { step, placeholder } = useSteps(numSteps);
  // step is -1 when inactive (before first advance), or NaN during the initial
  // threshold-collection render (activationThresholds not yet populated).
  // Treat NaN as -1 so beatIndex always lands in [0, length-1].
  const safeStep = Number.isFinite(step) ? step : -1;
  const beatIndex = safeStep + 1; // -1 → 0, 0 → 1, … numSteps-1 → numSteps
  const placed = layout(beatRows(name, beatIndex));

  return (
    <div style={{ width: "100%" }}>
      {/* placeholder must be in the DOM for step registration */}
      {placeholder}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={VIEW_H}
        style={{ display: "block" }}
      >
        {placed.map((r) => (
          <rect
            key={r.id}
            x={r.x}
            y={r.y}
            width={r.w}
            height={ROW_H}
            rx="6"
            fill={r.color}
            opacity={r.dim ? 0.32 : 1}
            style={{ transition: "all 420ms cubic-bezier(.2,.7,.2,1)" }}
          />
        ))}
      </svg>
      {caption ? (
        <p
          style={{
            color: "#cbd5e1",
            textAlign: "center",
            fontSize: "1.4rem",
            marginTop: 8,
          }}
        >
          {caption[Math.min(Math.max(0, beatIndex), caption.length - 1)]}
        </p>
      ) : null}
    </div>
  );
}
