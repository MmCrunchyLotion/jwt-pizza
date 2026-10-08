import { Locator, Page, expect } from "@playwright/test";
import { RoleName, initials } from "./mockApi";

// The top menu. The footer and breadcrumb repeat some link names, so scope to this.
export function headerNav(page: Page): Locator {
  return page.getByRole("navigation", { name: "Global" });
}

export function footerNav(page: Page): Locator {
  return page.locator("footer");
}

export async function gotoHome(page: Page) {
  await page.goto("/");
}

export async function clickNav(page: Page, title: string) {
  await headerNav(page).getByRole("link", { name: title, exact: true }).click();
}

export async function clickFooter(page: Page, title: string) {
  await footerNav(page).getByRole("link", { name: title, exact: true }).click();
}

// The round avatar in the header takes you to the diner dashboard.
export async function openDashboard(page: Page, role: RoleName) {
  await headerNav(page)
    .getByRole("link", { name: initials[role], exact: true })
    .click();
  await expectView(page, "Your pizza kitchen");
}

export async function openFranchiseDashboard(page: Page) {
  await clickNav(page, "Franchise");
}

export async function openAdminDashboard(page: Page) {
  await clickNav(page, "Admin");
  await expectView(page, "Mama Ricci's kitchen");
}

// Every page puts its title in a heading.
export async function expectView(page: Page, title: string) {
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

// Finds a table row by text, e.g. the row for one store or franchise.
export function rowWith(page: Page, text: string): Locator {
  return page.getByRole("row").filter({ hasText: text });
}
