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
