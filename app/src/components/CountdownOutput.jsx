import React from "react";

const { useShinyOutputValue, useSetShinyInput } = window.shinyreact;

export default function CountdownOutput() {
  const lines = useShinyOutputValue("demo_lines", []);
  const run = useSetShinyInput("run_countdown", 0, { priority: "event" });

  const btn = {
    fontSize: "1.3rem", padding: "10px 18px", borderRadius: 8,
    border: "1px solid #475569", background: "#1e293b", color: "#e2e8f0", cursor: "pointer",
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 12 }}>
        <button style={btn} onClick={() => run(Date.now())}>▶ Run</button>
      </div>
      <pre style={{
        background: "#0b1020", color: "#7dd3fc", padding: 16, borderRadius: 8,
        minHeight: 160, fontSize: "1.25rem", lineHeight: 1.5, overflow: "auto", margin: 0,
      }}>
        {(Array.isArray(lines) ? lines : []).join("\n") || "press Run…"}
      </pre>
    </div>
  );
}
