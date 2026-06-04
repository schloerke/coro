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

  make_call <- function(owner, delay) {
    if (use_setup) {
      coro::async(function() {
        coro::setup(enter_ctx(owner))
        emit(sprintf("[%s] start       -> active=%s", owner, active_ctx()))
        coro::await(coro::async_sleep(delay))
        emit(sprintf("[%s] after await  -> active=%s", owner, active_ctx()))
      })
    } else {
      coro::async(function() {
        enter_ctx(owner)
        emit(sprintf("[%s] start       -> active=%s", owner, active_ctx()))
        coro::await(coro::async_sleep(delay))
        emit(sprintf("[%s] after await  -> active=%s", owner, active_ctx()))
      })
    }
  }

  the_ctx$running <- TRUE
  # A sleeps shorter (0.1s), B longer (0.3s): A resumes first while B's context
  # is still active — A sees "B" instead of "A". B then resumes after A's
  # on.exit has already fired and sees "<none>" instead of "B".
  # This makes the leak deterministic regardless of timing noise.
  p <- promises::promise_all(make_call("A", 0.1)(), make_call("B", 0.3)())
  promises::finally(p, function() the_ctx$running <- FALSE)
}

is_demo_running <- function() isTRUE(the_ctx$running)
