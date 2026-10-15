import { test, expect } from "./testSetup";
import {
  expectView,
  openDashboard,
  openFranchiseDashboard,
  placeOrder,
  rowWith,
  startAs,
} from "./index";

test.describe("franchisee dashboard", () => {
  test("franchisee sees their franchise and its stores", async ({ page }) => {
    await startAs(page, "franchisee");
    await openFranchiseDashboard(page);

    await expectView(page, "pizzaPocket");
    await expect(rowWith(page, "SLC")).toBeVisible();
    // Only their own franchise, not the other one in the system.
    await expect(page.getByText("lotaPizza")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Create store" }),
    ).toBeVisible();
  });

  test("profile page lists the franchisee role", async ({ page }) => {
    await startAs(page, "franchisee");
    await openDashboard(page, "franchisee");
    await expect(page.getByText("Franchisee on 1")).toBeVisible();
  });
});

test.describe("franchisee managing stores", () => {
  test("can create a store", async ({ page }) => {
    const backend = await startAs(page, "franchisee");
    await openFranchiseDashboard(page);
    await expectView(page, "pizzaPocket");

    await page.getByRole("button", { name: "Create store" }).click();
    await expect(page).toHaveURL(/\/franchise-dashboard\/create-store$/);
    await expectView(page, "Create store");
    await page.getByPlaceholder("store name").fill("Downtown");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
    await expect(rowWith(page, "Downtown")).toBeVisible();
    expect(backend.franchises[0].stores.map((s) => s.name)).toContain(
      "Downtown",
    );
  });

  test("cancel on create store changes nothing", async ({ page }) => {
    const backend = await startAs(page, "franchisee");
    await openFranchiseDashboard(page);
    await page.getByRole("button", { name: "Create store" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
    expect(backend.franchises[0].stores).toHaveLength(1);
  });

  test("can close a store", async ({ page }) => {
    const backend = await startAs(page, "franchisee");
    await openFranchiseDashboard(page);

    await rowWith(page, "SLC").getByRole("button", { name: "Close" }).click();
    await expectView(page, "Sorry to see you go");
    await expect(
      page.getByText(/close the pizzaPocket store SLC/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
    await expect(rowWith(page, "SLC")).toHaveCount(0);
    expect(backend.franchises[0].stores).toHaveLength(0);
  });

  test("canceling the close keeps the store", async ({ page }) => {
    await startAs(page, "franchisee");
    await openFranchiseDashboard(page);

    await rowWith(page, "SLC").getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
    await expect(rowWith(page, "SLC")).toBeVisible();
  });
});

test.describe("franchisee as a customer", () => {
  test("franchisee can also order a pizza", async ({ page }) => {
    const backend = await startAs(page, "franchisee");
    await placeOrder(page, "SLC", ["Veggie"]);
    expect(backend.orders).toHaveLength(1);
  });
});
