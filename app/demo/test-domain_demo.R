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
