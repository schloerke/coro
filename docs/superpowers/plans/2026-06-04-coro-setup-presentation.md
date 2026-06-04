# coro `setup()` Lightning-Talk Presentation App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a ~5-minute lightning-talk slide deck as a Shiny-for-R app that hosts a React (Spectacle) presentation via `shinyreact`, anchored by an animated "pyramid of applied contexts" and a live panel that runs the real `coro` package to prove the missing-promise-domain bug and its `setup()` fix.

**Architecture:** Shiny for R serves a Vite-built React client through `shinyreact::page_react_html()`. The client is a Spectacle deck; one custom SVG component (`ContextPyramid`) animates step-by-step via Spectacle's `useSteps()`. A live panel sends button events to the R server (`useShinyInput` → `input$run_*`), which runs `coro` async demos that log via an `emit()` helper to a temp file; an R `later` poller tails the file into a `reactiveVal` surfaced by `reactive_output()` and streamed back via `useShinyOutputValue()`.

**Tech Stack:** R (shiny, shinyreact, **coro loaded from this repo via `pkgload::load_all()`** — the installed CRAN coro 1.1.0 has no `setup()`, but this branch does, promises, later), React 19 (provided by shinyreact at `window.shinyreact.React`), Spectacle 10, Vite 5 (IIFE build, React externalized), vitest, testthat, Playwright.

**Environment (already verified):** R 4.5.2, node v22.13.1, npm 11.4.1; `shiny` 1.13.0, `shinyreact` 0.0.0.9000, `promises` 1.5.0, `later` 1.4.8, `testthat` 3.3.2, `pkgload` 1.5.2 are all installed. `pkgload::load_all(<repo root>)` exposes `coro::setup()`/`async()`/`async_sleep()`. **Sandbox note:** binding a port (`shiny::runApp`) and `npm install`/`npx playwright install` (network) may hit the command sandbox — rerun the specific command with the sandbox disabled if you see `EPERM`/network errors.

**Spec:** `docs/superpowers/specs/2026-06-04-coro-setup-presentation-design.md`

---

## File structure

```
app/
  app.R                    # Shiny server: page_react_html + reactive_output + live-demo wiring
  package.json             # spectacle + build/test toolchain (react externalized at build)
  vite.config.js           # IIFE build to www/, classic JSX runtime, React externalized
  vitest.config.js         # jsdom env for the reducer unit test
  playwright.config.js     # e2e smoke (assumes app already running)
  www/
    index.html             # mount point + built bundle refs
    app.js                 # BUILT (committed) — do not edit by hand
    main.css               # BUILT (committed)
  src/
    main.jsx               # mounts <Deck/> via window.shinyreact.React/ReactDOM
    Deck.jsx               # the Spectacle deck — all slides
    theme.js               # dark Spectacle theme
    pyramidBeats.js        # the three beats datasets + beatRows() reducer (pure, tested)
    pyramidBeats.test.js   # vitest unit test for beatRows()
    components/
      ContextPyramid.jsx   # flat-ziggurat SVG, renders rows from beatRows(), CSS transitions
      RCode.jsx            # syntax-highlighted R snippet (Spectacle CodePane wrapper)
      LiveOutput.jsx       # streamed-output panel + Run buttons
  demo/
    domain_demo.R          # emit() + enter_ctx() + domain_demo() run by the server
    test-domain_demo.R     # testthat: broken vs fixed divergence
  e2e/
    smoke.spec.js          # Playwright smoke test
  README.md                # install coro (PR #70) + shinyreact, build, run
```

**JSX runtime note (applies to every `.jsx` file):** the build uses the **classic** JSX runtime so the only React import that needs externalizing is `"react"` (the automatic runtime would emit an un-externalized `react/jsx-runtime` import that `window.shinyreact` does not provide). Therefore **every `.jsx` file must `import React from "react";`** at the top. This is validated in Task 2.

---

### Task 1: Scaffold the app and prove an empty React client renders through shinyreact (R)

**Files:**
- Create: `app/package.json`
- Create: `app/vite.config.js`
- Create: `app/www/index.html`
- Create: `app/src/main.jsx`
- Create: `app/src/Deck.jsx` (temporary "hello" placeholder)
- Create: `app/app.R`
- Create: `app/.gitignore`

- [ ] **Step 1: Create `app/package.json`**

