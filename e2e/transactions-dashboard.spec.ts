import { expect, test, type Page } from "@playwright/test";
import { setupCommonAuth } from "./helpers/mock-api";

type MockState = {
  accounts: Array<{ id: string; name: string; type: string }>;
  categories: Array<{ id: string; name: string; type: string; color: string }>;
  transactions: Array<{
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    note: string | null;
    date: string;
    bankAccountId: string;
    categoryId: string | null;
    bankAccount: { id: string; name: string };
    category: { id: string; name: string } | null;
  }>;
};

async function setupMockApi(page: Page) {
  const state: MockState = {
    accounts: [{ id: "acc-1", name: "Main", type: "BANK" }],
    categories: [{ id: "cat-1", name: "Food", type: "EXPENSE", color: "#0f766e" }],
    transactions: [
      {
        id: "tx-1",
        amount: 42.5,
        type: "EXPENSE",
        note: "Coffee",
        date: "2026-02-01T00:00:00.000Z",
        bankAccountId: "acc-1",
        categoryId: "cat-1",
        bankAccount: { id: "acc-1", name: "Main" },
        category: { id: "cat-1", name: "Food" },
      },
    ],
  };

  await setupCommonAuth(page);

  await page.route("**/api/transactions**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as any;
      const created = {
        id: `tx-${state.transactions.length + 1}`,
        amount: body.amount,
        type: body.type,
        note: body.note ?? null,
        date: new Date(body.date || Date.now()).toISOString(),
        bankAccountId: body.bankAccountId,
        categoryId: body.categoryId ?? null,
        bankAccount: { id: body.bankAccountId, name: "Main" },
        category: body.categoryId ? { id: body.categoryId, name: "Food" } : null,
      };
      state.transactions.unshift(created);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: created, error: null, code: "OK" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          page: 1,
          pageSize: 10,
          total: state.transactions.length,
          items: state.transactions,
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/transactions/*", async (route) => {
    const request = route.request();
    const id = request.url().split("/").pop()!;
    const found = state.transactions.find((tx) => tx.id === id);

    if (!found) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          data: null,
          error: { code: "NOT_FOUND", message: "Transaction not found" },
          code: "ERROR",
        }),
      });
      return;
    }

    if (request.method() === "PATCH") {
      const body = request.postDataJSON() as any;
      Object.assign(found, {
        amount: body.amount ?? found.amount,
        type: body.type ?? found.type,
        note: body.note ?? found.note,
        date: body.date ? new Date(body.date).toISOString() : found.date,
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: found, error: null, code: "OK" }),
      });
      return;
    }

    if (request.method() === "DELETE") {
      const idx = state.transactions.findIndex((tx) => tx.id === id);
      if (idx >= 0) state.transactions.splice(idx, 1);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ok: true }, error: null, code: "OK" }),
      });
      return;
    }
  });

  await page.route("**/api/accounts", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as any;
      const created = { id: `acc-${state.accounts.length + 1}`, name: body.name, type: body.type };
      state.accounts.push(created);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: created, error: null, code: "OK" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: state.accounts, error: null, code: "OK" }),
    });
  });

  await page.route("**/api/accounts/*", async (route) => {
    const request = route.request();
    const id = request.url().split("/").pop()!;
    const account = state.accounts.find((a) => a.id === id);
    if (!account) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ data: null, error: { code: "NOT_FOUND", message: "Account not found" }, code: "ERROR" }),
      });
      return;
    }

    if (request.method() === "PATCH") {
      const body = request.postDataJSON() as any;
      Object.assign(account, { ...account, name: body.name ?? account.name, type: body.type ?? account.type });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: account, error: null, code: "OK" }),
      });
      return;
    }

    if (request.method() === "DELETE") {
      const inUse = state.transactions.some((tx) => tx.bankAccountId === id);
      if (inUse) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            data: null,
            error: { code: "ACCOUNT_IN_USE", message: "Cannot delete account that is used by transactions" },
            code: "ERROR",
          }),
        });
        return;
      }
      const idx = state.accounts.findIndex((a) => a.id === id);
      if (idx >= 0) state.accounts.splice(idx, 1);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ok: true }, error: null, code: "OK" }),
      });
      return;
    }
  });

  await page.route("**/api/categories", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as any;
      const created = {
        id: `cat-${state.categories.length + 1}`,
        name: body.name,
        type: body.type,
        color: body.color ?? "#0f766e",
      };
      state.categories.push(created);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: created, error: null, code: "OK" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: state.categories, error: null, code: "OK" }),
    });
  });

  await page.route("**/api/categories/*", async (route) => {
    const request = route.request();
    const id = request.url().split("/").pop()!;
    const category = state.categories.find((c) => c.id === id);
    if (!category) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ data: null, error: { code: "NOT_FOUND", message: "Category not found" }, code: "ERROR" }),
      });
      return;
    }

    if (request.method() === "PATCH") {
      const body = request.postDataJSON() as any;
      Object.assign(category, { ...category, name: body.name ?? category.name, type: body.type ?? category.type });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: category, error: null, code: "OK" }),
      });
      return;
    }

    if (request.method() === "DELETE") {
      const inUse = state.transactions.some((tx) => tx.categoryId === id);
      if (inUse) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            data: null,
            error: { code: "CATEGORY_IN_USE", message: "Cannot delete category that is used by transactions" },
            code: "ERROR",
          }),
        });
        return;
      }
      const idx = state.categories.findIndex((c) => c.id === id);
      if (idx >= 0) state.categories.splice(idx, 1);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ok: true }, error: null, code: "OK" }),
      });
      return;
    }
  });

  await page.route("**/api/analytics/monthly**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          months: 6,
          from: "2025-09",
          series: [
            { month: "2025-09", income: 1000, expense: 600, net: 400 },
            { month: "2025-10", income: 1200, expense: 700, net: 500 },
            { month: "2025-11", income: 1300, expense: 800, net: 500 },
            { month: "2025-12", income: 1400, expense: 900, net: 500 },
            { month: "2026-01", income: 1500, expense: 1000, net: 500 },
            { month: "2026-02", income: 1600, expense: 1100, net: 500 },
          ],
          summary: {
            totalIncome: 8000,
            totalExpense: 5100,
            net: 2900,
          },
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/analytics/category-breakdown**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          months: 6,
          type: "EXPENSE",
          total: 1500,
          items: [
            { categoryId: "c-1", categoryName: "Food", amount: 900, share: 0.6 },
            { categoryId: "c-2", categoryName: "Transport", amount: 600, share: 0.4 },
          ],
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/analytics/trends**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          period: "monthly",
          range: 12,
          from: "2025-03-01T00:00:00.000Z",
          to: "2026-03-01T00:00:00.000Z",
          points: [
            { key: "2025-12", label: "Dec 25", start: "2025-12-01T00:00:00.000Z", income: 1400, expense: 900, savings: 500 },
            { key: "2026-01", label: "Jan 26", start: "2026-01-01T00:00:00.000Z", income: 1500, expense: 1000, savings: 500 },
            { key: "2026-02", label: "Feb 26", start: "2026-02-01T00:00:00.000Z", income: 1600, expense: 1100, savings: 500 },
          ],
          summary: {
            totalIncome: 4500,
            totalExpense: 3000,
            totalSavings: 1500,
            averageIncome: 1500,
            averageExpense: 1000,
          },
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/budgets**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          month: 2,
          year: 2026,
          items: [],
          summary: { totalBudget: 0, totalSpent: 0, totalRemaining: 0 },
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/goals", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [],
          summary: { totalTarget: 0, totalCurrent: 0, completed: 0, total: 0 },
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/shared-groups", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "g1",
            name: "Roommates",
            description: null,
            inviteCode: "ROOM42",
            isPersonal: false,
            members: [{ id: "m1", userId: "user-1", displayName: "You", role: "OWNER" }],
            _count: { expenses: 0, settlements: 0 },
          },
        ],
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/shared-expenses**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          page: 1,
          pageSize: 20,
          total: 0,
          items: [],
          summary: { totalAmount: 0, totalParticipants: 0, settledParticipants: 0 },
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/shared-groups/*/settlements", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { suggestions: [], settlements: [] },
        error: null,
        code: "OK",
      }),
    });
  });

  return state;
}

test("transactions dashboard loads and supports create flows", async ({ page }) => {
  await setupMockApi(page);

  await page.goto("/transactions");
  await expect(page.getByRole("heading", { name: "Transactions Dashboard" })).toBeVisible();
  await expect(page.getByText("Coffee")).toBeVisible();
  await expect(page.getByText("Category Breakdown")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Income vs Expense/i })).toBeVisible();

  await page.getByLabel("Months").selectOption("12");
  await page.locator('select[aria-label="Type"]').first().selectOption("INCOME");

  await page.getByPlaceholder("Account name").fill("Savings");
  await page.getByRole("button", { name: "Add" }).first().click();
  await expect(
    page.locator("section", { has: page.getByRole("heading", { name: "Manage Accounts" }) }).getByText("Savings")
  ).toBeVisible();

  await page.getByPlaceholder("Category name").fill("Utilities");
  await page.getByRole("button", { name: "Add" }).nth(1).click();
  await expect(
    page.locator("section", { has: page.getByRole("heading", { name: "Manage Categories" }) }).getByText("Utilities")
  ).toBeVisible();

  await page.getByLabel("Amount").first().fill("70");
  await page.getByRole("button", { name: "Add Transaction" }).click();
  await expect(page.getByText("$70.00")).toBeVisible();
});

test("transactions dashboard supports edit and delete transaction", async ({ page }) => {
  await setupMockApi(page);

  await page.goto("/transactions");
  const row = page.locator("li", { hasText: "Coffee" }).first();

  await row.getByRole("button", { name: "Edit" }).click();
  await page.locator('li label:has-text("Amount") input').first().fill("99");
  await page.getByRole("button", { name: "Save" }).first().click();

  await expect(page.locator("li", { hasText: "EXPENSE $99.00" }).first()).toBeVisible();

  const updatedRow = page.locator("li", { hasText: "EXPENSE $99.00" }).first();
  await updatedRow.getByRole("button", { name: "Delete" }).click();

  await expect(page.locator("li", { hasText: "EXPENSE $99.00" })).toHaveCount(0);
});

test("transactions dashboard shows empty state for filtered page with no items", async ({ page }) => {
  await setupMockApi(page);

  await page.route("**/api/transactions**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { page: 2, pageSize: 10, total: 11, items: [] },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.goto("/transactions");
  await expect(page.getByText("No transactions yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
});

