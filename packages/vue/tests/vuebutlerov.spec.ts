import { test, expect, Page } from "@playwright/test";
import type { Graph } from "@butlerov-chemistry/core";

// Helper function to wait for model to be exposed on window
async function waitForModelExposed(page: Page, timeout = 10000) {
    await page.waitForFunction(() => {
        // @ts-expect-error: Accessing test helper exposed by PlaygroundApp
        return typeof window.__butlerov_get_model__ === "function" || 
               (window.__butlerov_test_model__ && window.__butlerov_test_model__.value !== undefined);
    }, { timeout });
}

// Helper function to get the v-model value from the exposed window object
async function getModel(page: Page): Promise<Graph> {
    return await page.evaluate(() => {
        // @ts-expect-error: Accessing test helper exposed by PlaygroundApp
        if (typeof window.__butlerov_get_model__ === "function") {
            // @ts-expect-error: Accessing test helper
            return window.__butlerov_get_model__();
        }
        // Fallback: try direct access
        // @ts-expect-error: Accessing test helper
        if (window.__butlerov_test_model__ && window.__butlerov_test_model__.value !== undefined) {
            // @ts-expect-error: Accessing test helper
            return window.__butlerov_test_model__.value;
        }
        throw new Error("Model not exposed on window. Make sure PlaygroundApp component is mounted.");
    });
}

// Helper function to wait for component to be ready
async function waitForComponentReady(page: Page) {
    const container = page.locator("[data-testid=\"butlerov-container\"]");
    await expect(container).toBeVisible({ timeout: 10000 });

    // Wait for model to be exposed on window
    await waitForModelExposed(page);

    // Wait for Konva canvas to be ready
    await page.waitForFunction(() => {
        const container = document.querySelector("[data-testid=\"butlerov-container\"]");
        if (!container) return false;
        const canvases = container.querySelectorAll("canvas");
        return canvases.length > 0;
    }, { timeout: 10000 });

    // Wait a bit for editor to be fully initialized
    await page.waitForTimeout(500);
}

// Helper function to get container coordinates
async function getContainerCoordinates(page: Page, x?: number, y?: number): Promise<{ x: number; y: number }> {
    const container = page.locator("[data-testid=\"butlerov-container\"]");
    const containerBox = await container.boundingBox();
    if (!containerBox) throw new Error("No bounding box for container");

    const clickX = x !== undefined ? containerBox.x + x : containerBox.x + containerBox.width / 2;
    const clickY = y !== undefined ? containerBox.y + y : containerBox.y + containerBox.height / 2;
    
    return { x: clickX, y: clickY };
}

// Helper function to click on the component at specified coordinates
async function click(page: Page, x?: number, y?: number) {
    const coords = await getContainerCoordinates(page, x, y);
    await page.mouse.click(coords.x, coords.y);
    await page.waitForTimeout(300); // Wait for click to be processed
}

// Helper function to wait for model to change to expected state
async function waitForModel(
    page: Page, 
    predicate: (model: Graph) => boolean, 
    timeout = 5000
): Promise<Graph> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const model = await getModel(page);
        if (predicate(model)) {
            return model;
        }
        await page.waitForTimeout(100);
    }
    const finalModel = await getModel(page);
    throw new Error(`Model did not reach expected state within ${timeout}ms. Current state: ${JSON.stringify(finalModel, null, 2)}`);
}

test("VueButlerov basic drawing operations", async ({ page }) => {
    test.setTimeout(10000);

    // Setup: Navigate and wait for component to be ready
    await page.goto("http://localhost:5173/playground.html", { waitUntil: "networkidle" });
    await waitForComponentReady(page);

    // Business logic: Click on component to create a default fragment
    await click(page);

    // Verification: Check that v-model has 2 vertices and 1 edge
    let model = await getModel(page);
    expect(model.vertices.length).toBe(2);
    expect(model.edges.length).toBe(1);

    // Click again on the vertex (should add another vertex+edge)
    await click(page, model.vertices[0].x, model.vertices[0].y);
    
    // Wait for model to update and verify it has 3 vertices and 2 edges
    model = await waitForModel(page, (m) => m.vertices.length >= 3 && m.edges.length >= 2);
    expect(model.vertices.length).toBe(3);
    expect(model.edges.length).toBe(2);

    /*await hover(page, model.vertices[1].x, model.vertices[1].y);
    await pressKey(page, "o");
    await click(page, model.vertices[1].x, model.vertices[1].y);
    //model = await waitForModel(page, (m) => m.vertices.length >= 4);
    await page.waitForTimeout(1000);
    console.log(model.vertices);
    expect(model.vertices.length).toBe(4);
    expect(model.edges.length).toBe(3);*/
});