```json
{
  "name": "coro-setup-talk",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "spectacle": "^10.2.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `app/vite.config.js`** (classic JSX runtime; externalize React to the shinyreact globals)

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({ jsxRuntime: "classic" })],
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
      external: ["react", "react-dom", "react-dom/client"],
      output: {
        assetFileNames: "main.css",
        globals: {
          react: "window.shinyreact.React",
          "react-dom": "window.shinyreact.ReactDOM",
          "react-dom/client": "window.shinyreact.ReactDOM",
        },
      },
    },
  },
});
```

- [ ] **Step 3: Create `app/www/index.html`** (fragment; `page_react_html` injects the shinyreact bundle)

```html
<link rel="stylesheet" href="main.css" />
<div id="root"></div>
<script src="app.js" defer></script>
```

- [ ] **Step 4: Create `app/src/main.jsx`**

```jsx
import React from "react";
import Deck from "./Deck.jsx";

const { ReactDOM } = window.shinyreact;
ReactDOM.createRoot(document.getElementById("root")).render(<Deck />);
```

- [ ] **Step 5: Create temporary `app/src/Deck.jsx`** (placeholder, replaced in Task 8)

```jsx
import React from "react";

export default function Deck() {
  return <h1 style={{ color: "white", fontFamily: "sans-serif" }}>coro talk — scaffold OK</h1>;
}
```

- [ ] **Step 6: Create `app/app.R`** (minimal host)

```r
library(shiny)
library(shinyreact)

ui <- page_react_html("www/index.html")

server <- function(input, output, session) {
  # live-demo wiring added in Task 7
}

shinyApp(ui, server)
```

- [ ] **Step 7: Create `app/.gitignore`**

```
node_modules/
```

- [ ] **Step 8: Install JS deps and build**

Run: `cd app && npm install && npm run build`
Expected: completes without error; `app/www/app.js` is created. (`main.css` may not exist yet — fine, the placeholder has no CSS import.)

- [ ] **Step 9: Verify the R app serves the client**

Run: `cd app && R -e 'shiny::runApp(".", port = 8000, launch.browser = FALSE)'` (leave running), then open `http://127.0.0.1:8000` in a browser.
Expected: the page shows **"coro talk — scaffold OK"** (white text on default background). This confirms `shinyreact` is loading `window.shinyreact`, `app.js` mounts, and React 19 renders. Stop the app (Ctrl-C) when confirmed.

> If `window.shinyreact` is undefined or the page is blank, confirm `shinyreact` (R) is installed (`pak::pak("posit-dev/shinyreact/pkg-r")`) and that `index.html` references `app.js`.

- [ ] **Step 10: Commit**

```bash
git add app/package.json app/vite.config.js app/www/index.html app/src/main.jsx app/src/Deck.jsx app/app.R app/.gitignore app/www/app.js
git commit -m "feat(app): scaffold shinyreact-hosted React client (#68)"
```

---

### Task 2: Validate Spectacle renders under React 19 (the primary risk)

**Files:**
- Modify: `app/src/Deck.jsx`

- [ ] **Step 1: Replace `app/src/Deck.jsx` with a minimal 1-slide Spectacle deck**

```jsx
import React from "react";
import { Deck as SpectacleDeck, Slide, Heading } from "spectacle";

export default function Deck() {
  return (
    <SpectacleDeck>
      <Slide>
        <Heading>Spectacle + React 19 OK</Heading>
      </Slide>
    </SpectacleDeck>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd app && npm run build`
Expected: build succeeds; `app/www/app.js` and `app/www/main.css` exist.

- [ ] **Step 3: Run the app and verify in the browser**

Run: `cd app && R -e 'shiny::runApp(".", port = 8000, launch.browser = FALSE)'`, open `http://127.0.0.1:8000`.
Expected: a full-screen Spectacle slide showing "Spectacle + React 19 OK"; pressing `→`/`←` is a no-op (one slide); no console errors about hooks or duplicate React.

> **PIVOT GATE:** If Spectacle errors under React 19 (e.g. invalid hook call, blank deck), stop and switch the deck library to `@revealjs/react`: `npm install @revealjs/react reveal.js`, and in later tasks replace `<SpectacleDeck>/<Slide>` with reveal's `<Deck>/<Slide>` and `useSteps()` with reveal fragment events (`onFragmentShown`). The rest of this plan (pyramid, live demo, server) is library-agnostic. Record the pivot in the commit message.

- [ ] **Step 4: Commit**

