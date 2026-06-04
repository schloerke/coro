# Design — coro `setup()` lightning-talk presentation app

**Date:** 2026-06-04
**Status:** Draft for review
**Location of deliverable:** `app/` at the repo root

## 1. Goal

A ~5-minute lightning-talk slide deck, delivered as a **Shiny for R** web app hosting a
**React (Spectacle)** presentation via the **`shinyreact`** R package. The deck tells a
three-act story:

1. **coro's strengths** — async R that reads like synchronous R.
2. **The flaw** — promise-domain context is *not torn down at the `await`/`yield` boundary*,
   so concurrent async calls' contexts "merge."
3. **The fix** — `coro::setup()` (PR #70 / issue #68) registers per-step setup **and
   teardown**, so the context is rebuilt fresh each step and the pyramids stay separate.

The deck is visually anchored by an animated **flat-ziggurat "pyramid of applied contexts"**
and proven by a **live panel** that runs the real `coro` package and streams its output.

## 2. Audience & format

- **Audience / length:** lightning / demo, ~5 minutes, punchy, visual-forward, minimal code on
  screen.
- **Tone:** light (the Act-2 punchline is *"this is bad, mmkay."*).
- **Delivery:** presenter advances slides with arrow keys; the pyramid animation advances
  **one beat per space/→ press** (Spectacle steps), so the presenter narrates at their own pace.

## 3. Stack & architecture

### Host — Shiny for R + `shinyreact` (R package)

- Install: `pak::pak("posit-dev/shinyreact/pkg-r")`.
- `ui <- shinyreact::page_react_html("www/index.html")` — serves the Vite-built client and
  injects the shared `shinyreact` JS bundle (this is the R equivalent of Python's
  `set_react_page()`).
- Server exposes values the deck reads:
  `output$id <- shinyreact::reactive_output({ ... })` → client `useShinyOutputValue("id", …)`.
- Deck → server events (the **Run** buttons): client `useShinyInput("run_broken", …)` /
  `useSetShinyInput(...)` → server reads `input$run_broken` / `input$run_fixed`.
- Server is otherwise minimal — `shinyreact` is purely the host, as requested.

### Deck — Spectacle (v10)

- Chosen over `@revealjs/react` because the deck owns the whole page (embedding is irrelevant)
  and Spectacle's `useSteps()` / `activeStep` model is the cleanest way to drive the single
  custom step-by-step SVG pyramid animation that is the heart of the talk.
- **Risk:** Spectacle declares `react >=18`; React 19 (shipped by `shinyreact`) is not
  confirmed-tested. Mitigation in §9.

### Client / build

- The `shinyreact` JS is byte-identical between the R and Python packages, so the React client
  is backend-agnostic. Same `window.shinyreact` global, same Vite externalization of React.
- **Vite** builds `src/main.jsx` → `www/app.js` (IIFE), externalizing
  `react` / `react-dom` / `react-dom/client` to `window.shinyreact.React` / `.ReactDOM` so there
  is a single React-19 instance:

  ```js
  build: {
    outDir: "www", emptyOutDir: false, cssCodeSplit: false,
    lib: { entry: "src/main.jsx", formats: ["iife"], name: "App", fileName: () => "app.js" },
    rollupOptions: {
      external: ["react", "react-dom", "react-dom/client"],
      output: { globals: {
        react: "window.shinyreact.React",
        "react-dom": "window.shinyreact.ReactDOM",
        "react-dom/client": "window.shinyreact.ReactDOM",
      }},
    },
  },
  ```

### File layout (`app/`)

```
app/
  app.R                    # Shiny server: page_react_html + reactive_output + the live demo
  package.json             # spectacle, react/react-dom (externalized), vite, @vitejs/plugin-react
  vite.config.js
  www/
    index.html             # <div id="root">, loads app.js + main.css
    app.js                 # built (gitignored or committed — see §8)
    main.css               # built
  src/
    main.jsx               # mounts <Deck/> via window.shinyreact.React/ReactDOM
    Deck.jsx               # the Spectacle deck — all slides
    theme.js               # dark theme
    components/
      ContextPyramid.jsx   # ★ flat-ziggurat SVG, driven by activeStep (§5)
      RCode.jsx            # syntax-highlighted R snippets
      LiveOutput.jsx       # the streamed-output panel + Run buttons (§6)
  demo/
    domain_demo.R          # the broken/fixed coro demo run by the server (§6)
  README.md                # how to install coro (PR #70), build, and run
```

## 4. Slide outline (~10 slides)

1. **Title** — *coro: async R that reads like sync.* Subtitle teases `setup()` / issue #68.
2. **Act 1 · Strengths** — callback-style R vs. `async()/await()` side-by-side; "coro compiles
   this to a state machine and suspends at `await`/`yield`." One clean **teal** pyramid forms
   = one call applying its stack of contexts.
3. **Act 1 · Live proof** — the **Run** button runs the real `coro` concurrency example
   (`async_count_down` + `async_count_up`); interleaved output streams into `LiveOutput`.
   "This page is itself a live Shiny app running coro."
4. **Act 2 · The setup** — "Context travels in *promise domains* (Shiny's reactive/output
   domain, progress handlers, …)."
