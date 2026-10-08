import { test, expect } from '@playwright/test';
import { expectView, makeFranchise, openAdminDashboard, rowWith, startAs } from './index';

test.describe('admin dashboard', () => {
  test('admin sees every franchise with its franchisee and stores', async ({ page }) => {
    await startAs(page, 'admin');
    await openAdminDashboard(page);

    await expect(rowWith(page, 'pizzaPocket')).toContainText('Pizza Franchisee');
    await expect(rowWith(page, 'lotaPizza')).toContainText('Other Owner');
    for (const store of ['SLC', 'Lehi', 'Springville']) {
      await expect(rowWith(page, store)).toBeVisible();
    }
  });

  test('can filter franchises by name', async ({ page }) => {
    await startAs(page, 'admin');
    await openAdminDashboard(page);

    await page.getByPlaceholder('Filter franchises').fill('lota');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(rowWith(page, 'lotaPizza')).toBeVisible();
    await expect(rowWith(page, 'pizzaPocket')).toHaveCount(0);
  });

  test('can page through franchises', async ({ page }) => {
    await startAs(page, 'admin', { franchises: [1, 2, 3, 4].map(makeFranchise) });
    await openAdminDashboard(page);

    await expect(rowWith(page, 'pie1')).toBeVisible();
    await expect(rowWith(page, 'pie3')).toBeVisible();
    await expect(rowWith(page, 'pie4')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '«' })).toBeDisabled();

    await page.getByRole('button', { name: '»' }).click();
    await expect(rowWith(page, 'pie4')).toBeVisible();
    await expect(rowWith(page, 'pie1')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '»' })).toBeDisabled();

    await page.getByRole('button', { name: '«' }).click();
    await expect(rowWith(page, 'pie1')).toBeVisible();
  });
});

test.describe('admin managing franchises', () => {
  test('can create a franchise', async ({ page }) => {
    const backend = await startAs(page, 'admin');
    await openAdminDashboard(page);

    await page.getByRole('button', { name: 'Add Franchise' }).click();
    await expect(page).toHaveURL(/\/admin-dashboard\/create-franchise$/);
    await expectView(page, 'Create franchise');
    await page.getByPlaceholder('franchise name').fill('newPizzaCo');
    await page.getByPlaceholder('franchisee admin email').fill('f@jwt.com');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
    await expect(rowWith(page, 'newPizzaCo')).toContainText('Pizza Franchisee');
    expect(backend.franchises.map((f) => f.name)).toContain('newPizzaCo');
  });

  test('can cancel creating a franchise', async ({ page }) => {
    const backend = await startAs(page, 'admin');
    await openAdminDashboard(page);
    await page.getByRole('button', { name: 'Add Franchise' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
    expect(backend.franchises).toHaveLength(2);
  });

  test('can close a franchise', async ({ page }) => {
    const backend = await startAs(page, 'admin');
    await openAdminDashboard(page);

    await rowWith(page, 'lotaPizza').getByRole('button', { name: 'Close' }).click();
    await expectView(page, 'Sorry to see you go');
    await expect(page.getByText(/close the lotaPizza franchise/)).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
    await expect(rowWith(page, 'lotaPizza')).toHaveCount(0);
    await expect(rowWith(page, 'pizzaPocket')).toBeVisible();
    expect(backend.franchises.map((f) => f.name)).toEqual(['pizzaPocket']);
  });

  test('canceling the close keeps the franchise', async ({ page }) => {
    await startAs(page, 'admin');
    await openAdminDashboard(page);

    await rowWith(page, 'lotaPizza').getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(rowWith(page, 'lotaPizza')).toBeVisible();
  });
});

test.describe('admin managing stores', () => {
  test('can close a store in any franchise', async ({ page }) => {
    const backend = await startAs(page, 'admin');
    await openAdminDashboard(page);

    await rowWith(page, 'Lehi').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText(/close the lotaPizza store Lehi/)).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
    await expect(rowWith(page, 'Lehi')).toHaveCount(0);
    await expect(rowWith(page, 'Springville')).toBeVisible();
    expect(backend.franchises[1].stores.map((s) => s.name)).toEqual(['Springville']);
  });
});
