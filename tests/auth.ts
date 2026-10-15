import { expect, type Page } from "@playwright/test";
import {
  initials,
  mockBackend,
  publicUser,
  users,
  type Backend,
  type BackendOptions,
  type RoleName,
} from "./mockApi";
import { clickNav, gotoHome, headerNav } from "./navigation";

export async function submitLogin(page: Page, email: string, password: string) {
  await page.getByPlaceholder("Email address").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}

// Logs in through the real login form and waits until the header shows a logged-in user.
export async function loginAs(page: Page, role: RoleName) {
  const user = users[role];
  await gotoHome(page);
  await clickNav(page, "Login");
  await submitLogin(page, user.email, user.password);
  await expectLoggedIn(page, role);
}

export async function register(
  page: Page,
  name: string,
  email: string,
  password: string,
) {
  await gotoHome(page);
  await clickNav(page, "Register");
  await page.getByPlaceholder("Full name").fill(name);
  await page.getByPlaceholder("Email address").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
}

export async function logout(page: Page) {
  await clickNav(page, "Logout");
  await expect(
    headerNav(page).getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
}

export async function expectLoggedIn(page: Page, role: RoleName) {
  await expect(
    headerNav(page).getByRole("link", { name: "Logout", exact: true }),
  ).toBeVisible();
  await expect(
    headerNav(page).getByRole("link", { name: initials[role], exact: true }),
  ).toBeVisible();
}

export async function expectLoggedOut(page: Page) {
  await expect(
    headerNav(page).getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(
    headerNav(page).getByRole("link", { name: "Logout", exact: true }),
  ).toHaveCount(0);
}

// One call for the usual test setup: fake the backend, then optionally start already signed in as a role.
// Signing in is seeded (a saved token plus a matching session in the fake backend) instead of clicking
// through the login form, which keeps tests short. Use loginAs when the login flow itself is under test.
export async function startAs(
  page: Page,
  role?: RoleName,
  options: BackendOptions = {},
): Promise<Backend> {
  const backend = await mockBackend(page, options);
  if (role) {
    backend.currentUser = publicUser(users[role]);
    // Seed the token once per tab. The flag keeps a later logout from being undone by a reload.
    await page.addInitScript((token) => {
      if (!sessionStorage.getItem("seededToken")) {
        localStorage.setItem("token", token);
        sessionStorage.setItem("seededToken", "yes");
      }
    }, `token-${users[role].id}`);
    await gotoHome(page);
    await expectLoggedIn(page, role);
  } else {
    await gotoHome(page);
  }
  return backend;
}
