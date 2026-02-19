import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  note: string | null;
};

type TransactionsResponse = {
  items: Transaction[];
};

type BudgetItem = {
  id: string;
  amount: number;
  spent: number;
  usageRatio: number;
  category: { name: string };
};

type BudgetsResponse = {
  items: BudgetItem[];
};

type GoalItem = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
};

type GoalsResponse = {
  items: GoalItem[];
};

type DueItem = {
  id: string;
  dateIso: string;
  title: string;
  subtitle: string;
  amount: number;
  tone: "warn" | "info";
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dues, setDues] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const month = cursor.getUTCMonth() + 1;
        const year = cursor.getUTCFullYear();
        const [txRes, budgetRes, goalRes] = await Promise.all([
          fetch("/api/transactions?page=1&pageSize=500").then((r) => r.json() as Promise<Envelope<TransactionsResponse>>),
          fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json() as Promise<Envelope<BudgetsResponse>>),
          fetch("/api/goals").then((r) => r.json() as Promise<Envelope<GoalsResponse>>),
        ]);

        if (txRes.code === "OK" && txRes.data) {
          setTransactions(txRes.data.items);
        }

        const monthEndIso = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
        const budgetDues: DueItem[] =
          budgetRes.code === "OK" && budgetRes.data
            ? budgetRes.data.items.map((item) => ({
                id: `budget-${item.id}`,
                dateIso: monthEndIso,
                title: `${item.category.name} budget`,
                subtitle: `${Math.round(item.usageRatio * 100)}% used this month`,
                amount: Number(item.spent),
                tone: item.usageRatio >= 1 ? "warn" : "info",
              }))
            : [];

        const goalDues: DueItem[] =
          goalRes.code === "OK" && goalRes.data
            ? goalRes.data.items
                .filter((item) => item.targetDate && item.status !== "COMPLETED")
                .map((item) => ({
                  id: `goal-${item.id}`,
                  dateIso: String(item.targetDate).slice(0, 10),
                  title: item.name,
                  subtitle: "Goal target date",
                  amount: Number(item.targetAmount) - Number(item.currentAmount),
                  tone: "info" as const,
                }))
            : [];

        setDues([...budgetDues, ...goalDues].sort((a, b) => a.dateIso.localeCompare(b.dateIso)));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [cursor]);

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const monthName = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const monthTx = useMemo(
    () =>
      transactions.filter((tx) => {
        const d = new Date(tx.date);
        return d.getUTCFullYear() === year && d.getUTCMonth() === month;
      }),
    [month, transactions, year]
  );

  const monthSummary = useMemo(() => {
    const income = monthTx.filter((x) => x.type === "INCOME").reduce((sum, x) => sum + Number(x.amount), 0);
    const expense = monthTx.filter((x) => x.type === "EXPENSE").reduce((sum, x) => sum + Number(x.amount), 0);
    return { income, expense, balance: income - expense };
  }, [monthTx]);

  const dayTx = useMemo(() => monthTx.filter((tx) => tx.date.slice(0, 10) === selectedDate), [monthTx, selectedDate]);
  const monthDues = useMemo(
    () => dues.filter((item) => item.dateIso.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)),
    [dues, month, year]
  );
  const dayDues = useMemo(() => monthDues.filter((item) => item.dateIso === selectedDate), [monthDues, selectedDate]);
  const dueCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    monthDues.forEach((item) => {
      map.set(item.dateIso, (map.get(item.dateIso) || 0) + 1);
    });
    return map;
  }, [monthDues]);

  const cells = [
    ...Array.from({ length: firstWeekday }, (_, i) => ({ key: `pad-${i}`, day: 0 })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ key: `d-${i + 1}`, day: i + 1 })),
  ];

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-100">Financial Calendar</h1>
          <p className="text-lg text-slate-400">View your transactions by date</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-subtle">{monthName}</button>
          <button className="btn btn-subtle" onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}>
            &lt;
          </button>
          <button className="btn btn-subtle" onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}>
            &gt;
          </button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="p-4">
          <h2 className="text-3xl font-bold text-slate-100">Monthly Overview</h2>
          <p className="mb-3 text-lg text-slate-400">Financial activity for {monthName}</p>
          <div className="grid grid-cols-7 gap-2 text-center text-base text-slate-300">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2 font-semibold">
                {d}
              </div>
            ))}
            {cells.map(({ key, day }) => {
              const dayIso = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const dueCount = day ? dueCountByDate.get(dayIso) || 0 : 0;
              const selected = dayIso === selectedDate;
              return (
                <button
                  key={key}
                  disabled={!day}
                  onClick={() => day && setSelectedDate(dayIso)}
                  className={`h-24 rounded-lg border border-slate-700 text-left align-top text-sm ${
                    selected ? "bg-sky-900/40" : "bg-slate-950/30"
                  }`}
                >
                  <div className="flex items-start justify-between p-2">
                    <span>{day || ""}</span>
                    {dueCount > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-xs text-slate-950">{dueCount}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-3xl font-bold text-slate-100">Monthly Summary</h3>
            <p className="mb-3 text-lg text-slate-400">{monthName}</p>
            <div className="space-y-2 text-xl">
              <div className="flex justify-between">
                <span>Income</span>
                <span className="text-emerald-400">{currency(monthSummary.income)}</span>
              </div>
              <div className="flex justify-between">
                <span>Expenses</span>
                <span className="text-rose-400">{currency(monthSummary.expense)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2">
                <span>Balance</span>
                <span>{currency(monthSummary.balance)}</span>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-3xl font-bold text-slate-100">All Dues</h3>
            <p className="mb-3 text-lg text-slate-400">{monthName}</p>
            {loading ? (
              <div className="text-sm text-slate-500">Loading dues...</div>
            ) : monthDues.length === 0 ? (
              <div className="text-sm text-slate-500">No dues this month.</div>
            ) : (
              <div className="space-y-2">
                {monthDues.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{item.title}</span>
                      <span className={item.tone === "warn" ? "text-rose-400" : "text-sky-400"}>
                        {currency(Math.max(0, Number(item.amount)))}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(`${item.dateIso}T00:00:00.000Z`).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })} - {item.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="text-3xl font-bold text-slate-100">
              {new Date(`${selectedDate}T00:00:00.000Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}
            </h3>
            <p className="text-lg text-slate-400">
              {dayTx.length} transactions, {dayDues.length} dues
            </p>
            {loading ? (
              <div className="mt-8 text-sm text-slate-500">Loading...</div>
            ) : dayTx.length === 0 && dayDues.length === 0 ? (
              <div className="mt-8 text-center text-lg text-slate-500">No transactions or dues for this day</div>
            ) : (
              <div className="mt-4 space-y-2">
                {dayDues.map((item) => (
                  <div key={item.id} className="rounded-lg border border-amber-600/50 bg-amber-950/20 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{item.title}</span>
                      <span className={item.tone === "warn" ? "text-rose-400" : "text-sky-400"}>{currency(Math.max(0, Number(item.amount)))}</span>
                    </div>
                    <div className="text-xs text-slate-400">{item.subtitle}</div>
                  </div>
                ))}
                {dayTx.map((tx) => (
                  <div key={tx.id} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{tx.note || tx.type}</span>
                      <span className={tx.type === "INCOME" ? "text-emerald-400" : "text-rose-400"}>
                        {tx.type === "INCOME" ? "+" : "-"}
                        {currency(Math.abs(Number(tx.amount)))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