```bash
git add app/src/Deck.jsx app/www/app.js app/www/main.css
git commit -m "feat(app): confirm Spectacle renders under React 19 (#68)"
```

---

### Task 3: The `beatRows()` reducer + beats data (pure, unit-tested)

**Files:**
- Create: `app/src/pyramidBeats.js`
- Create: `app/src/pyramidBeats.test.js`
- Create: `app/vitest.config.js`

A "beat" is one animation step: an array of rows. `Row = { id, owner, color, width, group, dim }`.
`owner`/`color`: `"A"`→teal `#38bdf8`, `"B"`→pink `#f472b6`. `group`: which side-by-side pyramid column (0 or 1). `dim`: lingering/suspended (rendered at low opacity). `width`: relative row width 0–1 (the ziggurat narrows going up).

- [ ] **Step 1: Create `app/vitest.config.js`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom" },
});
```

- [ ] **Step 2: Write the failing test `app/src/pyramidBeats.test.js`**

```js
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd app && npx vitest run src/pyramidBeats.test.js`
Expected: FAIL — `Failed to resolve import "./pyramidBeats.js"`.

- [ ] **Step 4: Implement `app/src/pyramidBeats.js`**

```js
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd app && npx vitest run src/pyramidBeats.test.js`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add app/src/pyramidBeats.js app/src/pyramidBeats.test.js app/vitest.config.js app/package.json
git commit -m "feat(app): pyramid beats data + beatRows reducer with tests (#68)"
```

---

### Task 4: `ContextPyramid` SVG component (renders beats, animates via CSS, steps via Spectacle)

**Files:**
- Create: `app/src/components/ContextPyramid.jsx`

- [ ] **Step 1: Implement `app/src/components/ContextPyramid.jsx`**

```jsx
import React from "react";
import { useSteps } from "spectacle";
import { beatRows, BEATS } from "../pyramidBeats.js";

const VIEW_W = 960;
const VIEW_H = 460;
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
  // One step per beat; Spectacle advances `step` on space/->.
  const { step } = useSteps(BEATS[name].length - 1);
  const placed = layout(beatRows(name, step));

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="460"
           style={{ display: "block" }}>
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
        <p style={{ color: "#cbd5e1", textAlign: "center", fontSize: "1.4rem", marginTop: 8 }}>
          {caption[Math.min(step, caption.length - 1)]}
        </p>
      ) : null}
    </div>
  );
}
```

> **`useSteps` API caveat:** Spectacle's `useSteps(count)` returns an object — this plan reads
> `step` (0-indexed). Depending on the installed 10.x, the property may be named differently and
> the hook may return a `placeholder` element that **must be rendered inside the slide** for the
> step count to register. If stepping doesn't advance in Step 3, render the returned `placeholder`
> (e.g. `const { step, placeholder } = useSteps(...); return (<>{placeholder}<svg>…</svg></>)`) and
> use the actual step property name from `node_modules/spectacle`.

- [ ] **Step 2: Temporarily mount it to verify visually** — replace `app/src/Deck.jsx` body with a deck that shows the flaw pyramid:

```jsx
import React from "react";
import { Deck as SpectacleDeck, Slide } from "spectacle";
import ContextPyramid from "./components/ContextPyramid.jsx";

export default function Deck() {
  return (
    <SpectacleDeck>
      <Slide>
        <ContextPyramid
          name="flaw"
          caption={[
            "Call A enters its domain",
            "A awaits — domain NOT torn down",
            "Call B starts, stacks on top",
            "Merged: A's context leaks into B",
          ]}
        />
      </Slide>
    </SpectacleDeck>
  );
}
```

- [ ] **Step 3: Build and verify the animation**

Run: `cd app && npm run build`, then `R -e 'shiny::runApp(".", port = 8000, launch.browser = FALSE)'`, open `http://127.0.0.1:8000`.
Expected: a teal 3-row pyramid; pressing `→` four times walks the captions and animates: rows dim → pink rows stack on top → rows interleave into one tall mixed tower. Rows slide/fade smoothly (CSS transition). Stop the app when confirmed.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/ContextPyramid.jsx app/src/Deck.jsx app/www/app.js app/www/main.css
git commit -m "feat(app): ContextPyramid SVG animates beats via Spectacle steps (#68)"
```

---

### Task 5: `RCode` snippet component

**Files:**
- Create: `app/src/components/RCode.jsx`

- [ ] **Step 1: Implement `app/src/components/RCode.jsx`** (thin wrapper over Spectacle's `CodePane`)

```jsx
import React from "react";
import { CodePane } from "spectacle";

