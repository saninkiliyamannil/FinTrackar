import type { Page, Route } from "@playwright/test";

export function okEnvelope<T>(data: T) {
  return JSON.stringify({
    data,
    error: null,
    code: "OK",
  });
}

export async function fulfillOk<T>(route: Route, data: T, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: okEnvelope(data),
  });
}

export async function setupCommonAuth(page: Page, email = "user@example.com") {
  await page.route("**/api/auth/session", async (route) => {
    await fulfillOk(route, { user: { id: "user-1", email } });
  });
}

