import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/client";

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  note: string | null;
  date: string;
  bankAccountId?: string | null;
  categoryId?: string | null;
  bankAccount?: { id?: string; name: string } | null;
  category?: { id?: string; name: string } | null;
};

type MonthlyPoint = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

type MonthlyAnalyticsResponse = {
  months: number;
  from: string;
  series: MonthlyPoint[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    net: number;
  };
};

type CategoryBreakdownItem = {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  share: number;
};

type CategoryBreakdownResponse = {
  months: number;
  type: "INCOME" | "EXPENSE";
  total: number;
  items: CategoryBreakdownItem[];
};

type TransactionsResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: Transaction[];
};

type Account = {
  id: string;
  name: string;
  type?: "CASH" | "BANK" | "CREDIT" | "WALLET";
  balance?: number;
};

type Category = {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
};

type TransactionForm = {
  amount: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  note: string;
  bankAccountId: string;
  categoryId: string;
};

type FormErrors = Partial<Record<keyof TransactionForm, string>>;

type AccountForm = {
  name: string;
  type: "CASH" | "BANK" | "CREDIT" | "WALLET";
  balance: string;
};

type CategoryForm = {
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
  icon: string;
};

type BudgetItem = {
  id: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  category: {
    id: string;
    name: string;
    color: string | null;
    type: "INCOME" | "EXPENSE";
  };
  spent: number;
  remaining: number;
  usageRatio: number;
};

type BudgetsResponse = {
  month: number;
  year: number;
  items: BudgetItem[];
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
  };
};

type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

type GoalItem = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  note: string | null;
  status: GoalStatus;
  progressRatio: number;
};

type GoalsResponse = {
  items: GoalItem[];
  summary: {
    totalTarget: number;
    totalCurrent: number;
    completed: number;
    total: number;
  };
};

type BudgetForm = {
  amount: string;
  categoryId: string;
};

type GoalForm = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  note: string;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function monthLabel(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function validateForm(form: TransactionForm): FormErrors {
  const errors: FormErrors = {};
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Amount must be greater than 0";
  }
  if (!form.bankAccountId) {
    errors.bankAccountId = "Select an account";
  }
  if (!form.date || Number.isNaN(new Date(form.date).getTime())) {
    errors.date = "Enter a valid date";
  }
  return errors;
}