export default function RCode({ children }) {
  return (
    <CodePane language="r" theme="vs-dark" highlightStart={1}>
      {children}
    </CodePane>
  );
}
```

- [ ] **Step 2: Build to confirm it compiles** (no standalone render needed; exercised in Task 8)

Run: `cd app && npm run build`
Expected: build succeeds.

> If `CodePane` props differ in the installed Spectacle 10.x (the prop surface has shifted across minor versions), adjust to the installed API: the only requirement is a syntax-highlighted R block. Confirm by checking `node_modules/spectacle` exports.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/RCode.jsx app/www/app.js
git commit -m "feat(app): RCode syntax-highlight wrapper (#68)"
```

---

### Task 6: The live `coro` demo (`emit()` + `domain_demo()`) with a divergence test (R, TDD)

**Files:**
- Create: `app/demo/domain_demo.R`
- Create: `app/demo/test-domain_demo.R`

This is the faithful reprex of the bug the package author described: a context entered with an
`on.exit()` restore is **not** torn down at the `await` boundary in a plain `async()` body (coro
preserves user `on.exit` across suspends, firing it only at function exit), so concurrent calls
observe each other's context. Inside `setup()`, the restore fires at each **step** end, keeping
contexts separate. The enter/restore shape mirrors the canonical `setup()` example in `R/setup.R`.

> **Author sign-off item (spec §10):** this uses an `on.exit`-based context as a faithful,
> headless-friendly stand-in for a promise domain. If you prefer a literal
> `promises::with_promise_domain()` framing, swap the body of `enter_ctx()`/the demo here — the
> server wiring, test, and slides are unaffected.

- [ ] **Step 1: Write the failing test `app/demo/test-domain_demo.R`**

```r
library(testthat)
library(promises)
library(later)

# Load the in-repo coro (it has setup(); installed CRAN coro 1.1.0 does not).
# Run from app/demo, so the repo root is ../..
pkgload::load_all(file.path("..", ".."), quiet = TRUE)
stopifnot("setup" %in% getNamespaceExports("coro"))

source("domain_demo.R")  # run from app/demo

run_to_completion <- function(p) {
  done <- FALSE
  promises::finally(p, function() done <<- TRUE)
  for (i in seq_len(400)) {
    if (done) break
    later::run_now(0.02)
  }
  stopifnot(done)
}

read_demo <- function(use_setup) {
  f <- tempfile(fileext = ".log")
  file.create(f)
  emit <- make_emit(f)
  run_to_completion(domain_demo(emit, use_setup = use_setup))
  readLines(f)
}

test_that("without setup(), context leaks across the await boundary", {
  after <- grep("after await", read_demo(use_setup = FALSE), value = TRUE)
  leaked <- any(
    grepl("\\[A\\].*active=B", after),
    grepl("\\[B\\].*active=A", after),
    grepl("active=<none>", after)
  )
  expect_true(leaked)
})

test_that("with setup(), each call keeps its own context", {
  after <- grep("after await", read_demo(use_setup = TRUE), value = TRUE)
  a_lines <- grep("\\[A\\]", after, value = TRUE)
  b_lines <- grep("\\[B\\]", after, value = TRUE)
  expect_true(length(a_lines) >= 1 && all(grepl("active=A", a_lines)))
  expect_true(length(b_lines) >= 1 && all(grepl("active=B", b_lines)))
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app/demo && Rscript -e 'testthat::test_file("test-domain_demo.R")'`
Expected: FAIL — `cannot open file 'domain_demo.R'` / object `make_emit` not found.

- [ ] **Step 3: Implement `app/demo/domain_demo.R`**

