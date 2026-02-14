import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { AppNav } from "@/components/layout/app-nav";

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type Category = {
  id: string;
  name: string;
  type: string;
};

type BudgetItem = {
  id: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  category: { id: string; name: string; color: string | null; type: "INCOME" | "EXPENSE" };
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

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function BudgetsPage() {
  const { status, login, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetsResponse | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setError(null);
    const now = new Date();
    const query = new URLSearchParams({
      month: String(now.getUTCMonth() + 1),
      year: String(now.getUTCFullYear()),
    });
    try {
      const [catRes, budgetRes] = await Promise.all([
        fetch("/api/categories").then((res) => res.json() as Promise<Envelope<Category[]>>),
        fetch(`/api/budgets?${query.toString()}`).then((res) => res.json() as Promise<Envelope<BudgetsResponse>>),
      ]);
      if (catRes.code !== "OK" || !catRes.data) throw new Error(catRes.error?.message || "Failed categories");
      if (budgetRes.code !== "OK" || !budgetRes.data) throw new Error(budgetRes.error?.message || "Failed budgets");
      setCategories(catRes.data);
      setBudgets(budgetRes.data);
      if (!categoryId) {
        const first = catRes.data.find((category) => category.type.toUpperCase() === "EXPENSE");
        if (first) setCategoryId(first.id);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load budgets");
    }
  }, [categoryId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type.toUpperCase() === "EXPENSE"),
    [categories]
  );

  async function createBudget() {
    setError(null);
    const num = Number(amount);
    if (!categoryId) return setError("Select a category");
    if (!Number.isFinite(num) || num <= 0) return setError("Amount must be greater than 0");
    try {
      const now = new Date();
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          amount: num,
          month: now.getUTCMonth() + 1,
          year: now.getUTCFullYear(),
        }),
      });
      const payload = (await res.json()) as Envelope<BudgetItem>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Create failed");
      setAmount("");
      void load();
    } catch (err) {
      setError((err as Error).message || "Create budget failed");
    }
  }

  async function deleteBudget(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as Envelope<{ ok: boolean }>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Delete failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Delete budget failed");
    }
  }

  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

  if (status === "loading") {
    return <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">Loading session...</p>;
  }
  if (status !== "authenticated" || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">You must be signed in to view budgets.</p>
          <button onClick={login} className={`${primaryButtonClass} mt-5`}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Budgets</h1>
        <AppNav />

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Select Expense Category</option>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Budget amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={createBudget}>
              Add Budget
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-slate-600">
            Total Budget: {currency(budgets?.summary.totalBudget ?? 0)} | Spent:{" "}
            {currency(budgets?.summary.totalSpent ?? 0)} | Remaining: {currency(budgets?.summary.totalRemaining ?? 0)}
          </div>
          <div className="space-y-2">
            {(budgets?.items || []).length === 0 && <p className="text-sm text-slate-600">No budgets yet.</p>}
            {(budgets?.items || []).map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{item.category.name}</p>
                  <button className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700" onClick={() => void deleteBudget(item.id)}>
                    Delete
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Planned {currency(item.amount)} | Spent {currency(item.spent)} | Remaining {currency(item.remaining)}
                </p>
                <div className="mt-2 h-2 rounded bg-slate-100">
                  <div className={`h-2 rounded ${item.usageRatio > 1 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.max(4, item.usageRatio * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
