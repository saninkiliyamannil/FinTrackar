import { expect, test, type Page } from "@playwright/test";
import { setupCommonAuth } from "./helpers/mock-api";

async function setupNavigationMocks(page: Page) {
  await page.route("**/api/transactions**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { page: 1, pageSize: 10, total: 1, items: [] },
        error: null,
        code: "OK",
      }),
    });
  });
  await page.route("**/api/analytics/monthly**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { months: 6, from: "2025-09", series: [], summary: { totalIncome: 0, totalExpense: 0, net: 0 } },
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
          from: "2025-01-01T00:00:00.000Z",
          to: "2026-01-01T00:00:00.000Z",
          points: [],
          summary: { totalIncome: 0, totalExpense: 0, totalSavings: 0, averageIncome: 0, averageExpense: 0 },
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
        data: { months: 6, type: "EXPENSE", total: 0, items: [] },
        error: null,
        code: "OK",
      }),
    });
  });
  await page.route("**/api/accounts**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [{ id: "a1", name: "Main", type: "BANK" }], error: null, code: "OK" }),
    });
  });
  await page.route("**/api/categories**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [{ id: "c1", name: "Food", type: "EXPENSE" }], error: null, code: "OK" }),
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
        data: { items: [], summary: { totalTarget: 0, totalCurrent: 0, completed: 0, total: 0 } },
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
      body: JSON.stringify({ data: { suggestions: [], settlements: [] }, error: null, code: "OK" }),
    });
  });
}

test("budgets page supports create and list", async ({ page }) => {
  await setupCommonAuth(page);

  await page.route("**/api/categories", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{ id: "c1", name: "Food", type: "EXPENSE" }],
        error: null,
        code: "OK",
      }),
    });
  });

  let budgets = [
    {
      id: "b1",
      amount: 500,
      spent: 120,
      remaining: 380,
      usageRatio: 0.24,
      categoryId: "c1",
      category: { id: "c1", name: "Food", color: "#16a34a", type: "EXPENSE" },
    },
  ];

  await page.route("**/api/budgets**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      budgets = [
        {
          id: "b2",
          amount: 250,
          spent: 0,
          remaining: 250,
          usageRatio: 0,
          categoryId: "c1",
          category: { id: "c1", name: "Food", color: "#16a34a", type: "EXPENSE" },
        },
        ...budgets,
      ];
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: budgets[0], error: null, code: "OK" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          month: 2,
          year: 2026,
          items: budgets,
          summary: { totalBudget: 750, totalSpent: 120, totalRemaining: 630 },
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/budgets/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { ok: true }, error: null, code: "OK" }),
    });
  });

  await page.goto("/budgets");
  await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible();
  await expect(page.locator("p", { hasText: "Food" }).first()).toBeVisible();

  await page.getByPlaceholder("Budget amount").fill("250");
  await page.getByRole("button", { name: "Add Budget" }).click();
  await expect(page.getByText("Planned $250.00")).toBeVisible();
});

test("goals page supports create", async ({ page }) => {
  await setupCommonAuth(page);

  let items = [
    {
      id: "g1",
      name: "Emergency Fund",
      targetAmount: 1000,
      currentAmount: 200,
      targetDate: null,
      note: null,
      status: "ACTIVE",
      progressRatio: 0.2,
    },
  ];

  await page.route("**/api/goals", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      items = [
        {
          id: "g2",
          name: "Vacation",
          targetAmount: 2000,
          currentAmount: 0,
          targetDate: null,
          note: null,
          status: "ACTIVE",
          progressRatio: 0,
        },
        ...items,
      ];
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: items[0], error: null, code: "OK" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items,
          summary: { totalTarget: 3000, totalCurrent: 200, completed: 0, total: items.length },
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/goals/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { ok: true }, error: null, code: "OK" }),
    });
  });

  await page.goto("/goals");
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  await expect(page.getByText("Emergency Fund")).toBeVisible();
  await page.getByPlaceholder("Goal name").fill("Vacation");
  await page.getByPlaceholder("Target amount").fill("2000");
  await page.getByRole("button", { name: "Add Goal" }).click();
  await expect(page.getByText("Vacation")).toBeVisible();
});

