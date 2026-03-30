import { test, expect, Page } from "@playwright/test";
import type { Graph } from "@butlerov-chemistry/core";

async function waitForHarness(page: Page, timeout = 10000) {
  await page.waitForFunction(() => {
    // @ts-expect-error test harness
    return typeof window.__butlerov_get_vertex_count__ === "function";
  }, { timeout });
}

async function waitForComponentReady(page: Page) {
  const container = page.locator("[data-testid=\"butlerov-container\"]");
  await expect(container).toBeVisible({ timeout: 10000 });

  await waitForHarness(page);

  await page.waitForFunction(() => {
    const containerEl = document.querySelector("[data-testid=\"butlerov-container\"]");
    if (!containerEl)
      return false;
    const canvases = containerEl.querySelectorAll("canvas");
    return canvases.length > 0;
  }, { timeout: 10000 });

  await page.waitForTimeout(500);
}

async function getContainerCoordinates(page: Page, x?: number, y?: number): Promise<{ x: number; y: number }> {
  const container = page.locator("[data-testid=\"butlerov-container\"]");
  const containerBox = await container.boundingBox();
  if (!containerBox)
    throw new Error("No bounding box for container");

  const clickX = x !== undefined ? containerBox.x + x : containerBox.x + containerBox.width / 2;
  const clickY = y !== undefined ? containerBox.y + y : containerBox.y + containerBox.height / 2;

  return { x: clickX, y: clickY };
}

async function click(page: Page, x?: number, y?: number) {
  const coords = await getContainerCoordinates(page, x, y);
  await page.mouse.click(coords.x, coords.y);
  await page.waitForTimeout(300);
}

async function getModel(page: Page): Promise<Graph> {
  return await page.evaluate(() => {
    // @ts-expect-error test harness
    if (typeof window.__butlerov_get_model__ === "function")
      // @ts-expect-error test harness
      return window.__butlerov_get_model__();
    throw new Error("Model getter not available");
  });
}

async function getMol(page: Page): Promise<string> {
  return await page.evaluate(() => {
    // @ts-expect-error test harness
    if (typeof window.__butlerov_get_mol__ === "function")
      // @ts-expect-error test harness
      return window.__butlerov_get_mol__();
    throw new Error("MOL getter not available");
  });
}

async function getVertexCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    // @ts-expect-error test harness
    if (typeof window.__butlerov_get_vertex_count__ === "function")
      // @ts-expect-error test harness
      return window.__butlerov_get_vertex_count__();
    throw new Error("Vertex count not available");
  });
}

async function isContainerFocused(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    // @ts-expect-error test harness
    if (typeof window.__butlerov_is_container_focused__ === "function")
      // @ts-expect-error test harness
      return window.__butlerov_is_container_focused__();
    return false;
  });
}

async function waitForModel(
  page: Page,
  predicate: (model: Graph) => boolean,
  timeout = 5000,
): Promise<Graph> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const model = await getModel(page);
    if (predicate(model))
      return model;
    await page.waitForTimeout(100);
  }
  const finalModel = await getModel(page);
  throw new Error(`Model did not reach expected state within ${timeout}ms. Current state: ${JSON.stringify(finalModel, null, 2)}`);
}

test("external v-model graph update redraws without error (plain Graph to core)", async ({ page }) => {
  test.setTimeout(15000);

  const errors: string[] = [];
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  await page.goto("http://localhost:5173/playground.html?binding=native", { waitUntil: "networkidle" });
  await waitForComponentReady(page);

  await page.evaluate(() => {
    const g = {
      type: "Graph" as const,
      vertices: [
        { x: 120, y: 120, label: "C" },
        { x: 220, y: 120, label: "O" },
      ],
      edges: [{ vertices: [0, 1] as [number, number] }],
    };
    // @ts-expect-error test harness
    window.__butlerov_set_model__?.(g);
  });

  await page.waitForFunction(() => {
    // @ts-expect-error test harness
    const n = window.__butlerov_get_vertex_count__?.() as number;
    return typeof n === "number" && n === 2;
  }, { timeout: 8000 });

  expect(errors, `page errors: ${errors.join("; ")}`).toEqual([]);
});