```r
# A synchronous, event-loop-safe logger: append one line to a file.
make_emit <- function(path) {
  force(path)
  function(...) cat(paste0(..., "\n"), file = path, append = TRUE)
}

# Shared "context" standing in for a promise domain.
the_ctx <- new.env(parent = emptyenv())
the_ctx$active <- "<none>"
active_ctx <- function() the_ctx$active

# Enter a context: set the active owner and register an on.exit() restore in the
# CALLING frame. In a plain async() body that on.exit only fires at FUNCTION exit
# (coro keeps user on.exit across suspends), so the owner leaks across awaits.
enter_ctx <- function(owner) {
  old <- the_ctx$active
  the_ctx$active <- owner
  do.call(
    "on.exit",
    list(bquote(the_ctx$active <- .(old)), add = TRUE, after = FALSE),
    envir = parent.frame()
  )
  invisible()
}

domain_demo <- function(emit, use_setup) {
  the_ctx$active <- "<none>"

  make_call <- function(owner) {
    if (use_setup) {
      coro::async(function() {
        coro::setup(enter_ctx(owner))
        emit(sprintf("[%s] start       -> active=%s", owner, active_ctx()))
        coro::await(coro::async_sleep(0.2))
        emit(sprintf("[%s] after await  -> active=%s", owner, active_ctx()))
      })
    } else {
      coro::async(function() {
        enter_ctx(owner)
        emit(sprintf("[%s] start       -> active=%s", owner, active_ctx()))
        coro::await(coro::async_sleep(0.2))
        emit(sprintf("[%s] after await  -> active=%s", owner, active_ctx()))
      })
    }
  }

  # is_running flag lets the server know when the tail poller can stop.
  the_ctx$running <- TRUE
  p <- promises::promise_all(make_call("A")(), make_call("B")())
  promises::finally(p, function() the_ctx$running <- FALSE)
}

is_demo_running <- function() isTRUE(the_ctx$running)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd app/demo && Rscript -e 'testthat::test_file("test-domain_demo.R")'`
Expected: PASS (2 tests). The broken run shows e.g. `[A] after await -> active=B`; the fixed run shows `[A] ... active=A` and `[B] ... active=B`.

> If the broken case is flaky (timing), make the divergence deterministic by giving A a longer sleep than B (`async_sleep(0.3)` for A, `0.1` for B) so B sets the context while A is suspended. Keep both equal for the fixed case.

- [ ] **Step 5: Commit**

```bash
git add app/demo/domain_demo.R app/demo/test-domain_demo.R
git commit -m "feat(app): live coro promise-domain demo + divergence test (#68)"
```

---

### Task 7: Wire the live panel — R server streaming + `LiveOutput.jsx`

**Files:**
- Modify: `app/app.R`
- Create: `app/src/components/LiveOutput.jsx`

- [ ] **Step 1: Replace `app/app.R` with the full host (live-demo wiring)**

```r
library(shiny)
library(shinyreact)
library(promises)
library(later)

# Load the in-repo coro (it has setup(); installed CRAN coro 1.1.0 does not).
# runApp("app") sets the working directory to app/, so the repo root is "..".
pkgload::load_all("..", quiet = TRUE)
stopifnot("setup" %in% getNamespaceExports("coro"))

source("demo/domain_demo.R", local = TRUE)

ui <- page_react_html("www/index.html")

server <- function(input, output, session) {
  demo_lines <- reactiveVal(character(0))
  output$demo_lines <- reactive_output(demo_lines())

  run_demo <- function(use_setup) {
    demo_lines(character(0))
    logfile <- tempfile(fileext = ".log")
    file.create(logfile)
    con <- file(logfile, "r")

    emit <- make_emit(logfile)
    domain_demo(emit, use_setup = use_setup)  # starts async work; sets the_ctx$running

    drain <- function() {
      new <- readLines(con)
      if (length(new)) demo_lines(c(isolate(demo_lines()), new))
    }
    poll <- function() {
      drain()
      if (is_demo_running()) {
        later::later(poll, 0.2)
      } else {
        drain()          # final flush after completion
        close(con)
      }
    }
    poll()
  }

  observeEvent(input$run_broken, run_demo(use_setup = FALSE))
  observeEvent(input$run_fixed, run_demo(use_setup = TRUE))
}

shinyApp(ui, server)
```

- [ ] **Step 2: Implement `app/src/components/LiveOutput.jsx`**

```jsx
import React from "react";

const { useShinyOutputValue, useSetShinyInput } = window.shinyreact;

export default function LiveOutput({ showFixed = false }) {
  const lines = useShinyOutputValue("demo_lines", []);
  const runBroken = useSetShinyInput("run_broken", 0, { priority: "event" });
  const runFixed = useSetShinyInput("run_fixed", 0, { priority: "event" });

  const btn = {
    fontSize: "1.3rem", padding: "10px 18px", marginRight: 12, borderRadius: 8,
    border: "1px solid #475569", background: "#1e293b", color: "#e2e8f0", cursor: "pointer",
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 12 }}>
        <button style={btn} onClick={() => runBroken(Date.now())}>▶ Run (no setup)</button>
        {showFixed ? (
          <button style={btn} onClick={() => runFixed(Date.now())}>▶ Run (with setup)</button>
        ) : null}
      </div>
      <pre style={{
        background: "#0b1020", color: "#7dd3fc", padding: 16, borderRadius: 8,
        minHeight: 220, fontSize: "1.25rem", lineHeight: 1.5, overflow: "auto", margin: 0,
      }}>
        {(Array.isArray(lines) ? lines : []).join("\n") || "press Run…"}
      </pre>
    </div>
  );
}
```