function BarChart({ series }: { series: MonthlyPoint[] }) {
  const width = 640;
  const height = 220;
  const max = Math.max(1, ...series.map((x) => Math.max(x.income, x.expense)));
  const barSlot = width / Math.max(1, series.length);
  const barWidth = Math.max(6, (barSlot - 18) / 2);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly income and expense bars">
      <line x1={0} y1={height - 24} x2={width} y2={height - 24} stroke="#cbd5e1" strokeWidth={1} />
      {series.map((item, idx) => {
        const xBase = idx * barSlot + 8;
        const incomeHeight = (item.income / max) * 150;
        const expenseHeight = (item.expense / max) * 150;
        return (
          <g key={item.month}>
            <rect x={xBase} y={height - 24 - incomeHeight} width={barWidth} height={incomeHeight} fill="#16a34a" rx={2} />
            <rect
              x={xBase + barWidth + 3}
              y={height - 24 - expenseHeight}
              width={barWidth}
              height={expenseHeight}
              fill="#dc2626"
              rx={2}
            />
            <text x={xBase} y={height - 8} fill="#334155" fontSize={10}>
              {monthLabel(item.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function NetLineChart({ series }: { series: MonthlyPoint[] }) {
  const width = 640;
  const height = 180;
  const values = series.map((x) => x.net);
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const yScale = (value: number) => height / 2 - (value / maxAbs) * 58;
  const xStep = width / Math.max(1, series.length - 1);
  const points = series.map((item, idx) => `${idx * xStep},${yScale(item.net)}`).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly net trend">
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#94a3b8" strokeDasharray="4 3" />
      {series.length > 1 && <polyline points={points} fill="none" stroke="#2563eb" strokeWidth={2} />}
      {series.map((item, idx) => (
        <circle key={item.month} cx={idx * xStep} cy={yScale(item.net)} r={3} fill="#1d4ed8" />
      ))}
    </svg>
  );
}

function CategoryBreakdownChart({ items }: { items: CategoryBreakdownItem[] }) {
  const max = Math.max(1, ...items.map((x) => x.amount));
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.length === 0 && <p style={{ margin: 0 }}>No category data.</p>}
      {items.map((item) => (
        <div key={`${item.categoryId ?? "none"}-${item.categoryName}`}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>{item.categoryName}</span>
            <span>
              {currency(item.amount)} ({Math.round(item.share * 100)}%)
            </span>
          </div>
          <div style={{ background: "#e2e8f0", height: 8, borderRadius: 4 }}>
            <div
              style={{
                width: `${(item.amount / max) * 100}%`,
                background: "#0f766e",
                height: "100%",
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TransactionsPage() {
  const { status, login, user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [analytics, setAnalytics] = useState<MonthlyAnalyticsResponse | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);

  const [months, setMonths] = useState(6);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [breakdownType, setBreakdownType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [createForm, setCreateForm] = useState<TransactionForm>({
    amount: "",
    type: "EXPENSE",
    date: todayIsoDate(),
    note: "",
    bankAccountId: "",
    categoryId: "",
  });
  const [createErrors, setCreateErrors] = useState<FormErrors>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TransactionForm>({
    amount: "",
    type: "EXPENSE",
    date: todayIsoDate(),
    note: "",
    bankAccountId: "",
    categoryId: "",
  });
  const [editErrors, setEditErrors] = useState<FormErrors>({});

  const [accountForm, setAccountForm] = useState<AccountForm>({
    name: "",
    type: "BANK",
    balance: "0",
  });
  const [accountFormError, setAccountFormError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState("");
  const [editingAccountType, setEditingAccountType] =
    useState<"CASH" | "BANK" | "CREDIT" | "WALLET">("BANK");

  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    name: "",
    type: "EXPENSE",
    color: "#0f766e",
    icon: "",
  });
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryType, setEditingCategoryType] =
    useState<"INCOME" | "EXPENSE">("EXPENSE");

  const [budgets, setBudgets] = useState<BudgetsResponse | null>(null);
  const [goals, setGoals] = useState<GoalsResponse | null>(null);
  const [budgetForm, setBudgetForm] = useState<BudgetForm>({
    amount: "",
    categoryId: "",
  });
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState<GoalForm>({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
    note: "",
  });
  const [goalFormError, setGoalFormError] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.type.toUpperCase() === createForm.type),
    [categories, createForm.type]
  );

  const filteredEditCategories = useMemo(
    () => categories.filter((cat) => cat.type.toUpperCase() === editForm.type),
    [categories, editForm.type]
  );

  const expenseCategories = useMemo(
    () => categories.filter((cat) => cat.type.toUpperCase() === "EXPENSE"),
    [categories]
  );

  const loadDashboardData = useCallback(async () => {
    if (status !== "authenticated") return;

    setLoading(true);
    setError(null);

    const txQuery = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
    });

    try {
      const now = new Date();
      const budgetQuery = new URLSearchParams({
        month: String(now.getUTCMonth() + 1),
        year: String(now.getUTCFullYear()),
      });

      const [txRes, analyticsRes, breakdownRes, accountsRes, categoriesRes, budgetsRes, goalsRes] = await Promise.all([
        fetch(`/api/transactions?${txQuery.toString()}`).then((res) =>
          res.json() as Promise<Envelope<TransactionsResponse>>
        ),
        fetch(`/api/analytics/monthly?months=${months}`).then((res) =>
          res.json() as Promise<Envelope<MonthlyAnalyticsResponse>>
        ),
        fetch(`/api/analytics/category-breakdown?months=${months}&type=${breakdownType}`).then((res) =>
          res.json() as Promise<Envelope<CategoryBreakdownResponse>>
        ),
        fetch("/api/accounts").then((res) => res.json() as Promise<Envelope<Account[]>>),
        fetch("/api/categories").then((res) => res.json() as Promise<Envelope<Category[]>>),
        fetch(`/api/budgets?${budgetQuery.toString()}`).then((res) =>
          res.json() as Promise<Envelope<BudgetsResponse>>
        ),
        fetch("/api/goals").then((res) => res.json() as Promise<Envelope<GoalsResponse>>),
      ]);

      if (txRes.code !== "OK" || !txRes.data) throw new Error(txRes.error?.message || "Failed to load transactions");
      if (analyticsRes.code !== "OK" || !analyticsRes.data) {
        throw new Error(analyticsRes.error?.message || "Failed to load analytics");
      }
      if (breakdownRes.code !== "OK" || !breakdownRes.data) {
        throw new Error(breakdownRes.error?.message || "Failed to load category breakdown");
      }
      if (accountsRes.code !== "OK" || !accountsRes.data) throw new Error(accountsRes.error?.message || "Failed accounts");
      if (categoriesRes.code !== "OK" || !categoriesRes.data) {
        throw new Error(categoriesRes.error?.message || "Failed categories");
      }
      if (budgetsRes.code !== "OK" || !budgetsRes.data) {
        throw new Error(budgetsRes.error?.message || "Failed budgets");
      }
      if (goalsRes.code !== "OK" || !goalsRes.data) {
        throw new Error(goalsRes.error?.message || "Failed goals");
      }

      const txData = txRes.data;
      const analyticsData = analyticsRes.data;
      const breakdownData = breakdownRes.data;
      const accountsData = accountsRes.data;
      const categoriesData = categoriesRes.data;
      const budgetsData = budgetsRes.data;
      const goalsData = goalsRes.data;

      setTransactions(txData.items);
      setAnalytics(analyticsData);
      setBreakdown(breakdownData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setBudgets(budgetsData);
      setGoals(goalsData);
      if (!createForm.bankAccountId && accountsData.length > 0) {
        setCreateForm((prev) => ({ ...prev, bankAccountId: accountsData[0].id }));
      }
      if (!budgetForm.categoryId) {
        const firstExpenseCategory = categoriesData.find((cat) => cat.type.toUpperCase() === "EXPENSE");
        if (firstExpenseCategory) {
          setBudgetForm((prev) => ({ ...prev, categoryId: firstExpenseCategory.id }));
        }
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [breakdownType, budgetForm.categoryId, createForm.bankAccountId, months, page, status, typeFilter]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const summaryCards = useMemo(() => {
    const summary = analytics?.summary;
    if (!summary) return null;
    return [
      { label: "Income", value: currency(summary.totalIncome), color: "#166534" },
      { label: "Expense", value: currency(summary.totalExpense), color: "#991b1b" },
      { label: "Net", value: currency(summary.net), color: summary.net >= 0 ? "#1d4ed8" : "#b91c1c" },
    ];
  }, [analytics]);

  const budgetPieSlices = useMemo(
    () =>
      (budgets?.items || []).map((item) => ({
        label: item.category.name,
        value: Math.max(0, item.spent),
        color: item.category.color,
      })),
    [budgets]
  );

  const goalsPieSlices = useMemo(() => {
    const items = goals?.items || [];
    return items.map((item) => ({
      label: item.name,
      value: Math.max(0, item.currentAmount),
      color: item.status === "COMPLETED" ? "#16a34a" : item.status === "ARCHIVED" ? "#64748b" : "#0284c7",
    }));
  }, [goals]);

  async function createTransaction() {
    const errors = validateForm(createForm);
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const optimisticId = `temp-${Date.now()}`;
    const selectedAccount = accounts.find((a) => a.id === createForm.bankAccountId);
    const selectedCategory = categories.find((c) => c.id === createForm.categoryId);
    const optimisticTx: Transaction = {
      id: optimisticId,
      amount: Number(createForm.amount),
      type: createForm.type,
      date: new Date(createForm.date).toISOString(),
      note: createForm.note || null,
      bankAccountId: createForm.bankAccountId,
      categoryId: createForm.categoryId || null,
      bankAccount: selectedAccount ? { name: selectedAccount.name } : null,
      category: selectedCategory ? { name: selectedCategory.name } : null,
    };

    setMutationBusy(true);
    setTransactions((prev) => [optimisticTx, ...prev]);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(createForm.amount),
          type: createForm.type,
          date: createForm.date,
          note: createForm.note || undefined,
          bankAccountId: createForm.bankAccountId,
          categoryId: createForm.categoryId || undefined,
        }),
      });
      const payload = (await response.json()) as Envelope<Transaction>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Create failed");
      }

      setTransactions((prev) => prev.map((tx) => (tx.id === optimisticId ? payload.data! : tx)));
      setCreateForm((prev) => ({ ...prev, amount: "", note: "" }));
      setCreateErrors({});
      void loadDashboardData();
    } catch (err) {
      setTransactions((prev) => prev.filter((tx) => tx.id !== optimisticId));
      setError((err as Error).message || "Failed to create transaction");
    } finally {
      setMutationBusy(false);
    }
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id);
    setEditErrors({});
    setEditForm({
      amount: String(tx.amount ?? ""),
      type: tx.type,
      date: tx.date.slice(0, 10),
      note: tx.note || "",
      bankAccountId: tx.bankAccountId || tx.bankAccount?.id || "",
      categoryId: tx.categoryId || tx.category?.id || "",
    });
  }

  async function saveEdit(txId: string) {
    const errors = validateForm(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const previous = transactions.find((t) => t.id === txId);
    if (!previous) return;

    const selectedAccount = accounts.find((a) => a.id === editForm.bankAccountId);
    const selectedCategory = categories.find((c) => c.id === editForm.categoryId);

    const optimistic: Transaction = {
      ...previous,
      amount: Number(editForm.amount),
      type: editForm.type,
      date: new Date(editForm.date).toISOString(),
      note: editForm.note || null,
      bankAccountId: editForm.bankAccountId,
      categoryId: editForm.categoryId || null,
      bankAccount: selectedAccount ? { name: selectedAccount.name } : null,
      category: selectedCategory ? { name: selectedCategory.name } : null,
    };

    setMutationBusy(true);
    setTransactions((prev) => prev.map((tx) => (tx.id === txId ? optimistic : tx)));

    try {
      const response = await fetch(`/api/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(editForm.amount),
          type: editForm.type,
          date: editForm.date,
          note: editForm.note || null,
          bankAccountId: editForm.bankAccountId,
          categoryId: editForm.categoryId || null,
        }),
      });
      const payload = (await response.json()) as Envelope<Transaction>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Update failed");
      }

      setTransactions((prev) => prev.map((tx) => (tx.id === txId ? payload.data! : tx)));
      setEditingId(null);
      setEditErrors({});
      void loadDashboardData();
    } catch (err) {
      setTransactions((prev) => prev.map((tx) => (tx.id === txId ? previous : tx)));
      setError((err as Error).message || "Failed to update transaction");
    } finally {
      setMutationBusy(false);
    }
  }

  async function deleteTransaction(tx: Transaction) {
    setMutationBusy(true);
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id));

    try {
      const response = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
      const payload = (await response.json()) as Envelope<{ ok: boolean }>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Delete failed");
      }
      void loadDashboardData();
    } catch (err) {
      setTransactions(snapshot);
      setError((err as Error).message || "Failed to delete transaction");
    } finally {
      setMutationBusy(false);
    }
  }

  async function createAccount() {
    setAccountFormError(null);
    if (!accountForm.name.trim()) {
      setAccountFormError("Account name is required");
      return;
    }

    const optimisticId = `temp-account-${Date.now()}`;
    const optimistic: Account = {
      id: optimisticId,
      name: accountForm.name.trim(),
      type: accountForm.type,
      balance: Number(accountForm.balance || 0),
    };
    setAccounts((prev) => [optimistic, ...prev]);

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountForm.name.trim(),
          type: accountForm.type,
          balance: Number(accountForm.balance || 0),
        }),
      });
      const payload = (await response.json()) as Envelope<Account>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to create account");
      }

      setAccounts((prev) => prev.map((acc) => (acc.id === optimisticId ? payload.data! : acc)));
      if (!createForm.bankAccountId) {
        setCreateForm((prev) => ({ ...prev, bankAccountId: payload.data!.id }));
      }
      setAccountForm({ name: "", type: "BANK", balance: "0" });
    } catch (err) {
      setAccounts((prev) => prev.filter((acc) => acc.id !== optimisticId));
      setAccountFormError((err as Error).message || "Create account failed");
    }
  }

  function startEditAccount(account: Account) {
    setEditingAccountId(account.id);
    setEditingAccountName(account.name);
    setEditingAccountType(account.type || "BANK");
  }

  async function saveAccount(account: Account) {
    if (!editingAccountName.trim()) {
      setAccountFormError("Account name is required");
      return;
    }
    const previous = { ...account };
    const optimistic: Account = {
      ...account,
      name: editingAccountName.trim(),
      type: editingAccountType,
    };
    setAccounts((prev) => prev.map((acc) => (acc.id === account.id ? optimistic : acc)));
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingAccountName.trim(), type: editingAccountType }),
      });
      const payload = (await response.json()) as Envelope<Account>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to update account");
      }
      setAccounts((prev) => prev.map((acc) => (acc.id === account.id ? payload.data! : acc)));
      setEditingAccountId(null);
    } catch (err) {
      setAccounts((prev) => prev.map((acc) => (acc.id === account.id ? previous : acc)));
      setAccountFormError((err as Error).message || "Update account failed");
    }
  }

  async function deleteAccount(account: Account) {
    const snapshot = accounts;
    setAccounts((prev) => prev.filter((acc) => acc.id !== account.id));
    try {
      const response = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      if (response.status === 409) {
        const payload = (await response.json()) as Envelope<null>;
        throw new Error(payload.error?.message || "Account is in use");
      }
      const payload = (await response.json()) as Envelope<{ ok: boolean }>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to delete account");
      }
      if (createForm.bankAccountId === account.id) {
        setCreateForm((prev) => ({ ...prev, bankAccountId: accounts.find((a) => a.id !== account.id)?.id || "" }));
      }
    } catch (err) {
      setAccounts(snapshot);
      setAccountFormError((err as Error).message || "Delete account failed");
    }
  }

  async function createCategory() {
    setCategoryFormError(null);
    if (!categoryForm.name.trim()) {
      setCategoryFormError("Category name is required");
      return;
    }
    const optimisticId = `temp-category-${Date.now()}`;
    const optimistic: Category = {
      id: optimisticId,
      name: categoryForm.name.trim(),
      type: categoryForm.type,
      color: categoryForm.color,
      icon: categoryForm.icon || null,
    };
    setCategories((prev) => [optimistic, ...prev]);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          type: categoryForm.type,
          color: categoryForm.color,
          icon: categoryForm.icon || undefined,
        }),
      });
      const payload = (await response.json()) as Envelope<Category>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to create category");
      }
      setCategories((prev) => prev.map((cat) => (cat.id === optimisticId ? payload.data! : cat)));
      setCategoryForm({ name: "", type: "EXPENSE", color: "#0f766e", icon: "" });
    } catch (err) {
      setCategories((prev) => prev.filter((cat) => cat.id !== optimisticId));
      setCategoryFormError((err as Error).message || "Create category failed");
    }
  }

  function startEditCategory(category: Category) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryType((category.type.toUpperCase() as "INCOME" | "EXPENSE") || "EXPENSE");
  }

  async function saveCategory(category: Category) {
    if (!editingCategoryName.trim()) {
      setCategoryFormError("Category name is required");
      return;
    }
    const previous = { ...category };
    const optimistic: Category = {
      ...category,
      name: editingCategoryName.trim(),
      type: editingCategoryType,
    };
    setCategories((prev) => prev.map((cat) => (cat.id === category.id ? optimistic : cat)));
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCategoryName.trim(), type: editingCategoryType }),
      });
      const payload = (await response.json()) as Envelope<Category>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to update category");
      }
      setCategories((prev) => prev.map((cat) => (cat.id === category.id ? payload.data! : cat)));
      setEditingCategoryId(null);
    } catch (err) {
      setCategories((prev) => prev.map((cat) => (cat.id === category.id ? previous : cat)));
      setCategoryFormError((err as Error).message || "Update category failed");
    }
  }

  async function deleteCategory(category: Category) {
    const snapshot = categories;
    setCategories((prev) => prev.filter((cat) => cat.id !== category.id));
    try {
      const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (response.status === 409) {
        const payload = (await response.json()) as Envelope<null>;
        throw new Error(payload.error?.message || "Category is in use");
      }
      const payload = (await response.json()) as Envelope<{ ok: boolean }>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to delete category");
      }
      if (createForm.categoryId === category.id) {
        setCreateForm((prev) => ({ ...prev, categoryId: "" }));
      }
    } catch (err) {
      setCategories(snapshot);
      setCategoryFormError((err as Error).message || "Delete category failed");
    }
  }

  async function createBudget() {
    setBudgetFormError(null);
    const amount = Number(budgetForm.amount);
    if (!budgetForm.categoryId) {
      setBudgetFormError("Expense category is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setBudgetFormError("Budget amount must be greater than 0");
      return;
    }

    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          categoryId: budgetForm.categoryId,
        }),
      });
      const payload = (await response.json()) as Envelope<BudgetItem>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to create budget");
      }
      setBudgetForm((prev) => ({ ...prev, amount: "" }));
      void loadDashboardData();
    } catch (err) {
      setBudgetFormError((err as Error).message || "Create budget failed");
    }
  }

  async function deleteBudget(id: string) {
    setBudgetFormError(null);
    try {
      const response = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as Envelope<{ ok: boolean }>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to delete budget");
      }
      void loadDashboardData();
    } catch (err) {
      setBudgetFormError((err as Error).message || "Delete budget failed");
    }
  }

  async function createGoal() {
    setGoalFormError(null);
    const targetAmount = Number(goalForm.targetAmount);
    const currentAmount = Number(goalForm.currentAmount || "0");

    if (!goalForm.name.trim()) {
      setGoalFormError("Goal name is required");
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setGoalFormError("Target amount must be greater than 0");
      return;
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      setGoalFormError("Current amount must be 0 or more");
      return;
    }

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: goalForm.name.trim(),
          targetAmount,
          currentAmount,
          targetDate: goalForm.targetDate || undefined,
          note: goalForm.note || undefined,
        }),
      });
      const payload = (await response.json()) as Envelope<GoalItem>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to create goal");
      }
      setGoalForm({
        name: "",
        targetAmount: "",
        currentAmount: "0",
        targetDate: "",
        note: "",
      });
      void loadDashboardData();
    } catch (err) {
      setGoalFormError((err as Error).message || "Create goal failed");
    }
  }

  async function updateGoalProgress(goal: GoalItem, nextCurrentAmount: number) {
    if (!Number.isFinite(nextCurrentAmount) || nextCurrentAmount < 0) return;
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: nextCurrentAmount }),
      });
      const payload = (await response.json()) as Envelope<GoalItem>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to update goal");
      }
      void loadDashboardData();
    } catch (err) {
      setGoalFormError((err as Error).message || "Update goal failed");
    }
  }

  async function deleteGoal(id: string) {
    setGoalFormError(null);
    try {
      const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as Envelope<{ ok: boolean }>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to delete goal");
      }
      void loadDashboardData();
    } catch (err) {
      setGoalFormError((err as Error).message || "Delete goal failed");
    }
  }

  function exportCsv() {
    const query = new URLSearchParams({
      ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
    });
    window.location.href = `/api/transactions/export.csv?${query.toString()}`;
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
  const selectClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";
  const subtleButtonClass =
    "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
  const dangerButtonClass =
    "inline-flex items-center justify-center rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";

  if (status === "loading") {
    return <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">Loading session...</p>;
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">You must be signed in to view transactions.</p>
          <button onClick={login} className={`${primaryButtonClass} mt-5`}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Transactions Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Track accounts, categories, and transactions in one place.</p>
          </div>
          <button onClick={exportCsv} className={subtleButtonClass}>
            Export CSV
          </button>
        </div>

        <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Months
            <select aria-label="Months" value={months} onChange={(e) => setMonths(Number(e.target.value))} className={`${selectClass} mt-1`}>
            <option value={3}>3</option>
            <option value={6}>6</option>
            <option value={12}>12</option>
          </select>
        </label>

          <label className="text-sm font-medium text-slate-700">
            Transaction Type
          <select
            aria-label="Type"
            value={typeFilter}
            onChange={(e) => {
              setPage(1);
              setTypeFilter(e.target.value as "ALL" | "INCOME" | "EXPENSE");
            }}
            className={`${selectClass} mt-1`}
          >
            <option value="ALL">All</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </label>

          <label className="text-sm font-medium text-slate-700">
            Breakdown
          <select
            aria-label="Breakdown"
            value={breakdownType}
            onChange={(e) => setBreakdownType(e.target.value as "INCOME" | "EXPENSE")}
            className={`${selectClass} mt-1`}
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </label>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Manage Accounts</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              className={inputClass}
              placeholder="Account name"
              value={accountForm.name}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              className={selectClass}
              value={accountForm.type}
              onChange={(e) =>
                setAccountForm((prev) => ({
                  ...prev,
                  type: e.target.value as "CASH" | "BANK" | "CREDIT" | "WALLET",
                }))
              }
            >
              <option value="CASH">CASH</option>
              <option value="BANK">BANK</option>
              <option value="CREDIT">CREDIT</option>
              <option value="WALLET">WALLET</option>
            </select>
              <button onClick={createAccount} className={primaryButtonClass}>
                Add
              </button>
          </div>
            {accountFormError && <p className="mt-2 text-sm text-rose-700">{accountFormError}</p>}
            <ul className="mt-3 space-y-2">
            {accounts.map((acc) => (
                <li key={acc.id} className="rounded-md border border-slate-200 p-2">
                {editingAccountId === acc.id ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input className={inputClass} value={editingAccountName} onChange={(e) => setEditingAccountName(e.target.value)} />
                    <select
                        className={selectClass}
                      value={editingAccountType}
                      onChange={(e) =>
                        setEditingAccountType(e.target.value as "CASH" | "BANK" | "CREDIT" | "WALLET")
                      }
                    >
                      <option value="CASH">CASH</option>
                      <option value="BANK">BANK</option>
                      <option value="CREDIT">CREDIT</option>
                      <option value="WALLET">WALLET</option>
                    </select>
                      <div className="flex gap-2">
                        <button onClick={() => saveAccount(acc)} className={primaryButtonClass}>Save</button>
                        <button onClick={() => setEditingAccountId(null)} className={subtleButtonClass}>Cancel</button>
                      </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-slate-800">
                        <strong>{acc.name}</strong> <span className="ml-1 text-slate-500">{acc.type || "BANK"}</span>
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => startEditAccount(acc)} className={subtleButtonClass}>Edit</button>
                        <button onClick={() => deleteAccount(acc)} className={dangerButtonClass}>Delete</button>
                      </div>
                    </div>
                )}
              </li>
            ))}
          </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Manage Categories</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <input
              className={inputClass}
              placeholder="Category name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              className={selectClass}
              value={categoryForm.type}
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE" }))
              }
            >
              <option value="EXPENSE">EXPENSE</option>
              <option value="INCOME">INCOME</option>
            </select>
            <input
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-2"
              type="color"
              value={categoryForm.color}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, color: e.target.value }))}
              title="Category color"
            />
              <button onClick={createCategory} className={primaryButtonClass}>Add</button>
          </div>
            {categoryFormError && <p className="mt-2 text-sm text-rose-700">{categoryFormError}</p>}
            <ul className="mt-3 space-y-2">
            {categories.map((cat) => (
                <li key={cat.id} className="rounded-md border border-slate-200 p-2">
                {editingCategoryId === cat.id ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input className={inputClass} value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} />
                    <select
                        className={selectClass}
                      value={editingCategoryType}
                      onChange={(e) => setEditingCategoryType(e.target.value as "INCOME" | "EXPENSE")}
                    >
                      <option value="EXPENSE">EXPENSE</option>
                      <option value="INCOME">INCOME</option>
                    </select>
                      <div className="flex gap-2">
                        <button onClick={() => saveCategory(cat)} className={primaryButtonClass}>Save</button>
                        <button onClick={() => setEditingCategoryId(null)} className={subtleButtonClass}>Cancel</button>
                      </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-slate-800">
                        <strong>{cat.name}</strong> <span className="ml-1 text-slate-500">{cat.type}</span>
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => startEditCategory(cat)} className={subtleButtonClass}>Edit</button>
                        <button onClick={() => deleteCategory(cat)} className={dangerButtonClass}>Delete</button>
                      </div>
                    </div>
                )}
              </li>
            ))}
          </ul>
          </section>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Budgets (Current Month)</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <select
                className={selectClass}
                value={budgetForm.categoryId}
                onChange={(e) => setBudgetForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              >
                <option value="">Select Expense Category</option>
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                value={budgetForm.amount}
                onChange={(e) => setBudgetForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Budget amount"
              />
              <button onClick={createBudget} className={primaryButtonClass}>
                Add Budget
              </button>
            </div>
            {budgetFormError && <p className="mt-2 text-sm text-rose-700">{budgetFormError}</p>}

            <div className="mt-4 rounded-md border border-slate-200 p-3">
              <PieChart slices={budgetPieSlices} />
            </div>

            <div className="mt-3 space-y-2">
              {(budgets?.items || []).length === 0 && <p className="text-sm text-slate-600">No budgets yet for this month.</p>}
              {(budgets?.items || []).map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{item.category.name}</p>
                    <button onClick={() => void deleteBudget(item.id)} className={dangerButtonClass}>
                      Delete
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Planned {currency(item.amount)} | Spent {currency(item.spent)} | Remaining {currency(item.remaining)}
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${item.usageRatio > 1 ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, Math.max(4, item.usageRatio * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Goals</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                className={inputClass}
                value={goalForm.name}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Goal name"
              />
              <input
                className={inputClass}
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, targetAmount: e.target.value }))}
                placeholder="Target amount"
              />
              <input
                className={inputClass}
                value={goalForm.currentAmount}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, currentAmount: e.target.value }))}
                placeholder="Current amount"
              />
              <input
                type="date"
                className={inputClass}
                value={goalForm.targetDate}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, targetDate: e.target.value }))}
              />
              <input
                className={inputClass}
                value={goalForm.note}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Optional note"
              />
              <button onClick={createGoal} className={primaryButtonClass}>
                Add Goal
              </button>
            </div>
            {goalFormError && <p className="mt-2 text-sm text-rose-700">{goalFormError}</p>}

            <div className="mt-4 rounded-md border border-slate-200 p-3">
              <PieChart slices={goalsPieSlices} />
            </div>

            <div className="mt-3 space-y-2">
              {(goals?.items || []).length === 0 && <p className="text-sm text-slate-600">No goals yet.</p>}
              {(goals?.items || []).map((goal) => (
                <div key={goal.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{goal.name}</p>
                    <button onClick={() => void deleteGoal(goal.id)} className={dangerButtonClass}>
                      Delete
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {currency(goal.currentAmount)} / {currency(goal.targetAmount)}{" "}
                    {goal.targetDate ? `| Target ${new Date(goal.targetDate).toLocaleDateString()}` : ""}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => void updateGoalProgress(goal, Number((goal.currentAmount + 50).toFixed(2)))}
                      className={subtleButtonClass}
                    >
                      +50
                    </button>
                    <button
                      onClick={() => void updateGoalProgress(goal, Number((goal.currentAmount + 100).toFixed(2)))}
                      className={subtleButtonClass}
                    >
                      +100
                    </button>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{goal.status}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${Math.min(100, Math.max(4, goal.progressRatio * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Create Transaction</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
            Amount
            <input
              className={`${inputClass} mt-1`}
              value={createForm.amount}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
              {createErrors.amount && <div className="mt-1 text-xs text-rose-700">{createErrors.amount}</div>}
          </label>
            <label className="text-sm font-medium text-slate-700">
            Type
            <select
              className={`${selectClass} mt-1`}
              value={createForm.type}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE" }))}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </label>
            <label className="text-sm font-medium text-slate-700">
            Date
            <input
              className={`${inputClass} mt-1`}
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
            />
              {createErrors.date && <div className="mt-1 text-xs text-rose-700">{createErrors.date}</div>}
          </label>
            <label className="text-sm font-medium text-slate-700">
            Account
            <select
              className={`${selectClass} mt-1`}
              value={createForm.bankAccountId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, bankAccountId: e.target.value }))}
            >
              <option value="">Select</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
              {createErrors.bankAccountId && <div className="mt-1 text-xs text-rose-700">{createErrors.bankAccountId}</div>}
          </label>
            <label className="text-sm font-medium text-slate-700">
            Category
            <select
              className={`${selectClass} mt-1`}
              value={createForm.categoryId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            >
              <option value="">None</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
            <label className="text-sm font-medium text-slate-700">
            Note
            <input
              className={`${inputClass} mt-1`}
              value={createForm.note}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </label>
        </div>
          <button onClick={createTransaction} disabled={mutationBusy} className={`${primaryButtonClass} mt-4`}>
            {mutationBusy ? "Saving..." : "Add Transaction"}
          </button>
        </section>

        {loading && <p className="text-sm text-slate-600">Loading dashboard...</p>}
        {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {!loading && analytics && (
          <>
            <div className="mb-6 grid gap-3 md:grid-cols-3">
            {summaryCards?.map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{card.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Income vs Expense (Last {analytics.months} months)</h3>
            <BarChart series={analytics.series} />
          </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Net Trend</h3>
            <NetLineChart series={analytics.series} />
          </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Category Breakdown ({breakdownType})</h3>
            <CategoryBreakdownChart items={breakdown?.items || []} />
          </div>
          </>
        )}

        {!loading && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Transactions</h2>
          {transactions.length === 0 ? (
              <p className="text-sm text-slate-600">No transactions yet.</p>
          ) : (
              <ul className="space-y-3">
              {transactions.map((tx) => (
                  <li key={tx.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  {editingId === tx.id ? (
                      <div className="rounded-md border border-slate-200 p-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="text-sm font-medium text-slate-700">
                          Amount
                          <input
                            className={`${inputClass} mt-1`}
                            value={editForm.amount}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                          />
                            {editErrors.amount && <div className="mt-1 text-xs text-rose-700">{editErrors.amount}</div>}
                        </label>
                          <label className="text-sm font-medium text-slate-700">
                          Type
                          <select
                            className={`${selectClass} mt-1`}
                            value={editForm.type}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE" }))
                            }
                          >
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                          </select>
                        </label>
                          <label className="text-sm font-medium text-slate-700">
                          Date
                          <input
                            className={`${inputClass} mt-1`}
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                          />
                            {editErrors.date && <div className="mt-1 text-xs text-rose-700">{editErrors.date}</div>}
                        </label>
                          <label className="text-sm font-medium text-slate-700">
                          Account
                          <select
                            className={`${selectClass} mt-1`}
                            value={editForm.bankAccountId}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, bankAccountId: e.target.value }))}
                          >
                            <option value="">Select</option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                          {editErrors.bankAccountId && (
                              <div className="mt-1 text-xs text-rose-700">{editErrors.bankAccountId}</div>
                          )}
                        </label>
                          <label className="text-sm font-medium text-slate-700">
                          Category
                          <select
                            className={`${selectClass} mt-1`}
                            value={editForm.categoryId}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                          >
                            <option value="">None</option>
                            {filteredEditCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </label>
                          <label className="text-sm font-medium text-slate-700">
                          Note
                          <input
                            className={`${inputClass} mt-1`}
                            value={editForm.note}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                          />
                        </label>
                      </div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => saveEdit(tx.id)} disabled={mutationBusy} className={primaryButtonClass}>
                          Save
                        </button>
                          <button onClick={() => setEditingId(null)} disabled={mutationBusy} className={subtleButtonClass}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-slate-900">
                            {tx.type} {currency(Number(tx.amount))}
                          </strong>
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(tx)} disabled={mutationBusy || tx.id.startsWith("temp-")} className={subtleButtonClass}>
                              Edit
                            </button>
                            <button onClick={() => void deleteTransaction(tx)} disabled={mutationBusy || tx.id.startsWith("temp-")} className={dangerButtonClass}>
                              Delete
                            </button>
                          </div>
                        </div>
                        <span className="mt-1 block text-sm text-slate-500">
                        {new Date(tx.date).toLocaleDateString()} {tx.note ? `- ${tx.note}` : ""}{" "}
                        {tx.bankAccount?.name ? `- ${tx.bankAccount.name}` : ""}
                        {tx.category?.name ? `- ${tx.category.name}` : ""}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={subtleButtonClass}>
              Prev
            </button>
              <span className="text-sm text-slate-600">Page {page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={transactions.length < pageSize} className={subtleButtonClass}>
              Next
            </button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

type PieSlice = { label: string; value: number; color?: string | null };

function PieChart({ slices, size = 220 }: { slices: PieSlice[]; size?: number }) {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  const radius = size / 2 - 12;
  const center = size / 2;
  let cursor = -Math.PI / 2;

  const palette = ["#0f766e", "#16a34a", "#0284c7", "#6366f1", "#f97316", "#dc2626", "#8b5cf6", "#0891b2"];
  const pathForSlice = (start: number, end: number) => {
    const x1 = center + radius * Math.cos(start);
    const y1 = center + radius * Math.sin(start);
    const x2 = center + radius * Math.cos(end);
    const y2 = center + radius * Math.sin(end);
    const largeArcFlag = end - start > Math.PI ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="grid gap-3 md:grid-cols-[auto,1fr] md:items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Pie chart">
        {total === 0 ? (
          <circle cx={center} cy={center} r={radius} fill="#e2e8f0" />
        ) : (
          slices.map((slice, idx) => {
            const value = Math.max(0, slice.value);
            const angle = (value / total) * Math.PI * 2;
            const start = cursor;
            const end = cursor + angle;
            cursor = end;
            return (
              <path
                key={`${slice.label}-${idx}`}
                d={pathForSlice(start, end)}
                fill={slice.color || palette[idx % palette.length]}
                stroke="#fff"
                strokeWidth={1}
              />
            );
          })
        )}
        <circle cx={center} cy={center} r={radius * 0.45} fill="white" />
        <text x={center} y={center - 4} textAnchor="middle" fontSize={12} fill="#64748b">
          Total
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fontSize={14} fontWeight={600} fill="#0f172a">
          {currency(total)}
        </text>
      </svg>
      <ul className="space-y-1 text-sm text-slate-600">
        {slices.length === 0 && <li>No data available.</li>}
        {slices.map((slice, idx) => {
          const share = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <li key={`${slice.label}-${idx}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: slice.color || palette[idx % palette.length] }}
                />
                {slice.label}
              </span>
              <span>
                {currency(slice.value)} ({share}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


