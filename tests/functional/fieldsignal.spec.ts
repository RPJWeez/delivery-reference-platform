import { test, expect } from "@playwright/test";

test("an elevated river observation can be reviewed and acknowledged", async ({
  browser,
}) => {
  const stations = await browser.newPage();
  const operations = await browser.newPage();
  await stations.goto(process.env.STATION_URL ?? "http://127.0.0.1:5173");
  await operations.goto(process.env.OPERATIONS_URL ?? "http://127.0.0.1:5174");
  await expect(stations.getByText(/Connected · refreshed/)).toBeVisible();
  await expect(operations.getByText(/Connected · refreshed/)).toBeVisible();
  // Unique value identifies this observation without coupling to backend storage.
  const level = (4.5 + Math.random() * 0.9).toFixed(3);
  await stations.getByLabel("River level (meters)").fill(level);
  await stations.getByRole("button", { name: "Submit reading" }).click();
  await expect(stations.getByRole("status")).toContainText("Reading accepted");
  const incident = operations
    .getByRole("row")
    .filter({ hasText: `${level} m` })
    .first();
  await expect(incident).toContainText("CRITICAL");
  await incident
    .getByRole("button", { name: "Acknowledge", exact: true })
    .click();
  await expect(incident).toContainText("ACKNOWLEDGED");
  await operations.reload();
  await expect(
    operations
      .getByRole("row")
      .filter({ hasText: `${level} m` })
      .first(),
  ).toContainText("ACKNOWLEDGED");
  await stations.close();
  await operations.close();
});
