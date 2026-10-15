import { test, expect } from "./testSetup";
import { expectLoggedIn, logout, startAs, submitLogin } from "./auth";
import { users } from "./mockApi";
import { clickNav } from "./navigation";

test("updateUser", async ({ page }) => {
  const backend = await startAs(page, "diner");

  await page.getByRole("link", { name: "PD", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("Pizza Diner");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("Pizza Dinerx");
  await page.getByRole("textbox").nth(2).fill("newpassword");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });
  await expect(page.getByRole("main")).toContainText("Pizza Dinerx");
  expect(backend.requests).toContain(`PUT /api/user/${users.diner.id}`);

  // the new name and password survive a fresh login
  await logout(page);
  await clickNav(page, "Login");
  await submitLogin(page, users.diner.email, "newpassword");
  await expectLoggedIn(page, "diner");

  await page.getByRole("link", { name: "PD", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("Pizza Dinerx");
});
