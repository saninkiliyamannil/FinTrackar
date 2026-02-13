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

  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.type.toUpperCase() === createForm.type),
    [categories, createForm.type]
  );

  const filteredEditCategories = useMemo(
    () => categories.filter((cat) => cat.type.toUpperCase() === editForm.type),
    [categories, editForm.type]
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
      const [txRes, analyticsRes, breakdownRes, accountsRes, categoriesRes] = await Promise.all([
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

      const txData = txRes.data;
      const analyticsData = analyticsRes.data;
      const breakdownData = breakdownRes.data;
      const accountsData = accountsRes.data;
      const categoriesData = categoriesRes.data;

      setTransactions(txData.items);
      setAnalytics(analyticsData);
      setBreakdown(breakdownData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      if (!createForm.bankAccountId && accountsData.length > 0) {
        setCreateForm((prev) => ({ ...prev, bankAccountId: accountsData[0].id }));
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [breakdownType, createForm.bankAccountId, months, page, status, typeFilter]);

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

  function exportCsv() {
    const query = new URLSearchParams({
      ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
    });
    window.location.href = `/api/transactions/export.csv?${query.toString()}`;
  }

  if (status === "loading") return <p style={{ padding: 24 }}>Loading session...</p>;

  if (status !== "authenticated" || !user) {
    return (
      <div style={{ padding: 24 }}>
        <p>You must be signed in to view transactions.</p>
        <button onClick={login}>Sign in</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>Transactions Dashboard</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Months:
          <select aria-label="Months" value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ marginLeft: 8 }}>
            <option value={3}>3</option>
            <option value={6}>6</option>
            <option value={12}>12</option>
          </select>
        </label>

        <label>
          Type:
          <select
            aria-label="Type"
            value={typeFilter}
            onChange={(e) => {
              setPage(1);
              setTypeFilter(e.target.value as "ALL" | "INCOME" | "EXPENSE");
            }}
            style={{ marginLeft: 8 }}
          >
            <option value="ALL">All</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </label>

        <label>
          Breakdown:
          <select
            aria-label="Breakdown"
            value={breakdownType}
            onChange={(e) => setBreakdownType(e.target.value as "INCOME" | "EXPENSE")}
            style={{ marginLeft: 8 }}
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </label>

        <button onClick={exportCsv}>Export CSV</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Manage Accounts</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Account name"
              value={accountForm.name}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
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
            <button onClick={createAccount}>Add</button>
          </div>
          {accountFormError && <p style={{ color: "#b91c1c", marginTop: 0 }}>{accountFormError}</p>}
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {accounts.map((acc) => (
              <li key={acc.id} style={{ marginBottom: 6 }}>
                {editingAccountId === acc.id ? (
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={editingAccountName} onChange={(e) => setEditingAccountName(e.target.value)} />
                    <select
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
                    <button onClick={() => saveAccount(acc)}>Save</button>
                    <button onClick={() => setEditingAccountId(null)}>Cancel</button>
                  </span>
                ) : (
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <strong>{acc.name}</strong> <em>{acc.type || "BANK"}</em>
                    <button onClick={() => startEditAccount(acc)}>Edit</button>
                    <button onClick={() => deleteAccount(acc)}>Delete</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Manage Categories</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Category name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              value={categoryForm.type}
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE" }))
              }
            >
              <option value="EXPENSE">EXPENSE</option>
              <option value="INCOME">INCOME</option>
            </select>
            <input
              type="color"
              value={categoryForm.color}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, color: e.target.value }))}
              title="Category color"
            />
            <button onClick={createCategory}>Add</button>
          </div>
          {categoryFormError && <p style={{ color: "#b91c1c", marginTop: 0 }}>{categoryFormError}</p>}
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {categories.map((cat) => (
              <li key={cat.id} style={{ marginBottom: 6 }}>
                {editingCategoryId === cat.id ? (
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} />
                    <select
                      value={editingCategoryType}
                      onChange={(e) => setEditingCategoryType(e.target.value as "INCOME" | "EXPENSE")}
                    >
                      <option value="EXPENSE">EXPENSE</option>
                      <option value="INCOME">INCOME</option>
                    </select>
                    <button onClick={() => saveCategory(cat)}>Save</button>
                    <button onClick={() => setEditingCategoryId(null)}>Cancel</button>
                  </span>
                ) : (
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <strong>{cat.name}</strong> <em>{cat.type}</em>
                    <button onClick={() => startEditCategory(cat)}>Edit</button>
                    <button onClick={() => deleteCategory(cat)}>Delete</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Create Transaction</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <label>
            Amount
            <input
              value={createForm.amount}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, amount: e.target.value }))}
              style={{ width: "100%" }}
            />
            {createErrors.amount && <div style={{ color: "#b91c1c", fontSize: 12 }}>{createErrors.amount}</div>}
          </label>
          <label>
            Type
            <select
              value={createForm.type}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE" }))}
              style={{ width: "100%" }}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
              style={{ width: "100%" }}
            />
            {createErrors.date && <div style={{ color: "#b91c1c", fontSize: 12 }}>{createErrors.date}</div>}
          </label>
          <label>
            Account
            <select
              value={createForm.bankAccountId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, bankAccountId: e.target.value }))}
              style={{ width: "100%" }}
            >
              <option value="">Select</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            {createErrors.bankAccountId && <div style={{ color: "#b91c1c", fontSize: 12 }}>{createErrors.bankAccountId}</div>}
          </label>
          <label>
            Category
            <select
              value={createForm.categoryId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              style={{ width: "100%" }}
            >
              <option value="">None</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Note
            <input
              value={createForm.note}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, note: e.target.value }))}
              style={{ width: "100%" }}
            />
          </label>
        </div>
        <button onClick={createTransaction} disabled={mutationBusy} style={{ marginTop: 10 }}>
          {mutationBusy ? "Saving..." : "Add Transaction"}
        </button>
      </div>

      {loading && <p>Loading dashboard...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!loading && analytics && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
            {summaryCards?.map((card) => (
              <div key={card.label} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{card.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Income vs Expense (Last {analytics.months} months)</h3>
            <BarChart series={analytics.series} />
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Net Trend</h3>
            <NetLineChart series={analytics.series} />
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Category Breakdown ({breakdownType})</h3>
            <CategoryBreakdownChart items={breakdown?.items || []} />
          </div>
        </>
      )}

      {!loading && (
        <>
          <h2 style={{ marginBottom: 8 }}>Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <ul style={{ paddingLeft: 16 }}>
              {transactions.map((tx) => (
                <li key={tx.id} style={{ marginBottom: 10 }}>
                  {editingId === tx.id ? (
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                        <label>
                          Amount
                          <input
                            value={editForm.amount}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                            style={{ width: "100%" }}
                          />
                          {editErrors.amount && <div style={{ color: "#b91c1c", fontSize: 12 }}>{editErrors.amount}</div>}
                        </label>
                        <label>
                          Type
                          <select
                            value={editForm.type}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE" }))
                            }
                            style={{ width: "100%" }}
                          >
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                          </select>
                        </label>
                        <label>
                          Date
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                            style={{ width: "100%" }}
                          />
                          {editErrors.date && <div style={{ color: "#b91c1c", fontSize: 12 }}>{editErrors.date}</div>}
                        </label>
                        <label>
                          Account
                          <select
                            value={editForm.bankAccountId}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, bankAccountId: e.target.value }))}
                            style={{ width: "100%" }}
                          >
                            <option value="">Select</option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                          {editErrors.bankAccountId && (
                            <div style={{ color: "#b91c1c", fontSize: 12 }}>{editErrors.bankAccountId}</div>
                          )}
                        </label>
                        <label>
                          Category
                          <select
                            value={editForm.categoryId}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                            style={{ width: "100%" }}
                          >
                            <option value="">None</option>
                            {filteredEditCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Note
                          <input
                            value={editForm.note}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                            style={{ width: "100%" }}
                          />
                        </label>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button onClick={() => saveEdit(tx.id)} disabled={mutationBusy}>
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} disabled={mutationBusy}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <strong>{tx.type}</strong> {currency(Number(tx.amount))}
                      <br />
                      <span style={{ color: "#64748b" }}>
                        {new Date(tx.date).toLocaleDateString()} {tx.note ? `- ${tx.note}` : ""}{" "}
                        {tx.bankAccount?.name ? `- ${tx.bankAccount.name}` : ""}
                        {tx.category?.name ? `- ${tx.category.name}` : ""}
                      </span>
                      <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
                        <button onClick={() => startEdit(tx)} disabled={mutationBusy || tx.id.startsWith("temp-")}>
                          Edit
                        </button>
                        <button onClick={() => void deleteTransaction(tx)} disabled={mutationBusy || tx.id.startsWith("temp-")}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </button>
            <span>Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={transactions.length < pageSize}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}


