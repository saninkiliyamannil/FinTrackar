import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth/client";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { FormRow } from "@/components/ui/form-row";
import { SectionHeader } from "@/components/ui/section-header";

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

type LocationAnchor = {
  id: string;
  label: string;
  locationKey: string;
  hourStart: number;
  hourEnd: number;
  isActive: boolean;
};

type LocationReminderLog = {
  id: string;
  message: string;
  remindedAt: string;
  anchor: { id: string; label: string; locationKey: string };
};

type MessageImportItem = {
  id: string;
  imagePath: string | null;
  extractedText: string | null;
  parsedAmount: number | null;
  parsedType: "INCOME" | "EXPENSE" | null;
  parsedDate: string | null;
  parsedNote: string | null;
  confidence: number;
  status: "PARSED" | "CONFIRMED" | "FAILED";
  createdAt: string;
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

type TrendPeriod = "daily" | "weekly" | "monthly" | "yearly";

type TrendPoint = {
  key: string;
  label: string;
  start: string;
  income: number;
  expense: number;
  savings: number;
};

type TrendsResponse = {
  period: TrendPeriod;
  range: number;
  from: string;
  to: string;
  points: TrendPoint[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    averageIncome: number;
    averageExpense: number;
  };
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
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
  const router = useRouter();
  const { status, login, user } = useAuth();
  const createSectionRef = useRef<HTMLDivElement | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [analytics, setAnalytics] = useState<MonthlyAnalyticsResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);

  const [months, setMonths] = useState(6);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("monthly");
  const [trendRange, setTrendRange] = useState(12);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [breakdownType, setBreakdownType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalTransactions, setTotalTransactions] = useState(0);

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
  const [categoryActionId, setCategoryActionId] = useState<string | null>(null);
  const [locationAnchors, setLocationAnchors] = useState<LocationAnchor[]>([]);
  const [locationLogs, setLocationLogs] = useState<LocationReminderLog[]>([]);
  const [newAnchorLabel, setNewAnchorLabel] = useState("");
  const [newAnchorLocationKey, setNewAnchorLocationKey] = useState("");
  const [newAnchorHourStart, setNewAnchorHourStart] = useState("9");
  const [newAnchorHourEnd, setNewAnchorHourEnd] = useState("11");
  const [evalLocationKey, setEvalLocationKey] = useState("");
  const [messageSampleText, setMessageSampleText] = useState("");
  const [messageImportFile, setMessageImportFile] = useState<File | null>(null);
  const [messageImports, setMessageImports] = useState<MessageImportItem[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [confirmImportAmount, setConfirmImportAmount] = useState("");
  const [confirmImportType, setConfirmImportType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [confirmImportDate, setConfirmImportDate] = useState(todayIsoDate());
  const [confirmImportNote, setConfirmImportNote] = useState("");

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
      ...(searchFilter.trim() ? { search: searchFilter.trim() } : {}),
    });

    try {
      const [txRes, analyticsRes, trendsRes, breakdownRes, accountsRes, categoriesRes, anchorsRes, remindersRes, importsRes] = await Promise.all([
        fetch(`/api/transactions?${txQuery.toString()}`).then((res) =>
          res.json() as Promise<Envelope<TransactionsResponse>>
        ),
        fetch(`/api/analytics/monthly?months=${months}`).then((res) =>
          res.json() as Promise<Envelope<MonthlyAnalyticsResponse>>
        ),
        fetch(`/api/analytics/trends?period=${trendPeriod}&range=${trendRange}`).then((res) =>
          res.json() as Promise<Envelope<TrendsResponse>>
        ),
        fetch(`/api/analytics/category-breakdown?months=${months}&type=${breakdownType}`).then((res) =>
          res.json() as Promise<Envelope<CategoryBreakdownResponse>>
        ),
        fetch("/api/accounts").then((res) => res.json() as Promise<Envelope<Account[]>>),
        fetch("/api/categories").then((res) => res.json() as Promise<Envelope<Category[]>>),
        fetch("/api/location-anchors").then((res) => res.json() as Promise<Envelope<LocationAnchor[]>>),
        fetch("/api/location-reminders/recent").then((res) => res.json() as Promise<Envelope<LocationReminderLog[]>>),
        fetch("/api/message-imports/recent").then((res) => res.json() as Promise<Envelope<MessageImportItem[]>>),
      ]);

      if (txRes.code !== "OK" || !txRes.data) throw new Error(txRes.error?.message || "Failed to load transactions");
      if (analyticsRes.code !== "OK" || !analyticsRes.data) {
        throw new Error(analyticsRes.error?.message || "Failed to load analytics");
      }
      if (trendsRes.code !== "OK" || !trendsRes.data) {
        throw new Error(trendsRes.error?.message || "Failed to load trends");
      }
      if (breakdownRes.code !== "OK" || !breakdownRes.data) {
        throw new Error(breakdownRes.error?.message || "Failed to load category breakdown");
      }
      if (accountsRes.code !== "OK" || !accountsRes.data) throw new Error(accountsRes.error?.message || "Failed accounts");
      if (categoriesRes.code !== "OK" || !categoriesRes.data) {
        throw new Error(categoriesRes.error?.message || "Failed categories");
      }
      if (anchorsRes.code !== "OK" || !anchorsRes.data) {
        throw new Error(anchorsRes.error?.message || "Failed location anchors");
      }
      if (remindersRes.code !== "OK" || !remindersRes.data) {
        throw new Error(remindersRes.error?.message || "Failed location reminders");
      }
      if (importsRes.code !== "OK" || !importsRes.data) {
        throw new Error(importsRes.error?.message || "Failed message imports");
      }

      const txData = txRes.data;
      const analyticsData = analyticsRes.data;
      const trendsData = trendsRes.data;
      const breakdownData = breakdownRes.data;
      const accountsData = accountsRes.data;
      const categoriesData = categoriesRes.data;

      setTransactions(txData.items);
      setTotalTransactions(txData.total);
      setAnalytics(analyticsData);
      setTrends(trendsData);
      setBreakdown(breakdownData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setLocationAnchors(anchorsRes.data);
      setLocationLogs(remindersRes.data);
      setMessageImports(importsRes.data);
      if (!createForm.bankAccountId && accountsData.length > 0) {
        setCreateForm((prev) => ({ ...prev, bankAccountId: accountsData[0].id }));
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [breakdownType, createForm.bankAccountId, months, page, searchFilter, status, trendPeriod, trendRange, typeFilter]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!router.isReady || router.query.create !== "1") return;
    createSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [router.isReady, router.query.create]);

  useEffect(() => {
    if (!router.isReady) return;
    const nextSearch = typeof router.query.search === "string" ? router.query.search : "";
    setSearchFilter(nextSearch);
    setPage(1);
  }, [router.isReady, router.query.search]);

  const summaryCards = useMemo(() => {
    const summary = analytics?.summary;
    if (!summary) return null;
    return [
      { label: "Income", value: currency(summary.totalIncome), color: "#166534" },
      { label: "Expense", value: currency(summary.totalExpense), color: "#991b1b" },
      { label: "Net", value: currency(summary.net), color: summary.net >= 0 ? "#1d4ed8" : "#b91c1c" },
    ];
  }, [analytics]);

  const visibleTransactions = transactions;


  const savingsPieSlices = useMemo(() => {
    if (!trends) return [];
    const savings = trends.summary.totalSavings;
    if (savings >= 0) {
      return [
        { label: "Expenses", value: trends.summary.totalExpense, color: "#dc2626" },
        { label: "Savings", value: savings, color: "#16a34a" },
      ];
    }
    return [
      { label: "Expenses", value: trends.summary.totalExpense, color: "#dc2626" },
      { label: "Deficit", value: Math.abs(savings), color: "#f59e0b" },
    ];
  }, [trends]);

  async function promptAllocateIncomeToGoal(incomeAmount: number) {
    const goalsRes = await fetch("/api/goals");
    const goalsPayload = (await goalsRes.json()) as Envelope<{ items: { id: string; name: string; targetAmount: number; currentAmount: number; status: string }[] }>;
    if (!goalsRes.ok || goalsPayload.code !== "OK" || !goalsPayload.data) {
      setError(goalsPayload.error?.message || "Unable to load goals for allocation.");
      return;
    }

    const activeGoals = goalsPayload.data.items.filter((g) => g.status === "ACTIVE" && g.currentAmount < g.targetAmount);
    if (activeGoals.length === 0) {
      return;
    }

    const shouldAllocate = window.confirm("Income added. Do you want to allocate part of it to a goal?");
    if (!shouldAllocate) return;

    const amountRaw = window.prompt(`Enter amount to allocate (max ${incomeAmount.toFixed(2)}):`, `${Math.max(0, Math.round(incomeAmount * 0.25)).toFixed(2)}`);
    if (!amountRaw) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > incomeAmount) {
      setError("Invalid allocation amount.");
      return;
    }

    const targetGoal = activeGoals.sort((a, b) => (a.targetAmount - a.currentAmount) - (b.targetAmount - b.currentAmount))[0];
    const updateRes = await fetch(`/api/goals/${targetGoal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentAmount: Number((targetGoal.currentAmount + amount).toFixed(2)) }),
    });
    const updatePayload = (await updateRes.json()) as Envelope<{ id: string }>;
    if (!updateRes.ok || updatePayload.code !== "OK") {
      setError(updatePayload.error?.message || "Failed to allocate income to goal.");
      return;
    }

    setError(null);
    alert(`Allocated ${currency(amount)} to goal: ${targetGoal.name}`);
  }

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
      if (createForm.type === "INCOME") {
        void promptAllocateIncomeToGoal(Number(createForm.amount));
      }
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

  async function quickEditCategory(category: Category) {
    setCategoryActionId(null);
    const name = window.prompt("Category name", category.name)?.trim();
    if (!name) return;
    const typeInput = window.prompt("Category type (INCOME or EXPENSE)", String(category.type).toUpperCase())?.trim().toUpperCase();
    if (!typeInput || (typeInput !== "INCOME" && typeInput !== "EXPENSE")) {
      setCategoryFormError("Category type must be INCOME or EXPENSE");
      return;
    }
    const previous = { ...category };
    const optimistic: Category = { ...category, name, type: typeInput };
    setCategories((prev) => prev.map((cat) => (cat.id === category.id ? optimistic : cat)));
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: typeInput }),
      });
      const payload = (await response.json()) as Envelope<Category>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to update category");
      }
      setCategories((prev) => prev.map((cat) => (cat.id === category.id ? payload.data! : cat)));
    } catch (err) {
      setCategories((prev) => prev.map((cat) => (cat.id === category.id ? previous : cat)));
      setCategoryFormError((err as Error).message || "Update category failed");
    }
  }

  async function deleteCategory(category: Category) {
    setCategoryActionId(null);
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

  async function createLocationAnchor() {
    if (!newAnchorLabel.trim() || !newAnchorLocationKey.trim()) {
      setError("Anchor label and location key are required.");
      return;
    }

    try {
      const response = await fetch("/api/location-anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newAnchorLabel.trim(),
          locationKey: newAnchorLocationKey.trim(),
          hourStart: Number(newAnchorHourStart),
          hourEnd: Number(newAnchorHourEnd),
        }),
      });
      const payload = (await response.json()) as Envelope<LocationAnchor>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to create location anchor");
      }
      setLocationAnchors((prev) => [payload.data!, ...prev]);
      setNewAnchorLabel("");
      setNewAnchorLocationKey("");
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to create location anchor");
    }
  }

  async function evaluateReminder() {
    if (!evalLocationKey.trim()) {
      setError("Enter a location key to evaluate reminder.");
      return;
    }

    try {
      const response = await fetch("/api/location-reminders/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationKey: evalLocationKey.trim() }),
      });
      const payload = (await response.json()) as Envelope<{
        shouldRemind: boolean;
        reminder?: { id: string; message: string; remindedAt: string; anchorLabel: string };
        reason?: string;
      }>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to evaluate reminder");
      }

      if (payload.data.shouldRemind && payload.data.reminder) {
        alert(payload.data.reminder.message);
      }
      void loadDashboardData();
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to evaluate reminder");
    }
  }

  async function toggleAnchorActive(anchor: LocationAnchor) {
    try {
      const response = await fetch(`/api/location-anchors/${anchor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !anchor.isActive }),
      });
      const payload = (await response.json()) as Envelope<LocationAnchor>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to update anchor");
      }
      setLocationAnchors((prev) => prev.map((item) => (item.id === anchor.id ? payload.data! : item)));
    } catch (err) {
      setError((err as Error).message || "Failed to update anchor");
    }
  }

  async function deleteAnchor(anchor: LocationAnchor) {
    const ok = window.confirm(`Delete location anchor "${anchor.label}"?`);
    if (!ok) return;
    try {
      const response = await fetch(`/api/location-anchors/${anchor.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as Envelope<{ ok: boolean }>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to delete anchor");
      }
      setLocationAnchors((prev) => prev.filter((item) => item.id !== anchor.id));
    } catch (err) {
      setError((err as Error).message || "Failed to delete anchor");
    }
  }

  async function parseSampleMessageImage() {
    if (!messageSampleText.trim() && !messageImportFile) {
      setError("Add sample message text or upload an image.");
      return;
    }

    try {
      let dataUrl: string | undefined;
      if (messageImportFile) {
        dataUrl = await fileToDataUrl(messageImportFile);
      }

      const response = await fetch("/api/message-imports/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          sampleText: messageSampleText.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as Envelope<{
        import: MessageImportItem;
        preview: {
          amount: number | null;
          type: "INCOME" | "EXPENSE" | null;
          date: string | null;
          note: string | null;
          confidence: number;
        };
      }>;
      if (!response.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to parse message");
      }

      const imported = payload.data.import;
      setMessageImports((prev) => [imported, ...prev.filter((item) => item.id !== imported.id)]);
      setSelectedImportId(imported.id);
      setConfirmImportAmount(imported.parsedAmount ? String(imported.parsedAmount) : "");
      setConfirmImportType((imported.parsedType || "EXPENSE") as "INCOME" | "EXPENSE");
      setConfirmImportDate(imported.parsedDate ? imported.parsedDate.slice(0, 10) : todayIsoDate());
      setConfirmImportNote(imported.parsedNote || "");
      setMessageImportFile(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to parse message");
    }
  }

  async function confirmImportedTransaction() {
    if (!selectedImportId) {
      setError("Select a parsed import first.");
      return;
    }

    if (!createForm.bankAccountId) {
      setError("Select an account before confirming imported transaction.");
      return;
    }

    try {
      const response = await fetch("/api/message-imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importId: selectedImportId,
          amount: Number(confirmImportAmount),
          type: confirmImportType,
          date: confirmImportDate,
          note: confirmImportNote || undefined,
          bankAccountId: createForm.bankAccountId,
          categoryId: createForm.categoryId || undefined,
        }),
      });
      const payload = (await response.json()) as Envelope<Transaction>;
      if (!response.ok || payload.code !== "OK") {
        throw new Error(payload.error?.message || "Failed to confirm imported transaction");
      }

      setSelectedImportId(null);
      setConfirmImportAmount("");
      setConfirmImportNote("");
      setMessageSampleText("");
      setError(null);
      void loadDashboardData();
    } catch (err) {
      setError((err as Error).message || "Failed to confirm imported transaction");
    }
  }

  function exportCsv() {
    const query = new URLSearchParams({
      ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
    });
    window.location.href = `/api/transactions/export.csv?${query.toString()}`;
  }

  function openCreateTransaction() {
    createSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const inputClass =
    "field";
  const selectClass =
    "field";
  const primaryButtonClass =
    "btn btn-primary";
  const subtleButtonClass =
    "btn btn-subtle";
  const dangerButtonClass =
    "btn btn-danger";

  if (status === "loading") {
    return <p className="app-container px-4 py-8 text-sm text-slate-600">Loading session...</p>;
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="app-container max-w-3xl px-4 py-12">
        <Card className="p-6" as="div">
          <h1 className="text-xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">You must be signed in to view transactions.</p>
          <button onClick={login} className={`${primaryButtonClass} mt-5`}>
            Sign in
          </button>
        </Card>
      </div>
    );
  }

  return (
    <AppShell
      actions={
        <>
          <button onClick={exportCsv} className={subtleButtonClass}>
            Export
          </button>
          <button onClick={openCreateTransaction} className={primaryButtonClass}>
            + New Transaction
          </button>
        </>
      }
    >
      <div className="app-container">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-100">Transactions Dashboard</h1>
            <p className="text-lg text-slate-400">View and manage all your financial transactions</p>
          </div>
        </div>

        <Card className="mb-6 p-4">
          <SectionHeader title="Filters" />
          <FormRow columnsClass="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <label className="text-sm font-medium text-slate-700">
              Search
              <input
                className={`${inputClass} mt-1`}
                placeholder="Search note/category/date"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setPage(1);
                }}
              />
            </label>
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

            <label className="text-sm font-medium text-slate-700">
              Trend Period
              <select
                aria-label="Trend Period"
                value={trendPeriod}
                onChange={(e) => {
                  const next = e.target.value as TrendPeriod;
                  setTrendPeriod(next);
                  setTrendRange(next === "daily" ? 14 : next === "weekly" ? 12 : next === "monthly" ? 12 : 5);
                }}
                className={`${selectClass} mt-1`}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Trend Range
              <select
                aria-label="Trend Range"
                value={trendRange}
                onChange={(e) => setTrendRange(Number(e.target.value))}
                className={`${selectClass} mt-1`}
              >
                {(trendPeriod === "daily"
                  ? [7, 14, 30, 60, 90]
                  : trendPeriod === "weekly"
                    ? [4, 8, 12, 26, 52]
                    : trendPeriod === "monthly"
                      ? [3, 6, 12, 24, 36]
                      : [3, 5, 8, 10, 12]
                ).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </FormRow>
        </Card>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <SectionHeader title="Manage Accounts" />
            <FormRow columnsClass="sm:grid-cols-3">
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
            </FormRow>
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
          </Card>

          <Card className="p-4">
            <SectionHeader title="Manage Categories" />
            <FormRow columnsClass="sm:grid-cols-4">
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
            </FormRow>
            {categoryFormError && <p className="mt-2 text-sm text-rose-700">{categoryFormError}</p>}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {categories.map((cat) => (
                <li key={cat.id} className="relative rounded-md border border-slate-200 p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-800">
                      <strong>{cat.name}</strong> <span className="ml-1 text-slate-500">{cat.type}</span>
                    </p>
                    <button
                      className="btn btn-subtle px-2 py-1 text-xs"
                      aria-label={`Actions for ${cat.name}`}
                      onClick={() => setCategoryActionId((prev) => (prev === cat.id ? null : cat.id))}
                    >
                      ...
                    </button>
                  </div>
                  {categoryActionId === cat.id && (
                    <div className="panel absolute right-2 top-10 z-20 w-32 p-1">
                      <button className="btn btn-subtle mb-1 w-full justify-start text-xs" onClick={() => void quickEditCategory(cat)}>
                        Edit
                      </button>
                      <button className="btn btn-danger w-full justify-start text-xs" onClick={() => void deleteCategory(cat)}>
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <SectionHeader title="Location-Based Cash Reminder (Fixed Anchor)" />
            <p className="mb-3 text-sm text-slate-500">
              Add a predefined location and reminder window. Then evaluate to simulate a cash reminder prompt.
            </p>
            <FormRow columnsClass="sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Anchor label (ex: Office Gate)"
                value={newAnchorLabel}
                onChange={(e) => setNewAnchorLabel(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Location key (ex: office-main)"
                value={newAnchorLocationKey}
                onChange={(e) => setNewAnchorLocationKey(e.target.value)}
              />
              <label className="text-xs text-slate-600">
                Start hour
                <input
                  className={`${inputClass} mt-1`}
                  type="number"
                  min={0}
                  max={23}
                  value={newAnchorHourStart}
                  onChange={(e) => setNewAnchorHourStart(e.target.value)}
                />
              </label>
              <label className="text-xs text-slate-600">
                End hour
                <input
                  className={`${inputClass} mt-1`}
                  type="number"
                  min={0}
                  max={23}
                  value={newAnchorHourEnd}
                  onChange={(e) => setNewAnchorHourEnd(e.target.value)}
                />
              </label>
            </FormRow>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={createLocationAnchor} className={primaryButtonClass}>Save Anchor</button>
              <input
                className={inputClass}
                placeholder="Evaluate location key"
                value={evalLocationKey}
                onChange={(e) => setEvalLocationKey(e.target.value)}
              />
              <button onClick={evaluateReminder} className={subtleButtonClass}>Evaluate Reminder</button>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {locationAnchors.slice(0, 4).map((anchor) => (
                <li key={anchor.id} className="rounded-md border border-slate-200 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <strong>{anchor.label}</strong> ({anchor.locationKey}) | {anchor.hourStart}:00-{anchor.hourEnd}:00
                      <div className="text-xs text-slate-500">{anchor.isActive ? "Active" : "Paused"}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-subtle px-2 py-1 text-xs" onClick={() => void toggleAnchorActive(anchor)}>
                        {anchor.isActive ? "Pause" : "Activate"}
                      </button>
                      <button className="btn btn-danger px-2 py-1 text-xs" onClick={() => void deleteAnchor(anchor)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {locationAnchors.length === 0 && <li className="text-slate-500">No anchors yet.</li>}
            </ul>
            <ul className="mt-3 space-y-2 text-xs text-slate-500">
              {locationLogs.slice(0, 3).map((log) => (
                <li key={log.id}>
                  {new Date(log.remindedAt).toLocaleString()} - {log.message}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Auto Add from Bank Message Sample" />
            <p className="mb-3 text-sm text-slate-500">
              Upload a sample screenshot and/or paste sample message text, parse, review, then confirm to create transaction.
            </p>
            <textarea
              className={`${inputClass} min-h-24`}
              placeholder="Paste sample SMS text (recommended for parsing accuracy)"
              value={messageSampleText}
              onChange={(e) => setMessageSampleText(e.target.value)}
            />
            <div className="mt-2">
              <input
                className={inputClass}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => setMessageImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={parseSampleMessageImage} className={primaryButtonClass}>Parse Sample</button>
            </div>

            <div className="mt-3 grid gap-2">
              <label className="text-xs text-slate-600">
                Parsed Amount
                <input className={`${inputClass} mt-1`} value={confirmImportAmount} onChange={(e) => setConfirmImportAmount(e.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                Parsed Type
                <select
                  className={`${selectClass} mt-1`}
                  value={confirmImportType}
                  onChange={(e) => setConfirmImportType(e.target.value as "INCOME" | "EXPENSE")}
                >
                  <option value="EXPENSE">EXPENSE</option>
                  <option value="INCOME">INCOME</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Parsed Date
                <input className={`${inputClass} mt-1`} type="date" value={confirmImportDate} onChange={(e) => setConfirmImportDate(e.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                Parsed Note
                <input className={`${inputClass} mt-1`} value={confirmImportNote} onChange={(e) => setConfirmImportNote(e.target.value)} />
              </label>
              <button onClick={confirmImportedTransaction} className={primaryButtonClass}>Confirm & Add Transaction</button>
            </div>

            <ul className="mt-3 space-y-2 text-xs">
              {messageImports.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className={`cursor-pointer rounded-md border p-2 ${selectedImportId === item.id ? "border-sky-500" : "border-slate-200"}`}
                  onClick={() => {
                    setSelectedImportId(item.id);
                    setConfirmImportAmount(item.parsedAmount ? String(item.parsedAmount) : "");
                    setConfirmImportType((item.parsedType || "EXPENSE") as "INCOME" | "EXPENSE");
                    setConfirmImportDate(item.parsedDate ? item.parsedDate.slice(0, 10) : todayIsoDate());
                    setConfirmImportNote(item.parsedNote || "");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <strong>{item.status}</strong>
                    <span>Confidence {(item.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-slate-500">
                    {item.parsedType || "UNKNOWN"} {item.parsedAmount ? currency(item.parsedAmount) : "N/A"} -{" "}
                    {item.parsedNote || "No note"}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="mb-6 p-4" as="div">
          <div ref={createSectionRef} />
          <SectionHeader title="Create Transaction" />
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
        </Card>

        {loading && <p className="text-sm text-slate-600">Loading dashboard...</p>}
        {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {!loading && analytics && (
          <>
            <div className="mb-6 grid gap-3 md:grid-cols-3">
              {summaryCards?.map((card) => (
                <Card key={card.label} className="p-4" as="div">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{card.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: card.color }}>{card.value}</div>
                </Card>
              ))}
            </div>

            {trends && (
              <Card className="mb-4 p-4" as="div">
                <h3 className="text-base font-semibold text-slate-900">
                  Savings vs Expenses ({trendPeriod}, last {trends.range})
                </h3>
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border border-[var(--border-soft)] p-3">
                    <TrendBarChart points={trends.points} />
                  </div>
                  <div className="rounded-md border border-[var(--border-soft)] p-3">
                    <PieChart slices={savingsPieSlices} />
                    <div className="mt-2 text-xs text-slate-600">
                      <p>Total Income: {currency(trends.summary.totalIncome)}</p>
                      <p>Total Expense: {currency(trends.summary.totalExpense)}</p>
                      <p>Total Savings: {currency(trends.summary.totalSavings)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="mb-4 p-4" as="div">
              <h3 className="text-base font-semibold text-slate-900">Income vs Expense (Last {analytics.months} months)</h3>
              <BarChart series={analytics.series} />
            </Card>

            <Card className="mb-4 p-4" as="div">
              <h3 className="text-base font-semibold text-slate-900">Net Trend</h3>
              <NetLineChart series={analytics.series} />
            </Card>

            <Card className="mb-6 p-4" as="div">
              <h3 className="text-base font-semibold text-slate-900">Category Breakdown ({breakdownType})</h3>
              <CategoryBreakdownChart items={breakdown?.items || []} />
            </Card>
          </>
        )}

        {!loading && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Transactions</h2>
            {visibleTransactions.length === 0 ? (
              <p className="text-sm text-slate-600">No transactions yet.</p>
            ) : (
              <ul className="space-y-3">
                {visibleTransactions.map((tx) => (
                  <Card key={tx.id} className="p-4" as="li">
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
                  </Card>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={subtleButtonClass}>
                Prev
              </button>
              <span className="text-sm text-slate-600">Page {page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * pageSize >= totalTransactions} className={subtleButtonClass}>
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function TrendBarChart({ points }: { points: TrendPoint[] }) {
  const width = 760;
  const height = 240;
  const max = Math.max(1, ...points.map((point) => Math.max(point.income, point.expense)));
  const slot = width / Math.max(1, points.length);
  const barWidth = Math.max(6, (slot - 16) / 2);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Income and expense trends">
      <line x1={0} y1={height - 28} x2={width} y2={height - 28} stroke="#cbd5e1" strokeWidth={1} />
      {points.map((point, idx) => {
        const x = idx * slot + 6;
        const incomeHeight = (point.income / max) * 160;
        const expenseHeight = (point.expense / max) * 160;
        return (
          <g key={point.key}>
            <rect x={x} y={height - 28 - incomeHeight} width={barWidth} height={incomeHeight} fill="#16a34a" rx={2} />
            <rect
              x={x + barWidth + 3}
              y={height - 28 - expenseHeight}
              width={barWidth}
              height={expenseHeight}
              fill="#dc2626"
              rx={2}
            />
            <text x={x} y={height - 10} fill="#334155" fontSize={9}>
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
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