> `useSetShinyInput` returns a setter (write-only producer). Clicking sends a fresh value
> (`Date.now()`) with `priority: "event"` so each click re-triggers the server `observeEvent`,
> even if the value would otherwise be unchanged.

- [ ] **Step 3: Temporarily mount `LiveOutput` to verify streaming** — set `app/src/Deck.jsx` to:

```jsx
import React from "react";
import { Deck as SpectacleDeck, Slide } from "spectacle";
import LiveOutput from "./components/LiveOutput.jsx";

export default function Deck() {
  return (
    <SpectacleDeck>
      <Slide>
        <LiveOutput showFixed={true} />
      </Slide>
    </SpectacleDeck>
  );
}
```

- [ ] **Step 4: Build and verify the live round-trip**

Run: `cd app && npm run build`, then `R -e 'shiny::runApp(".", port = 8000, launch.browser = FALSE)'`, open `http://127.0.0.1:8000`.
Expected: clicking **Run (no setup)** streams ~4 lines into the panel within ~0.5s, including an `after await` line where A or B shows the *wrong* `active=`. Clicking **Run (with setup)** streams lines where each call shows its *own* `active=`. Stop the app when confirmed.

- [ ] **Step 5: Commit**

```bash
git add app/app.R app/src/components/LiveOutput.jsx app/src/Deck.jsx app/www/app.js app/www/main.css
git commit -m "feat(app): live streaming panel wired to coro demo (#68)"
```

---

### Task 8: Assemble the full deck (`Deck.jsx` + `theme.js`)

**Files:**
- Create: `app/src/theme.js`
- Modify: `app/src/Deck.jsx` (final version — all slides)

- [ ] **Step 1: Create `app/src/theme.js`**

```js
export const theme = {
  colors: {
    primary: "#e2e8f0",
    secondary: "#38bdf8",
    tertiary: "#0b1020",
    quaternary: "#f472b6",
  },
  fonts: {
    header: '"Helvetica Neue", system-ui, sans-serif',
    text: '"Helvetica Neue", system-ui, sans-serif',
  },
};
```

- [ ] **Step 2: Write the final `app/src/Deck.jsx`** (all 10 slides; snippets are real, from `R/async.R` and `R/setup.R`)

