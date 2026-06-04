import React from "react";

const { useShinyOutputValue, useSetShinyInput } = window.shinyreact;

export default function SideBySideOutput() {
  const brokenLines = useShinyOutputValue("broken_lines", []);
  const fixedLines  = useShinyOutputValue("fixed_lines", []);
  const runBroken = useSetShinyInput("run_side_broken", 0, { priority: "event" });
  const runFixed  = useSetShinyInput("run_side_fixed",  0, { priority: "event" });

  const btn = (color) => ({
    fontSize: "1.2rem", padding: "8px 16px", borderRadius: 8, width: "100%",
    marginBottom: 8, cursor: "pointer",
    border: "1px solid #475569", background: "#1e293b", color,
  });

  const pre = (color) => ({
    background: "#0b1020", color, padding: 12, borderRadius: 8,
    minHeight: 160, fontSize: "1.1rem", lineHeight: 1.6, overflow: "auto", margin: 0,
  });

  const fmt = (lines) =>
    (Array.isArray(lines) ? lines : []).join("\n") || "press Run…";

  return (
    <div style={{ display: "flex", gap: 20, width: "100%" }}>
      <div style={{ flex: 1 }}>
        <button style={btn("#7dd3fc")} onClick={() => runBroken(Date.now())}>
          ▶ Run (no setup)
        </button>
        <pre style={pre("#f87171")}>{fmt(brokenLines)}</pre>
      </div>
      <div style={{ flex: 1 }}>
        <button style={btn("#86efac")} onClick={() => runFixed(Date.now())}>
          ▶ Run (with setup)
        </button>
        <pre style={pre("#86efac")}>{fmt(fixedLines)}</pre>
      </div>
    </div>
  );
}
