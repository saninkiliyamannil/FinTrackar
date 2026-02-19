import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type MonthlyPoint = {
  month: string;
  expense: number;
};

type MonthlyAnalyticsResponse = {
  series: MonthlyPoint[];
};

type CategoryBreakdownResponse = {
  items: { categoryName: string; amount: number; share: number }[];
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function ReportsPage() {
  const [monthly, setMonthly] = useState<MonthlyAnalyticsResponse | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [timeframe, setTimeframe] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [rangeText, setRangeText] = useState("Nov 01, 2025 - Nov 18, 2025");

  async function load(nextType?: "EXPENSE" | "INCOME", nextTimeframe?: "WEEKLY" | "MONTHLY" | "YEARLY") {
      setLoading(true);
      setError(null);
      try {
        const resolvedType = nextType ?? reportType;
        const resolvedTimeframe = nextTimeframe ?? timeframe;
        const months = resolvedTimeframe === "WEEKLY" ? 3 : resolvedTimeframe === "YEARLY" ? 12 : 6;
        const [mRes, cRes] = await Promise.all([
          fetch(`/api/analytics/monthly?months=${months}`).then((r) => r.json() as Promise<Envelope<MonthlyAnalyticsResponse>>),
          fetch(`/api/analytics/category-breakdown?months=${months}&type=${resolvedType}`).then(
            (r) => r.json() as Promise<Envelope<CategoryBreakdownResponse>>
          ),
        ]);
        if (mRes.code !== "OK" || !mRes.data) throw new Error(mRes.error?.message || "Failed monthly analytics");
        if (cRes.code !== "OK" || !cRes.data) throw new Error(cRes.error?.message || "Failed category analytics");
        setMonthly(mRes.data);
        setBreakdown(cRes.data);
      } catch (err) {
        setError((err as Error).message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportData() {
    const type = reportType;
    window.location.href = `/api/transactions/export.csv?type=${type}`;
  }

  const monthlyExpenseRows = (monthly?.series || []).filter((point) => Number(point.expense) > 0);

  return (
    <AppShell actions={<button className="btn btn-subtle" onClick={exportData}>Export Data</button>}>
      <h1 className="text-2xl font-bold text-slate-100">Reports</h1>
      <p className="mb-6 text-lg text-slate-400">Analyze your financial data and generate reports</p>
      {loading && <p className="mb-4 text-sm text-slate-400">Loading reports...</p>}
      {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}

      <Card className="mb-4 p-4">
        <h2 className="text-2xl font-bold text-slate-100">Generate Report</h2>
        <p className="mb-3 text-lg text-slate-400">Select parameters to create a custom financial report</p>
        <div className="grid gap-3 lg:grid-cols-3">
          <select className="field" value={reportType} onChange={(e) => setReportType(e.target.value as "EXPENSE" | "INCOME")}>
            <option value="EXPENSE">Expense Report</option>
            <option value="INCOME">Income Report</option>
          </select>
          <select className="field" value={timeframe} onChange={(e) => setTimeframe(e.target.value as "WEEKLY" | "MONTHLY" | "YEARLY")}>
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
            <option value="YEARLY">Yearly</option>
          </select>
          <input className="field" value={rangeText} onChange={(e) => setRangeText(e.target.value)} />
        </div>
        <button
          className="btn btn-primary mt-4"
          onClick={() => {
            void load(reportType, timeframe);
          }}
        >
          Generate Report
        </button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-2xl font-bold text-slate-100">Monthly Expenses</h3>
          <p className="text-lg text-slate-400">Expense trend over time</p>
          <div className="mt-4 space-y-2">
            {monthlyExpenseRows.map((point) => (
              <div key={point.month} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-sm">
                <span>{point.month}</span>
                <span className="text-rose-400">{currency(point.expense)}</span>
              </div>
            ))}
            {!monthlyExpenseRows.length && <p className="text-sm text-slate-500">No non-zero monthly expenses yet.</p>}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-2xl font-bold text-slate-100">Spending by Category</h3>
          <p className="text-lg text-slate-400">Distribution of expenses</p>
          <div className="mt-4 space-y-2">
            {(breakdown?.items || []).slice(0, 6).map((item) => (
              <div key={item.categoryName} className="rounded-lg border border-slate-700 px-3 py-2">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.categoryName}</span>
                  <span>{currency(item.amount)} ({Math.round(item.share * 100)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.max(5, Math.round(item.share * 100))}%` }} />
                </div>
              </div>
            ))}
            {!breakdown?.items?.length && <p className="text-sm text-slate-500">No category data yet.</p>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