5. **Act 2 · THE FLAW (animated pyramid)** — beats:
   ① Call A pushes its domain rows (teal). ② A hits `await`, suspends — **the domain is not
   torn down; rows linger**. ③ Call B starts concurrently, pushes its rows (pink) **on top of
   A's**. ④ **Merge** — one muddy mixed-color over-tall pyramid. *"This is bad, mmkay."*
6. **Act 2 · Live proof of the bug** — **Run (broken)** runs `domain_demo.R` **without**
   `setup()`; emitted output shows the active domain bleeding across the `await` boundary
   (B's work runs under A's domain). Pairs with the merged pyramid.
7. **Act 3 · The fix = `setup()`** — short R snippet: push the domain inside `setup()`;
   per-step setup **and teardown**.
8. **Act 3 · THE FIX (same pyramid, fixed)** — beats:
   ① A's `setup()` pushes the domain. ② `await` = step end → **teardown pops A's rows**.
   ③ B runs cleanly — its own separate pyramid. ④ A resumes → `setup()` **re-applies, rebuilds A
   fresh**. Two clean, separate pyramids.
9. **Act 3 · Live proof of the fix** — **Run (fixed)** runs `domain_demo.R` **with** `setup()`;
   emitted output shows each call staying in its own domain.
10. **Close** — *"`setup()`: the teardown the async boundary was missing."* Properties: per-step,
    stacks/composes, works in `async()` + generators, symmetric teardown. Links to issue #68 /
    PR #70.

> Budget note: slides 3, 6, 9 are the three live moments. If running long, slide 3 (concurrency
> proof) is the first to cut — the bug/fix proofs (6, 9) carry the argument.

## 5. The `ContextPyramid` component

- **One reusable component**, three `beats` datasets (Act 1 clean / Act 2 merge / Act 3 fix).
- **Pure reducer** `beatRows(beats, activeStep) -> Row[]`, where `Row = { id, owner, color,
  width }`. This is the one piece with a unit test (vitest): given a beat index, assert the
  exact rows.
- **Render:** centered rounded `<rect>`s (flat ziggurat, decreasing width bottom→top). **CSS
  transitions** on `width` / `opacity` / `fill` animate rows sliding in, popping off, and
  color-blending on merge — **no animation library**.
- **Color encodes which async call owns a context:** call A = teal, call B = pink. Act 2's merge
  = the two colors interleaved in one over-tall pile; Act 3 = two clean single-color pyramids.
- **Stepping:** `useSteps(beats.length)` maps space/→ to `activeStep`. Each slide that hosts a
  pyramid owns its own step count.

## 6. Live demo subsystem (`emit()` → file → tail → stream)

The capture mechanism is decoupled from the `later` event loop for stage reliability (chosen
over `capture.output()`, which only catches synchronous output, and over `sink()` polling).

### `emit()` logger

The demo functions log via a small helper that **appends one line to a temp file**:

```r
make_emit <- function(path) {
  function(...) cat(paste0(..., "\n"), file = path, append = TRUE)
}
```

File I/O is synchronous and reliable regardless of where on the event loop the line is produced.

### Server flow (`app.R`)

```r
lines <- reactiveVal(character(0))
output$demo_lines <- reactive_output(lines())   # -> useShinyOutputValue("demo_lines", [])

run_demo <- function(use_setup) {
  logfile <- tempfile(fileext = ".log"); file.create(logfile)
  lines(character(0))
  con <- file(logfile, "r")                       # tail handle
  emit <- make_emit(logfile)
  domain_demo(emit, use_setup = use_setup)        # starts async work on the later loop
  poll <- function() {
    new <- readLines(con)                          # only unread lines
    if (length(new)) lines(c(isolate(lines()), new))
    if (still_running()) later::later(poll, 0.25) else close(con)
  }
  poll()
}
observeEvent(input$run_broken, run_demo(use_setup = FALSE))
observeEvent(input$run_fixed,  run_demo(use_setup = TRUE))
```

(`still_running()` = a flag the demo sets false on completion; or poll a fixed number of times.)

### One installed `coro` covers both cases