```jsx
import React from "react";
import { Deck as SpectacleDeck, Slide, Heading, Text, FlexBox, Box } from "spectacle";
import ContextPyramid from "./components/ContextPyramid.jsx";
import RCode from "./components/RCode.jsx";
import LiveOutput from "./components/LiveOutput.jsx";
import { theme } from "./theme.js";

const ASYNC_SNIPPET = `async_count_down <- async(function(n) {
  while (n > 0) {
    cat("Down", n, "\\n")
    await(async_sleep(2))
    n <- n - 1
  }
})`;

const SETUP_SNIPPET = `gen <- generator(function() {
  setup({
    old_x <- the$x
    the$x <- 1
    on.exit(the$x <- old_x, add = TRUE)  # fires at EACH step end
  })
  yield(the$x)   # 1
  yield(the$x)   # 1 again: setup re-ran
})`;

const DOMAIN_SNIPPET = `# the fix: push the context inside setup()
async(function() {
  setup(enter_ctx(owner))          # re-applied each step, torn down each boundary
  emit(active_ctx())               # owner
  await(async_sleep(0.2))
  emit(active_ctx())               # still owner — no leak
})`;

export default function Deck() {
  return (
    <SpectacleDeck theme={theme}>
      {/* 1 — Title */}
      <Slide>
        <FlexBox height="100%" flexDirection="column">
          <Heading>coro</Heading>
          <Text>async R that reads like synchronous R</Text>
          <Text color="secondary">…and the teardown the async boundary was missing — setup() (#68)</Text>
        </FlexBox>
      </Slide>

      {/* 2 — Act 1: strengths */}
      <Slide>
        <Heading fontSize="2.5rem">coro turns callbacks into straight-line code</Heading>
        <RCode>{ASYNC_SNIPPET}</RCode>
        <Text fontSize="1.4rem" color="secondary">
          Compiled to a state machine; suspends at await/yield, resumes where it left off.
        </Text>
        <ContextPyramid name="strengths" caption={[
          "one call…", "applies a context…", "and another…", "a clean stack of applied contexts",
        ]} />
      </Slide>

      {/* 3 — Act 1: live proof */}
      <Slide>
        <Heading fontSize="2.4rem">…and it really runs (live, in this page)</Heading>
        <Text fontSize="1.3rem">Two concurrent coro async calls, interleaving on the event loop:</Text>
        <LiveOutput showFixed={false} />
      </Slide>

      {/* 4 — Act 2: the setup */}
      <Slide>
        <FlexBox height="100%" flexDirection="column">
          <Heading fontSize="2.6rem">But context travels in promise domains</Heading>
          <Text>Shiny's reactive/output domain, progress handlers, …</Text>
          <Text color="quaternary">What happens to that context across an await?</Text>
        </FlexBox>
      </Slide>

      {/* 5 — Act 2: THE FLAW (animated pyramid) */}
      <Slide>
        <Heading fontSize="2.4rem">The domain is never torn down at the boundary</Heading>
        <ContextPyramid name="flaw" caption={[
          "Call A enters its domain",
          "A awaits — domain NOT torn down, it lingers",
          "Call B starts concurrently, stacks on top",
          "Merged: A's context leaks into B. This is bad, mmkay.",
        ]} />
      </Slide>

      {/* 6 — Act 2: live proof of the bug */}
      <Slide>
        <Heading fontSize="2.4rem">See the leak (no setup())</Heading>
        <Text fontSize="1.3rem">Each call prints which context is active after its await:</Text>
        <LiveOutput showFixed={false} />
      </Slide>

      {/* 7 — Act 3: the fix */}
      <Slide>
        <Heading fontSize="2.5rem">setup(): per-step setup AND teardown</Heading>
        <RCode>{SETUP_SNIPPET}</RCode>
        <RCode>{DOMAIN_SNIPPET}</RCode>
      </Slide>

      {/* 8 — Act 3: THE FIX (same pyramid, fixed) */}
      <Slide>
        <Heading fontSize="2.4rem">Rebuilt each step, separate again</Heading>
        <ContextPyramid name="fix" caption={[
          "A's setup() pushes the domain",
          "await = step end → teardown pops A",
          "B runs clean — its own pyramid",
          "A resumes → setup re-applies. Two separate pyramids.",
        ]} />
      </Slide>

      {/* 9 — Act 3: live proof of the fix */}
      <Slide>
        <Heading fontSize="2.4rem">No leak with setup()</Heading>
        <Text fontSize="1.3rem">Run both and compare — broken vs. fixed:</Text>
        <LiveOutput showFixed={true} />
      </Slide>

      {/* 10 — Close */}
      <Slide>
        <FlexBox height="100%" flexDirection="column">
          <Heading fontSize="2.6rem">setup()</Heading>
          <Text>per-step • stacks &amp; composes • generators + async • symmetric teardown</Text>
          <Box />
          <Text color="secondary">r-lib/coro#68 · PR #70</Text>
        </FlexBox>
      </Slide>
    </SpectacleDeck>
  );
}
```

- [ ] **Step 3: Build and walk the whole deck**

Run: `cd app && npm run build`, then `R -e 'shiny::runApp(".", port = 8000, launch.browser = FALSE)'`, open `http://127.0.0.1:8000`.
Expected: 10 slides reachable with `→`/`←`; the two pyramid slides animate through their beats on space/`→`; the two code slides render highlighted R; the live slides stream output on Run. Stop the app when confirmed.

> If a `Heading`/`Text`/`FlexBox`/`Box` prop is rejected by the installed Spectacle 10.x, adjust to the installed component API (check `node_modules/spectacle`); the structure (10 slides, 2 pyramids, 2 code blocks, 3 live panels) must hold.

- [ ] **Step 4: Commit**

```bash
git add app/src/theme.js app/src/Deck.jsx app/www/app.js app/www/main.css
git commit -m "feat(app): assemble full 10-slide deck (#68)"
```

---

### Task 9: Playwright smoke test

**Files:**
- Create: `app/playwright.config.js`
- Create: `app/e2e/smoke.spec.js`

