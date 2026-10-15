import { test, expect } from "./testSetup";
import type { Page } from "@playwright/test";
import { logout, startAs, submitLogin } from "./auth";
import { makeUser, users } from "./mockApi";
import { clickNav } from "./navigation";

async function filterUsers(page: Page, text: string) {
  await page.getByPlaceholder("Filter users").fill(text);
  await page.getByRole("button", { name: "Search users" }).click();
}

const userRow = (page: Page, email: string) =>
  page.locator("tr", { hasText: email });

test("admin sees every user with name, email and role", async ({ page }) => {
  await startAs(page, "admin");
  await clickNav(page, "Admin");

  const diner = userRow(page, users.diner.email);
  await expect(diner).toContainText(users.diner.name);
  await expect(diner).toContainText("diner");
  await expect(userRow(page, users.franchisee.email)).toContainText(
    "franchisee",
  );
  await expect(userRow(page, users.admin.email)).toContainText("admin");
});

test("admin can filter users by name", async ({ page }) => {
  await startAs(page, "admin");
  await clickNav(page, "Admin");
  await expect(userRow(page, users.franchisee.email)).toBeVisible();

  await filterUsers(page, "Diner");
  await expect(userRow(page, users.diner.email)).toBeVisible();
  await expect(userRow(page, users.franchisee.email)).toHaveCount(0);
  await expect(userRow(page, users.admin.email)).toHaveCount(0);
});

test("admin can page through users", async ({ page }) => {
  const backend = await startAs(page, "admin");
  // 3 built-in users + 11 extra = 14, so page 1 holds 10 and page 2 holds 4
  for (let i = 0; i < 11; i++) backend.registered.push(makeUser(i));
  await clickNav(page, "Admin");

  const previous = page.getByRole("button", { name: "Previous users page" });
  const next = page.getByRole("button", { name: "Next users page" });

  await expect(userRow(page, "u6@jwt.com")).toBeVisible();
  await expect(userRow(page, "u7@jwt.com")).toHaveCount(0);
  await expect(previous).toBeDisabled();

  await next.click();
  await expect(userRow(page, "u10@jwt.com")).toBeVisible();
  await expect(userRow(page, "u0@jwt.com")).toHaveCount(0);
  await expect(next).toBeDisabled();

  await previous.click();
  await expect(userRow(page, "u0@jwt.com")).toBeVisible();
});

test("admin can delete a user, and cancelling keeps them", async ({ page }) => {
  const backend = await startAs(page, "admin");
  await clickNav(page, "Admin");
  await filterUsers(page, users.diner.name);

  // cancelling keeps the user
  await userRow(page, users.diner.email)
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(
    page.getByText("Are you sure you want to delete the user"),
  ).toContainText(users.diner.name);
  await page.getByRole("button", { name: "Cancel" }).click();
  await filterUsers(page, users.diner.name);
  await expect(userRow(page, users.diner.email)).toBeVisible();
  expect(backend.requests).not.toContain(`DELETE /api/user/${users.diner.id}`);

  // confirming removes the user
  await userRow(page, users.diner.email)
    .getByRole("button", { name: "Delete" })
    .click();
  await page.getByRole("button", { name: "Delete" }).click();
  await filterUsers(page, users.diner.name);
  await expect(userRow(page, users.diner.email)).toHaveCount(0);
  expect(backend.requests).toContain(`DELETE /api/user/${users.diner.id}`);

  // the deleted user can no longer log in
  await logout(page);
  await clickNav(page, "Login");
  await submitLogin(page, users.diner.email, users.diner.password);
  await expect(page.getByText("unknown user")).toBeVisible();
});

test("non-admin does not get the user list", async ({ page }) => {
  const backend = await startAs(page, "diner");
  await page.goto("/admin-dashboard");

  await expect(page.getByText("dropped a pizza on the floor")).toBeVisible();
  await expect(page.getByPlaceholder("Filter users")).toHaveCount(0);
  expect(backend.requests).not.toContain("GET /api/user");
});
