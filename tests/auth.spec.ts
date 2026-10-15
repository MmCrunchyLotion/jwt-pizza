import { test, expect } from "./testSetup";
import {
  type RoleName,
  clickNav,
  expectLoggedIn,
  expectLoggedOut,
  expectView,
  headerNav,
  loginAs,
  logout,
  register,
  startAs,
  submitLogin,
  users,
} from "./index";

test.describe("login", () => {
  for (const role of ["diner", "franchisee", "admin"] as RoleName[]) {
    test(`${role} can log in`, async ({ page }) => {
      await startAs(page);
      await loginAs(page, role);

      // Logged in users no longer see the login and register links.
      await expect(
        headerNav(page).getByRole("link", { name: "Login", exact: true }),
      ).toHaveCount(0);
      await expect(
        headerNav(page).getByRole("link", { name: "Register", exact: true }),
      ).toHaveCount(0);
    });
  }

  test("wrong password shows an error and stays logged out", async ({
    page,
  }) => {
    await startAs(page);
    await clickNav(page, "Login");
    await submitLogin(page, users.diner.email, "not-the-password");

    await expect(page.getByText(/unknown user/)).toBeVisible();
    await expectLoggedOut(page);
  });

  test("login page links to register", async ({ page }) => {
    await startAs(page);
    await clickNav(page, "Login");
    await page.locator("form").getByText("Register", { exact: true }).click();
    await expectView(page, "Welcome to the party");
  });

  test("session survives a page reload", async ({ page }) => {
    await startAs(page);
    await loginAs(page, "diner");
    await page.reload();
    await expectLoggedIn(page, "diner");
  });
});

test.describe("register", () => {
  test("new users are registered and logged in", async ({ page }) => {
    await startAs(page);
    await register(page, "New Diner", "new@jwt.com", "secret");

    await expect(
      headerNav(page).getByRole("link", { name: "Logout", exact: true }),
    ).toBeVisible();
    await headerNav(page)
      .getByRole("link", { name: "ND", exact: true })
      .click();
    await expectView(page, "Your pizza kitchen");
    await expect(page.getByText("New Diner", { exact: true })).toBeVisible();
    await expect(page.getByText("new@jwt.com", { exact: true })).toBeVisible();
    await expect(page.getByText("diner", { exact: true })).toBeVisible();
  });

  test("register page links to login", async ({ page }) => {
    await startAs(page);
    await clickNav(page, "Register");
    await page.locator("form").getByText("Login", { exact: true }).click();
    await expectView(page, "Welcome back");
  });

  test("registering an existing email shows an error", async ({ page }) => {
    await startAs(page);
    await register(page, "Dup", users.diner.email, "x");
    await expect(page.getByText(/user already exists/)).toBeVisible();
    await expectLoggedOut(page);
  });
});

test.describe("logout", () => {
  test("logging out returns to the logged out menu and clears the token", async ({
    page,
  }) => {
    await startAs(page, "diner");
    await logout(page);

    await expectView(page, "The web's best pizza");
    await expectLoggedOut(page);
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  });

  test("a logged out user stays logged out after reload", async ({ page }) => {
    await startAs(page, "franchisee");
    await logout(page);
    await page.reload();
    await expectLoggedOut(page);
  });
});
