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
    if (is_demo_running()) return(invisible())  # ignore clicks while a run is in flight
    demo_lines(character(0))
    logfile <- tempfile(fileext = ".log")
    file.create(logfile)
    con <- file(logfile, "r")

    emit <- make_emit(logfile)
    # Start the async work and surface any rejection into the log — a Shiny
    # server would otherwise silently swallow an unhandled promise rejection.
    # domain_demo() sets the_ctx$running TRUE while in flight, FALSE when settled.
    promises::catch(
      domain_demo(emit, use_setup = use_setup),
      function(err) emit(sprintf("ERROR: %s", conditionMessage(err)))
    )

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

  observeEvent(input$run_countdown, {
    if (is_demo_running()) return(invisible())
    demo_lines(character(0))
    logfile <- tempfile(fileext = ".log")
    file.create(logfile)
    con <- file(logfile, "r")
    emit <- make_emit(logfile)
    promises::catch(
      countdown_demo(emit, n = 5),
      function(err) emit(sprintf("ERROR: %s", conditionMessage(err)))
    )
    drain <- function() {
      new <- readLines(con)
      if (length(new)) demo_lines(c(isolate(demo_lines()), new))
    }
    poll <- function() {
      drain()
      if (is_demo_running()) later::later(poll, 0.2)
      else { drain(); close(con) }
    }
    poll()
  })
}

shinyApp(ui, server)
