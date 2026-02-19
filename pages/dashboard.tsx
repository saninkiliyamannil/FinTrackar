import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type MonthlyAnalyticsResponse = {
  months: number;
  series: {
    month: string;
    income: number;
    expense: number;
    net: number;
  }[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    net: number;
  };
};

type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  note: string | null;
  date: string;
  category?: { name: string } | null;
};

type TransactionsResponse = {
  items: Transaction[];
};

type BudgetItem = {
  id: string;
  amount: number;
  spent: number;
  category: { name: string };
};

type BudgetsResponse = {
  items: BudgetItem[];
};

type CategoryBreakdownResponse = {
  items: { categoryName: string; amount: number; share: number }[];
};

type SharedGroup = {
  id: string;
  name: string;
  members: { id: string }[];
};

type GoalsResponse = {
  items: {
    id: string;
    targetAmount: number;
    currentAmount: number;
  }[];
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<MonthlyAnalyticsResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownResponse["items"]>([]);
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([]);
  const [goalAllocated, setGoalAllocated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<{
    month: string;
    income: number;
    expense: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const now = new Date();
      const month = now.getUTCMonth() + 1;
      const year = now.getUTCFullYear();
      try {
        const [analyticsRes, txRes, budgetRes, breakdownRes, groupRes, goalsRes] = await Promise.all([
          fetch("/api/analytics/monthly?months=6").then((r) => r.json() as Promise<Envelope<MonthlyAnalyticsResponse>>),
          fetch("/api/transactions?page=1&pageSize=6").then((r) => r.json() as Promise<Envelope<TransactionsResponse>>),
          fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json() as Promise<Envelope<BudgetsResponse>>),
          fetch("/api/analytics/category-breakdown?months=6&type=EXPENSE").then(
            (r) => r.json() as Promise<Envelope<CategoryBreakdownResponse>>
          ),
          fetch("/api/shared-groups").then((r) => r.json() as Promise<Envelope<SharedGroup[]>>),
          fetch("/api/goals").then((r) => r.json() as Promise<Envelope<GoalsResponse>>),
        ]);
        if (analyticsRes.code !== "OK" || !analyticsRes.data) throw new Error(analyticsRes.error?.message || "Failed analytics");
        if (txRes.code !== "OK" || !txRes.data) throw new Error(txRes.error?.message || "Failed transactions");
        if (budgetRes.code !== "OK" || !budgetRes.data) throw new Error(budgetRes.error?.message || "Failed budgets");
        if (breakdownRes.code !== "OK" || !breakdownRes.data) throw new Error(breakdownRes.error?.message || "Failed categories");
        if (groupRes.code !== "OK" || !groupRes.data) throw new Error(groupRes.error?.message || "Failed shared groups");

        setAnalytics(analyticsRes.data);
        setTransactions(txRes.data.items);
        setBudgets(budgetRes.data.items);
        setBreakdown(breakdownRes.data.items);
        setSharedGroups(groupRes.data);
        if (goalsRes.code === "OK" && goalsRes.data) {
          setGoalAllocated(goalsRes.data.items.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0));
        } else {
          setGoalAllocated(0);
        }
      } catch (err) {
        setError((err as Error).message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const income = analytics?.summary.totalIncome ?? 0;
  const expense = analytics?.summary.totalExpense ?? 0;
  const balance = analytics?.summary.net ?? 0;
  const summary = useMemo(
    () => [
      { label: "Income", value: income, color: "text-emerald-400" },
      { label: "Expenses", value: expense, color: "text-rose-400" },
      { label: "Balance", value: balance, color: "text-sky-400" },
      { label: "Goals Allocated", value: goalAllocated, color: "text-amber-300" },
    ],
    [balance, expense, goalAllocated, income]
  );

  const monthBars = analytics?.series?.slice(-6) || [];
  const maxBar = Math.max(
    1,
    ...monthBars.map((m) => Math.max(Number(m.expense || 0), Math.max(0, Number(m.income || 0))))
  );
  const calendarView = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return {
      monthLabel: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
      today: now.getDate(),
      cells,
    };
  }, []);
  const daysUntilMonthEnd = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);
  const dueItems = useMemo(() => {
    const rows = budgets
      .map((b) => ({
        title: b.category.name,
        amount: Math.max(0, Number(b.amount) - Number(b.spent)),
        days: daysUntilMonthEnd,
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 3);
    if (rows.length > 0) return rows;
    return [{ title: "No upcoming bills", amount: 0, days: 0 }];
  }, [budgets, daysUntilMonthEnd]);

  return (
    <AppShell
      actions={
        <button className="btn btn-primary" onClick={() => void router.push("/transactions?create=1")}>
          + Add Transaction
        </button>
      }
    >
      <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
      <p className="mb-6 text-lg text-slate-400">Welcome back. Here&apos;s your financial overview.</p>
      {loading && <p className="mb-4 text-sm text-slate-400">Loading dashboard...</p>}
      {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card className="motion-enter p-5 shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
          <h2 className="text-2xl font-bold text-slate-100">Financial Overview</h2>
          <p className="mb-4 text-lg text-slate-400">Overall expense and savings</p>
          <div className="grid gap-3 md:grid-cols-3">
            {summary.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-600/60"
              >
                <div className="text-base text-slate-400">{item.label}</div>
                <div className={`text-2xl font-bold ${item.color}`}>{currency(item.value)}</div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="mb-3 flex min-h-12 items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 py-2">
              <div className="text-sm text-slate-300">
                {hoveredMonth ? (
                  <>
                    <span className="font-semibold text-slate-100">{hoveredMonth.month}</span>
                    <span className="ml-3 text-emerald-300">Income: {currency(hoveredMonth.income)}</span>
                    <span className="ml-3 text-rose-300">Expense: {currency(hoveredMonth.expense)}</span>
                  </>
                ) : (
                  "Hover a month bar to view income and expense values"
                )}
              </div>
            </div>
            <div className="grid grid-cols-6 items-end gap-2">
            {monthBars.map((point) => {
              const expenseHeight = Math.max(10, Math.round((Number(point.expense) / maxBar) * 120));
              const incomeValue = Math.max(0, Number(point.income));
              const incomeHeight = Math.max(6, Math.round((incomeValue / maxBar) * 120));
              return (
                <div
                  key={point.month}
                  className="space-y-2 text-center text-xs text-slate-400"
                  onMouseEnter={() => setHoveredMonth({ month: point.month, income: Number(point.income), expense: Number(point.expense) })}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  <div className="mx-auto flex h-36 w-14 items-end gap-1">
                    <div className="w-6 rounded-t bg-rose-500/90 transition-all duration-200 hover:bg-rose-400" style={{ height: `${expenseHeight}px` }} />
                    <div className="w-6 rounded-t bg-emerald-500/90 transition-all duration-200 hover:bg-emerald-400" style={{ height: `${incomeHeight}px` }} />
                  </div>
                  <div className="font-medium">{point.month}</div>
                </div>
              );
            })}
          </div>
          </div>
        </Card>
        <Card className="motion-enter p-5 shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
          <h2 className="text-2xl font-bold text-slate-100">Budget Progress</h2>
          <p className="mb-4 text-lg text-slate-400">Track your spending against budget</p>
          <div className="space-y-4">
            {(budgets.length === 0
              ? [["No budgets yet", 0, 1]]
              : budgets.slice(0, 5).map((b) => [b.category.name, b.spent, b.amount] as [string, number, number])
            ).map((row) => {
              const [label, used, total] = row as [string, number, number];
              const pct = Math.round((used / Math.max(1, total)) * 100);
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-slate-400">
                      {currency(used)} / {currency(total)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-800">
                    <div className="h-3 rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card className="motion-enter p-5 shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
          <h2 className="text-2xl font-bold text-slate-100">Recent Transactions</h2>
          <p className="mb-3 text-lg text-slate-400">Your latest financial activity</p>
          <div className="space-y-3">
            {(transactions.length === 0
              ? [{ id: "none", note: "No recent activity", amount: 0, category: { name: "-" }, date: new Date().toISOString(), type: "EXPENSE" as const }]
              : transactions
            ).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-700 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-500">
                <div>
                  <p className="text-xl font-semibold text-slate-100">{item.note || item.type}</p>
                  <p className="text-sm text-slate-400">{new Date(item.date).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-semibold ${item.type === "INCOME" ? "text-emerald-400" : "text-rose-400"}`}>
                    {item.type === "INCOME" ? "+" : "-"}
                    {currency(Math.abs(Number(item.amount)))}
                  </p>
                  <p className="text-sm text-slate-400">{item.category?.name || "Uncategorized"}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="motion-enter p-5 shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
          <h2 className="text-2xl font-bold text-slate-100">Upcoming Bills</h2>
          <p className="mb-3 text-lg text-slate-400">Calendar view with upcoming due items</p>
          <div className="mb-3 rounded-xl border border-slate-700 p-3">
            <div className="mb-2 text-center text-base font-semibold text-slate-200">{calendarView.monthLabel}</div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {calendarView.cells.map((day, idx) => (
                <div
                  key={`${day ?? "x"}-${idx}`}
                  className={`rounded py-2 ${
                    day === null
                      ? "opacity-0"
                      : day === calendarView.today
                        ? "bg-sky-500 text-slate-950"
                        : "bg-slate-950/40 text-slate-300"
                  }`}
                >
                  {day ?? "-"}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {dueItems.map((row) => {
              const due = row.days === 0 ? "Add budgets to enable due reminders" : `Due in ${row.days} day${row.days === 1 ? "" : "s"}`;
              return (
              <div key={row.title} className="rounded-xl border border-slate-700 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-100">{row.title}</p>
                  <p className="text-base font-semibold text-slate-100">{currency(Number(row.amount))}</p>
                </div>
                <p className="text-sm text-slate-400">{due}</p>
              </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card className="motion-enter p-5 shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
          <h2 className="text-2xl font-bold text-slate-100">Overall Spending Insights</h2>
          <p className="mb-3 text-lg text-slate-400">Category breakdown and quick hints</p>
          <div className="space-y-3">
            {breakdown.slice(0, 5).map((item) => (
              <div key={item.categoryName}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.categoryName}</span>
                  <span className="text-slate-400">
                    {currency(item.amount)} ({Math.round(item.share * 100)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(5, Math.round(item.share * 100))}%` }} />
                </div>
              </div>
            ))}
            {breakdown.length === 0 && <p className="text-sm text-slate-500">No spending insights yet.</p>}
          </div>
        </Card>
        <Card className="motion-enter p-5 shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
          <h2 className="text-2xl font-bold text-slate-100">Shared Finances Overview</h2>
          <p className="mb-3 text-lg text-slate-400">Groups and collaboration snapshot</p>
          <div className="space-y-2">
            {sharedGroups.slice(0, 4).map((g) => (
              <div key={g.id} className="rounded-lg border border-slate-700 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-100">{g.name}</p>
                  <span className="text-xs text-slate-400">{g.members.length} members</span>
                </div>
              </div>
            ))}
            {sharedGroups.length === 0 && <p className="text-sm text-slate-500">No shared groups yet.</p>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
