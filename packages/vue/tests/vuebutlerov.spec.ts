import { test, expect, Page } from '@playwright/test';
import type { Graph } from '@butlerov-chemistry/core';

test('VueButlerov basic drawing operations', async ({ page }: { page: Page }) => {
    await page.goto('http://localhost:5173/playground.html'); // Adjust port/path if needed

    const container = page.locator('[data-testid="butlerov-container"]');
    await expect(container).toBeVisible();

    const box = await container.boundingBox();
    if (!box) throw new Error('No bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Wait for the model to update
    await page.waitForTimeout(300);

    // Tell TypeScript about window.model injected by the playground app
    const modelValue: Graph = await page.evaluate(() => {
        // @ts-expect-error: model is injected by the playground app
        return window.model.value;
    });
    expect(modelValue.vertices.length).toBe(2);
    expect(modelValue.edges.length).toBe(1);
});