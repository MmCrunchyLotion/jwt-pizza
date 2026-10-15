import { test, expect } from "./testSetup";
import { expectView, startAs } from "./index";

test.describe("api docs", () => {
  for (const docType of ["service", "factory"]) {
    test(`${docType} docs list their endpoints`, async ({ page }) => {
      await startAs(page);
      await page.goto(`/docs/${docType}`);

      await expectView(page, "JWT Pizza API");
      await expect(page.getByText("[GET] /api/user/me")).toBeVisible();
      await expect(page.getByText("Get the authenticated user")).toBeVisible();
      await expect(page.getByText("Example request")).toBeVisible();
    });
  }
});
