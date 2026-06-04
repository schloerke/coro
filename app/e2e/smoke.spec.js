import { test, expect } from "@playwright/test";

test("deck mounts and the title slide renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("async R that reads like synchronous R")).toBeVisible();
});

test("pyramid advances: stepping changes the number of rendered rows", async ({ page }) => {
  await page.goto("/");
  // Slide 2 has ContextPyramid "strengths" with 4 beats.
  // Press once to enter slide 2, then step through its 3 internal steps.
  let counts = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    counts.push(await page.locator("svg rect").count());
  }
  const distinct = new Set(counts.filter((c) => c > 0));
  expect(distinct.size).toBeGreaterThan(1); // row count varied as steps advanced
});

test("live panel streams output when Run is clicked", async ({ page }) => {
  await page.goto("/");
  // Navigate to the first live slide (slide 3).
  // Slide 1: 0 steps, 1 press to exit.
  // Slide 2: 3 steps (useSteps(3)) + 1 press to exit = 4 presses.
  // Total: 5 presses to arrive at slide 3.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
  }
  // Slide 3 has LiveOutput with showFixed=false — "Run (no setup)" button present.
  // Find the Run button and its containing output pre (scoped to same parent div).
  const runBtn = page.getByRole("button", { name: /Run \(no setup\)/ }).first();
  await runBtn.waitFor({ timeout: 3000 });
  // The LiveOutput component wraps button and pre in a single root div; find the pre sibling.
  const outputPre = runBtn.locator("xpath=../..//pre");
  await runBtn.click();
  await expect(outputPre).toContainText("after await", { timeout: 10000 });
});