test("shared expenses page supports group and expense creation", async ({ page }) => {
  await setupCommonAuth(page);

  let groups = [
    {
      id: "g1",
      name: "Roommates",
      description: null,
      inviteCode: "ROOM42",
      isPersonal: false,
      members: [{ id: "m1", userId: "user-1", displayName: "You", role: "OWNER" }],
      _count: { expenses: 0, settlements: 0 },
    },
  ];

  let expenses: any[] = [];

  await page.route("**/api/shared-groups", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as any;
      const created = {
        id: "g2",
        name: body.name,
        description: null,
        inviteCode: "JOIN22",
        isPersonal: false,
        members: [{ id: "m2", userId: "user-1", displayName: "Owner", role: "OWNER" }],
      };
      groups = [created, ...groups];
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
      body: JSON.stringify({ data: groups, error: null, code: "OK" }),
    });
  });

  await page.route("**/api/shared-groups/join", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: { groupId: "g1" }, error: null, code: "OK" }),
    });
  });

  await page.route("**/api/shared-groups/*/settlements/settle-all", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { created: 0, settlements: [] }, error: null, code: "OK" }),
    });
  });

  await page.route("**/api/shared-groups/*/settlements", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "s1" }, error: null, code: "OK" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { suggestions: [], settlements: [] }, error: null, code: "OK" }),
    });
  });

  await page.route("**/api/shared-expenses**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as any;
      const created = {
        id: "e1",
        title: body.title,
        note: body.note ?? null,
        totalAmount: body.totalAmount,
        date: new Date().toISOString(),
        splitMethod: body.splitMethod,
        groupId: body.groupId,
        group: { id: body.groupId, name: "Roommates", inviteCode: "ROOM42" },
        participants: body.participants.map((p: any, idx: number) => ({
          id: `p${idx + 1}`,
          participantName: p.participantName,
          shareAmount: 50,
          paidAmount: 0,
          isSettled: false,
        })),
      };
      expenses = [created, ...expenses];
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
          pageSize: 20,
          total: expenses.length,
          items: expenses,
          summary: { totalAmount: 100, totalParticipants: 2, settledParticipants: 0 },
        },
        error: null,
        code: "OK",
      }),
    });
  });

  await page.route("**/api/shared-expenses/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { ok: true }, error: null, code: "OK" }),
    });
  });

  await page.route("**/api/shared-settlements/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { id: "s1" }, error: null, code: "OK" }),
    });
  });

  await page.route("**/api/shared-groups/*/members/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { ok: true }, error: null, code: "OK" }),
    });
  });

  await page.goto("/shared-expenses");
  await expect(page.getByRole("heading", { name: "Shared Expenses" })).toBeVisible();
  await page.getByPlaceholder("Title").fill("Groceries");
  await page.getByPlaceholder("Total amount").fill("100");
  await page.getByPlaceholder("Participants (comma separated)").fill("Alice, Bob");
  await page.getByRole("button", { name: "Add Expense" }).click();
  await expect(page.getByText("Groceries - $100.00")).toBeVisible();
});

test("app nav switches across feature pages", async ({ page }) => {
  await setupCommonAuth(page);
  await setupNavigationMocks(page);

  await page.goto("/transactions");
  await expect(page.getByRole("heading", { name: "Transactions Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "Budgets" }).click();
  await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible();

  await page.getByRole("link", { name: "Goals" }).click();
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();

  await page.getByRole("link", { name: "Shared Expenses" }).click();
  await expect(page.getByRole("heading", { name: "Shared Expenses" })).toBeVisible();

  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByRole("heading", { name: "Transactions Dashboard" })).toBeVisible();
});