test("transactions dashboard preserves type filter while paginating", async ({ page }) => {
  await setupMockApi(page);
  const txRequests: string[] = [];

  await page.route("**/api/transactions**", async (route) => {
    const url = route.request().url();
    txRequests.push(url);
    const parsed = new URL(url);
    const pageParam = Number(parsed.searchParams.get("page") || "1");
    const items =
      pageParam === 1
        ? Array.from({ length: 10 }).map((_, idx) => ({
            id: `tx-page1-${idx + 1}`,
            amount: 20 + idx,
            type: "EXPENSE",
            note: null,
            date: "2026-02-01T00:00:00.000Z",
            bankAccountId: "acc-1",
            categoryId: "cat-1",
            bankAccount: { id: "acc-1", name: "Main" },
            category: { id: "cat-1", name: "Food" },
          }))
        : [
            {
              id: "tx-page2-1",
              amount: 99,
              type: "EXPENSE",
              note: "Page 2",
              date: "2026-02-02T00:00:00.000Z",
              bankAccountId: "acc-1",
              categoryId: "cat-1",
              bankAccount: { id: "acc-1", name: "Main" },
              category: { id: "cat-1", name: "Food" },
            },
          ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          page: pageParam,
          pageSize: 10,
          total: 11,
          items,
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.goto("/transactions");
  await page.locator('select[aria-label="Type"]').first().selectOption("EXPENSE");
  await page.getByRole("button", { name: "Next" }).click();

  expect(
    txRequests.some((url) => {
      const parsed = new URL(url);
      return (
        parsed.searchParams.get("page") === "2" &&
        parsed.searchParams.get("pageSize") === "10" &&
        parsed.searchParams.get("type") === "EXPENSE"
      );
    })
  ).toBe(true);
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
});
