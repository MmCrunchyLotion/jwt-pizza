import { test, expect } from "./testSetup";
import {
  clickFooter,
  clickNav,
  expectView,
  footerNav,
  headerNav,
  startAs,
} from "./index";

test.describe("public pages (logged out)", () => {
  test("home page shows the hero and an order button", async ({ page }) => {
    await startAs(page);
    await expectView(page, "The web's best pizza");
    await page.getByRole("button", { name: "Order now" }).click();
    await expect(page).toHaveURL(/\/menu$/);
    await expectView(page, "Awesome is a click away");
  });

  test("header offers order, franchise, login and register only", async ({
    page,
  }) => {
    await startAs(page);
    const nav = headerNav(page);
    for (const title of ["Order", "Franchise", "Login", "Register"]) {
      await expect(
        nav.getByRole("link", { name: title, exact: true }),
      ).toBeVisible();
    }
    for (const title of ["Admin", "Logout"]) {
      await expect(
        nav.getByRole("link", { name: title, exact: true }),
      ).toHaveCount(0);
    }
  });

  test("footer links open about, history and franchise pages", async ({
    page,
  }) => {
    await startAs(page);

    await clickFooter(page, "About");
    await expectView(page, "The secret sauce");

    await clickFooter(page, "History");
    await expectView(page, "Mama Rucci, my my");

    await clickFooter(page, "Franchise");
    await expectView(page, "So you want a piece of the pie?");
  });

  test("footer shows the copyright line", async ({ page }) => {
    await startAs(page);
    await expect(footerNav(page).getByText("JWT Pizza LTD")).toBeVisible();
  });

  test("menu is visible without logging in", async ({ page }) => {
    await startAs(page);
    await clickNav(page, "Order");
    await expect(page.getByRole("heading", { name: "Veggie" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pepperoni" }),
    ).toBeVisible();
  });

  test("unknown routes show the oops page", async ({ page }) => {
    await startAs(page);
    await page.goto("/this/does/not/exist");
    await expectView(page, "Oops");
    await expect(page.getByText("dropped a pizza on the floor")).toBeVisible();
  });
});