Install the **PR #70** build (which *has* `setup()`); the **same** package demonstrates both:

- `use_setup = FALSE` → no `setup()` is used → the domain isn't torn down at `await` → **bug**.
- `use_setup = TRUE`  → the domain is pushed inside `setup()` → **fixed**.

### `demo/domain_demo.R` — **DRAFT, needs author sign-off**

> ⚠️ This is the one item I want explicit confirmation on (§10). The promise-domain merge
> reprex is the package author's domain. Below is a *plausible* sketch of the shape; the exact
> domain construction and assertions should be confirmed/replaced by the author.

```r
# A promise domain that records which logical "owner" is currently active.
# Without setup(), entering this domain inside an async() function leaks the
# "owner" across the await boundary, so a concurrently-running call observes
# the wrong owner.
domain_demo <- function(emit, use_setup) {
  active_owner <- function() getOption("demo.owner", "<none>")

  run_call <- function(name) {
    body <- function() {
      # ... enter a promise domain that sets options(demo.owner = name) ...
      emit(sprintf("[%s] start; active = %s", name, active_owner()))
      await(async_sleep(0.3))
      emit(sprintf("[%s] after await; active = %s", name, active_owner()))  # <- wrong without setup()
    }
    if (use_setup) {
      # setup() pushes the domain per-step, tearing it down at each boundary
      async(function() { setup({ ... enter domain ... }); body() })()
    } else {
      async(function() { ... enter domain ...; body() })()
    }
  }
  promises::promise_all(run_call("A"), run_call("B"))
}
```

Expected emitted output:

- **broken:** the `after await` lines show the *other* call's owner (or `A`/`B` swapped) — the
  merge.
- **fixed:** each call's `after await` line shows its own owner.

### `LiveOutput.jsx`

- Reads `useShinyOutputValue("demo_lines", [])` and renders the lines in a monospace panel
  (auto-scroll to bottom).
- Two buttons (Run broken / Run fixed) wired through `useShinyInput`/`useSetShinyInput`
  (`priority: "event"`) so each click triggers a fresh run.

## 7. `coro` dependency

- The app runs the **PR #70** `coro` (has `setup()`). README documents installing it, e.g.
  `pak::pak("schloerke/coro@issue-68")` (exact ref confirmed in §10).
- `app.R` loads it with `library(coro)` (installed build). *(Alternative: `pkgload::load_all()`
  of the local checkout — but an installed PR build is the documented, reproducible path for the
  talk machine.)*
- Runtime R deps for the talk machine: `shiny`, `shinyreact`, `coro` (PR #70), `promises`,
  `later`, `htmltools`.

## 8. Build & run

- **Build client:** `cd app && npm install && npm run build` → emits `www/app.js` + `www/main.css`.
- **Run app:** `R -e 'shiny::runApp("app")'` (or via RStudio / `shiny run` equivalent).
- **Built artifacts:** commit `www/app.js`/`main.css` so the app runs without an npm build step on
  the talk machine (documented in README). `node_modules/` is gitignored.

## 9. Testing, verification & risks

### Verification ("done")

- `npm run build` is clean.
- The app launches and serves the deck; all slides reachable by arrow keys; each pyramid advances
  through its beats with space/→.
- **vitest** on the `beatRows` reducer (pure function).
- A **Playwright smoke check**: deck mounts, slide count correct, pyramid SVG row count changes
  across steps, and clicking a Run button populates the `LiveOutput` panel.
- Manual: the broken vs. fixed live runs produce the expected divergent output.

### Risks & mitigations

1. **React 19 × Spectacle (primary):** the *first* implementation task renders a trivial
   1-slide Spectacle deck through `shinyreact` and verifies it in the browser **before** any
   content is built. If Spectacle breaks on React 19, pivot to `@revealjs/react` immediately
   (cheap, the slide model is the only thing that changes).
2. **Live capture timing:** mitigated by the `emit()`→file→tail design (§6); file I/O is
   synchronous, polling decouples from the async loop.
3. **Domain-merge reprex correctness:** the demo R code is DRAFT pending author sign-off (§10).
4. **`shinyreact` is internal/private:** install requires auth; documented in README.

## 10. Open items needing sign-off

1. **`demo/domain_demo.R`** — confirm or replace the promise-domain merge reprex (the §6 draft is
   a sketch). This is the only piece depending on the author's promise-domain expertise.
2. **Exact `coro` install ref** for PR #70 (`schloerke/coro@issue-68` vs. another ref).
3. **R snippets** shown on slides 2, 7 — I'll pull short, real snippets from `R/async.R`,
   `R/setup.R`, and the issue/PR and show them for sign-off during implementation.
```
