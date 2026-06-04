import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({ jsxRuntime: "classic" })],
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