- [ ] **Step 1: Create `app/playwright.config.js`**

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:8000" },
  timeout: 30000,
});
```

- [ ] **Step 2: Create `app/e2e/smoke.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("deck mounts and the title slide renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("async R that reads like synchronous R")).toBeVisible();
});

test("pyramid advances: stepping changes the number of rendered rows", async ({ page }) => {
  await page.goto("/");
  // Navigate to the flaw pyramid slide (slide 5): press ArrowRight to advance slides/steps.
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  const before = await page.locator("svg rect").count();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const after = await page.locator("svg rect").count();
  expect(after).not.toBe(before);
});

test("live panel streams output when Run is clicked", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Run \(no setup\)/ }).first().click();
  await expect(page.locator("pre")).toContainText("after await", { timeout: 5000 });
});
```

- [ ] **Step 3: Install the Playwright browser, start the app, run the test**

Run (terminal 1): `cd app && R -e 'shiny::runApp(".", port = 8000, launch.browser = FALSE)'`
Run (terminal 2): `cd app && npx playwright install chromium && npx playwright test`
Expected: 3 tests pass. Stop the app afterward.

> The button-name selector assumes the title-slide Run button is reachable; if Playwright can't see it on slide 1, navigate to a live slide first with `ArrowRight` presses, mirroring the pyramid test. Adjust the slide-index counts to match the final deck.

- [ ] **Step 4: Commit**

```bash
git add app/playwright.config.js app/e2e/smoke.spec.js app/package.json
git commit -m "test(app): Playwright smoke for deck, pyramid, live panel (#68)"
```

---

### Task 10: README + final verification

**Files:**
- Create: `app/README.md`

- [ ] **Step 1: Create `app/README.md`**

````markdown
# coro `setup()` lightning talk

A ~5-minute slide deck (Shiny for R + `shinyreact` + Spectacle) on coro's strengths, the
missing-promise-domain flaw, and the `setup()` fix (r-lib/coro#68, PR #70).

## Prerequisites

R packages:

```r
install.packages("pak")
pak::pak(c("shiny", "promises", "later", "pkgload"))
pak::pak("posit-dev/shinyreact/pkg-r")   # internal/private repo — requires auth
# coro is NOT installed separately: the app loads it from THIS repo with
# pkgload::load_all() (this branch has setup(); the released coro 1.1.0 does not).
```

Node (only to rebuild the client; the built `www/app.js` is committed):

```sh
cd app && npm install
```

## Build the client

```sh
cd app && npm run build      # -> www/app.js, www/main.css
```

## Run the talk

```sh
R -e 'shiny::runApp("app", launch.browser = TRUE)'
```

Arrow keys move between slides; space/→ advances the pyramid animation one beat. The live slides
run the real `coro` package: **Run (no setup)** shows context leaking across `await`; **Run (with
setup)** shows it staying separate.

## Tests

```sh
cd app && npm test                                   # beatRows reducer (vitest)
cd app/demo && Rscript -e 'testthat::test_file("test-domain_demo.R")'   # bug/fix divergence
cd app && npx playwright test                        # e2e smoke (app must be running on :8000)
```
````

- [ ] **Step 2: Final full verification**

Run, in order:
- `cd app && npm run build` → clean build.
- `cd app && npm test` → reducer tests pass.
- `cd app/demo && Rscript -e 'testthat::test_file("test-domain_demo.R")'` → 2 tests pass.
- `R -e 'shiny::runApp("app", port = 8000, launch.browser = FALSE)'` + manual browser walk of all 10 slides, both pyramids animating, all three live panels streaming, broken vs. fixed output visibly diverging.

Expected: all green; the talk runs end to end.

- [ ] **Step 3: Commit**

```bash
git add app/README.md
git commit -m "docs(app): README — install, build, run, test (#68)"
```

---

## Open items carried from the spec (resolve with the author before/at the live-demo task)

1. **`app/demo/domain_demo.R`** (Task 6) — confirm the `on.exit`-based context reprex, or swap in
   a literal `promises::with_promise_domain()` version. Server/test/slides are unaffected.
2. ~~**`coro` install ref**~~ — **RESOLVED:** the app loads coro from this repo via
   `pkgload::load_all()` (verified to expose `setup()`); no PR/fork install needed.
3. **On-slide R snippets** (Task 8) — the `async`/`setup`/domain snippets are pulled from
   `R/async.R` and `R/setup.R`; confirm wording/length fit the 5-minute budget.
