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