test("VueButlerov basic drawing operations (native v-model)", async ({ page }) => {
  test.setTimeout(10000);

  await page.goto("http://localhost:5173/playground.html?binding=native", { waitUntil: "networkidle" });
  await waitForComponentReady(page);

  await click(page);

  let model = await getModel(page);
  expect(model.vertices.length).toBe(2);
  expect(model.edges.length).toBe(1);

  await click(page, model.vertices[0].x, model.vertices[0].y);

  model = await waitForModel(page, (m) => m.vertices.length >= 3 && m.edges.length >= 2);
  expect(model.vertices.length).toBe(3);
  expect(model.edges.length).toBe(2);
});

test("invalid MOL string clears editor and does not break the component", async ({ page }) => {
  test.setTimeout(15000);

  const errors: string[] = [];
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  await page.goto("http://localhost:5173/playground.html?binding=mol", { waitUntil: "networkidle" });
  await waitForComponentReady(page);

  const molInput = page.getByTestId("mol-input");
  await molInput.fill("not a valid mol file at all\n");
  await page.waitForTimeout(400);

  expect(await getVertexCount(page)).toBe(0);
  expect(errors, `unexpected page errors: ${errors.join("; ")}`).toEqual([]);
});

test("v-model:mol emits MOL after edit", async ({ page }) => {
  test.setTimeout(15000);

  await page.goto("http://localhost:5173/playground.html?binding=mol", { waitUntil: "networkidle" });
  await waitForComponentReady(page);

  await click(page);

  await page.waitForFunction(() => {
    // @ts-expect-error test harness
    const mol = window.__butlerov_get_mol__?.() as string;
    return typeof mol === "string" && mol.includes("V2000");
  }, { timeout: 8000 });

  const mol = await getMol(page);
  expect(mol).toContain("V2000");
  expect(mol).toContain("Molecule name");

  const linesWithCarbon = mol.split("\n").filter((line) => line.includes(" C "));
  expect(linesWithCarbon.length).toBe(2);

  // Bond block: atoms 1 and 2, bond order 1 (V2000 pads fields; the substring "1  2  1" appears in the bond line).
  expect(mol).toContain("1  2  1");
});

test("copy button copies structure to clipboard (native)", async ({ page, context }) => {
  test.setTimeout(15000);

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("http://localhost:5173/playground.html?binding=native", { waitUntil: "networkidle" });
  await waitForComponentReady(page);

  await click(page);

  const model = await getModel(page);
  expect(model.vertices.length).toBeGreaterThan(0);

  const wrapper = page.locator(".vue-butlerov-wrapper");
  await wrapper.hover();
  const copyBtn = page.getByTestId("butlerov-copy");
  await expect(copyBtn).toBeVisible({ timeout: 5000 });
  await copyBtn.click();

  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.length).toBeGreaterThan(0);
  const parsed = JSON.parse(text) as { vertices?: unknown[] };
  expect(Array.isArray(parsed.vertices)).toBe(true);
});

test("disabled prevents editing", async ({ page }) => {
  test.setTimeout(15000);

  await page.goto("http://localhost:5173/playground.html?binding=native&disabled=1", { waitUntil: "networkidle" });
  await waitForComponentReady(page);

  expect(await getVertexCount(page)).toBe(0);

  await click(page);
  await page.waitForTimeout(400);

  expect(await getVertexCount(page)).toBe(0);
});

test("autofocus=false does not focus the stage container", async ({ page }) => {
  test.setTimeout(15000);

  await page.goto("http://localhost:5173/playground.html?binding=native&autofocus=0", { waitUntil: "networkidle" });
  await waitForComponentReady(page);

  await page.waitForTimeout(300);

  expect(await isContainerFocused(page)).toBe(false);
});
