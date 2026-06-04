import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({ jsxRuntime: "classic" })],
  // Build-only (our scripts only ever run "vite build" / "vite build --watch").
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.REACT_APP_SC_ATTR": JSON.stringify(undefined),
    "process.env.REACT_APP_SC_DISABLE_SPEEDY": JSON.stringify(undefined),
    "process.env.SC_ATTR": JSON.stringify(undefined),
    "process.env.SC_DISABLE_SPEEDY": JSON.stringify(undefined),
  },
  build: {
    outDir: "www",
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: "src/main.jsx",
      formats: ["iife"],
      name: "App",
      fileName: () => "app.js",
    },
    rollupOptions: {
      // NOTE: bare `react-dom` must NOT be externalized — Spectacle needs the bundled
      // copy for createPortal (window.shinyreact.ReactDOM is the client-only surface).
      // Only `react` and `react-dom/client` are externalized.
      external: ["react", "react-dom/client"],
      output: {
        assetFileNames: "main.css",
        globals: {
          react: "window.shinyreact.React",
          "react-dom/client": "window.shinyreact.ReactDOM",
        },
      },
    },
  },
});
