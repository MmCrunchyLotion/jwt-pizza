import { test, expect } from '@playwright/test';
import { type MockOrder, addPizza, chooseStore, clickNav, expectView, fillCart, openDashboard, openMenu, payNow, placeOrder, startAs, submitLogin, users } from './index';

test.describe('diner ordering', () => {
  test('diner can order a pizza from menu to delivery', async ({ page }) => {
    const backend = await startAs(page, 'diner');
    await placeOrder(page, 'SLC', ['Veggie', 'Pepperoni']);

    expect(backend.orders).toHaveLength(1);
    const order = backend.orders[0];
    expect(order.storeId).toBe('1');
    expect(order.franchiseId).toBe('1');
    expect(order.items.map((i) => i.description)).toEqual(['Veggie', 'Pepperoni']);

    await expect(page.getByText('order ID:')).toBeVisible();
    await expect(page.getByText(order.id, { exact: true })).toBeVisible();
    await expect(page.getByText('pie count:')).toBeVisible();
  });

  test('payment page summarizes the order', async ({ page }) => {
    await startAs(page, 'diner');
    await openMenu(page);
    await fillCart(page, 'Lehi', ['Veggie', 'Veggie', 'Pepperoni']);

    await expectView(page, 'So worth it');
    await expect(page.getByText('Send me those 3 pizzas right now!')).toBeVisible();
    await expect(page.getByText('3 pies')).toBeVisible();
  });

  test('checkout stays disabled until a store and a pizza are chosen', async ({ page }) => {
    await startAs(page, 'diner');
    await openMenu(page);
    const button = page.getByRole('button', { name: 'Checkout' });

    await expect(button).toBeDisabled();
    await chooseStore(page, 'SLC');
    await expect(button).toBeDisabled();
    await addPizza(page, 'Veggie');
    await expect(page.getByText('Selected pizzas: 1')).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('canceling payment returns to the menu with the pizzas still selected', async ({ page }) => {
    await startAs(page, 'diner');
    await openMenu(page);
    await fillCart(page, 'SLC', ['Veggie']);
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expectView(page, 'Awesome is a click away');
    await expect(page.getByText('Selected pizzas: 1')).toBeVisible();
  });

  test('a failed order shows the error and does not reach delivery', async ({ page }) => {
    await startAs(page, 'diner', { failOrders: true });
    await openMenu(page);
    await fillCart(page, 'SLC', ['Veggie']);
    await payNow(page);

    await expect(page.getByText(/Failed to fulfill order at factory/)).toBeVisible();
    await expect(page).toHaveURL(/\/payment$/);
  });

  test('logged out visitors are sent to login at payment, then continue the order', async ({ page }) => {
    await startAs(page);
    await clickNav(page, 'Order');
    await fillCart(page, 'SLC', ['Veggie']);

    await expect(page).toHaveURL(/\/payment\/login$/);
    await expectView(page, 'Welcome back');
    await submitLogin(page, users.diner.email, users.diner.password);

    await expect(page).toHaveURL(/\/payment$/);
    await expect(page.getByText('Send me that pizza right now!')).toBeVisible();
  });

  test('delivery page can verify the pizza JWT', async ({ page }) => {
    await startAs(page, 'diner');
    await placeOrder(page, 'SLC', ['Veggie']);

    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.getByRole('heading', { name: /JWT Pizza - valid/ })).toBeVisible();
  });

  test('order more goes back to the menu', async ({ page }) => {
    await startAs(page, 'diner');
    await placeOrder(page, 'SLC', ['Veggie']);
    await page.getByRole('button', { name: 'Order more' }).click();
    await expectView(page, 'Awesome is a click away');
  });
});

test.describe('diner dashboard', () => {
  test('shows the diner profile and encourages a first order', async ({ page }) => {
    await startAs(page, 'diner');
    await openDashboard(page, 'diner');

    await expect(page.getByText('Pizza Diner', { exact: true })).toBeVisible();
    await expect(page.getByText('d@jwt.com', { exact: true })).toBeVisible();
    await expect(page.getByText('diner', { exact: true })).toBeVisible();
    await expect(page.getByText(/How have you lived this long without having a pizza/)).toBeVisible();
  });

  test('lists past orders', async ({ page }) => {
    const past: MockOrder = {
      id: '77',
      franchiseId: '1',
      storeId: '1',
      date: '2026-10-01T12:00:00.000Z',
      items: [{ id: '1', menuId: '1', description: 'Veggie', price: 0.0038 }],
    };
    await startAs(page, 'diner', { orders: [past] });
    await openDashboard(page, 'diner');

    await expect(page.getByText('Here is your history of all the good times.')).toBeVisible();
    await expect(page.getByRole('cell', { name: '77', exact: true })).toBeVisible();
  });

  test('a new order shows up in the order history', async ({ page }) => {
    await startAs(page, 'diner');
    await placeOrder(page, 'SLC', ['Pepperoni']);
    await openDashboard(page, 'diner');

    await expect(page.getByText('Here is your history of all the good times.')).toBeVisible();
  });
});

test.describe('diner and franchises', () => {
  test('diner sees the franchise sales page instead of a dashboard', async ({ page }) => {
    await startAs(page, 'diner');
    await clickNav(page, 'Franchise');

    await expectView(page, 'So you want a piece of the pie?');
    await expect(page.getByRole('button', { name: 'Create store' })).toHaveCount(0);
  });
});
