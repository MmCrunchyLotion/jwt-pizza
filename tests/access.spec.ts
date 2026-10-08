import { test, expect, type Page } from '@playwright/test';
import { type RoleName, expectLoggedIn, expectLoggedOut, expectView, footerNav, headerNav, logout, startAs } from './index';

// The app shows the oops page while it is still loading the user, too. Pass the role so we wait until the
// header shows that user is signed in; otherwise this could pass before the real answer is known.
async function expectAdminPageBlocked(page: Page, role?: RoleName) {
  await page.goto('/admin-dashboard');
  if (role) await expectLoggedIn(page, role);
  await expectView(page, 'Oops');
  await expect(page.getByRole('button', { name: 'Add Franchise' })).toHaveCount(0);
}

test.describe('what logged out visitors cannot do', () => {
  test('cannot open the admin dashboard', async ({ page }) => {
    await startAs(page);
    await expectLoggedOut(page);
    await expectAdminPageBlocked(page);
  });

  test('franchise page only shows the sales pitch', async ({ page }) => {
    await startAs(page);
    await page.goto('/franchise-dashboard');
    await expectView(page, 'So you want a piece of the pie?');
    await expect(page.getByRole('button', { name: 'Create store' })).toHaveCount(0);
  });
});

test.describe('what diners and franchisees cannot do', () => {
  for (const role of ['diner', 'franchisee'] as RoleName[]) {
    test(`${role} has no admin link in the header`, async ({ page }) => {
      await startAs(page, role);
      await expect(headerNav(page).getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
    });

    test(`${role} cannot open the admin dashboard`, async ({ page }) => {
      await startAs(page, role);
      await expectAdminPageBlocked(page, role);
    });

    test(`${role} still sees order and franchise links`, async ({ page }) => {
      await startAs(page, role);
      await expect(headerNav(page).getByRole('link', { name: 'Order', exact: true })).toBeVisible();
      await expect(headerNav(page).getByRole('link', { name: 'Franchise', exact: true })).toBeVisible();
    });
  }

  test('diner does not get franchise management tools', async ({ page }) => {
    await startAs(page, 'diner');
    await page.goto('/franchise-dashboard');
    await expectView(page, 'So you want a piece of the pie?');
    await expect(page.getByRole('button', { name: 'Create store' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
  });

  test('franchisee only manages their own franchise', async ({ page }) => {
    await startAs(page, 'franchisee');
    await page.goto('/franchise-dashboard');
    await expectView(page, 'pizzaPocket');
    await expect(page.getByText('lotaPizza')).toHaveCount(0);
    await expect(page.getByText('Lehi')).toHaveCount(0);
  });
});

test.describe('what admins can do', () => {
  test('admin has an admin link and no franchise link in the header', async ({ page }) => {
    await startAs(page, 'admin');
    await expect(headerNav(page).getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
    await expect(headerNav(page).getByRole('link', { name: 'Franchise', exact: true })).toHaveCount(0);
    // The footer does not apply the same rule.
    await expect(footerNav(page).getByRole('link', { name: 'Franchise', exact: true })).toBeVisible();
  });

  test('admin can open the admin dashboard directly', async ({ page }) => {
    await startAs(page, 'admin');
    await page.goto('/admin-dashboard');
    await expectView(page, "Mama Ricci's kitchen");
    await expect(page.getByRole('button', { name: 'Add Franchise' })).toBeVisible();
  });
});

test.describe('access after logging out', () => {
  test('admin loses access to the admin dashboard', async ({ page }) => {
    await startAs(page, 'admin');
    await page.goto('/admin-dashboard');
    await expectView(page, "Mama Ricci's kitchen");

    await logout(page);
    await expectAdminPageBlocked(page);
  });
});
