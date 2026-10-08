import { expect, type Page } from '@playwright/test';
import { clickNav, expectView } from './navigation';

export async function openMenu(page: Page) {
  await clickNav(page, 'Order');
  await expectView(page, 'Awesome is a click away');
}

export async function chooseStore(page: Page, storeName: string) {
  await page.getByRole('combobox').selectOption({ label: storeName });
}

// Each pizza on the menu is a button that contains a heading with its name.
export async function addPizza(page: Page, title: string) {
  await page.locator('button', { has: page.getByRole('heading', { name: title }) }).click();
}

export async function checkout(page: Page) {
  await page.getByRole('button', { name: 'Checkout' }).click();
}

// Picks a store and pizzas on the menu page and clicks Checkout.
export async function fillCart(page: Page, storeName: string, pizzas: string[]) {
  await chooseStore(page, storeName);
  for (const pizza of pizzas) {
    await addPizza(page, pizza);
  }
  await checkout(page);
}

export async function payNow(page: Page) {
  await page.getByRole('button', { name: 'Pay now' }).click();
}

// The whole happy path for a logged in user: menu, payment, delivery.
export async function placeOrder(page: Page, storeName: string, pizzas: string[]) {
  await openMenu(page);
  await fillCart(page, storeName, pizzas);
  await expectView(page, 'So worth it');
  await payNow(page);
  await expectView(page, 'Here is your JWT Pizza!');
  await expect(page).toHaveURL(/\/delivery$/);
}
