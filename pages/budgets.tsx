import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { AppNav } from "@/components/layout/app-nav";
import { Card } from "@/components/ui/card";
import { FormRow } from "@/components/ui/form-row";
import { SectionHeader } from "@/components/ui/section-header";

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
    "btn btn-primary";

  if (status === "loading") {
    return <p className="app-container px-4 py-8 text-sm text-slate-600">Loading session...</p>;
  }
  if (status !== "authenticated" || !user) {
    return (
      <div className="app-container max-w-3xl px-4 py-12">
        <Card className="p-6" as="div">
          <h1 className="text-xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">You must be signed in to view budgets.</p>
          <button onClick={login} className={`${primaryButtonClass} mt-5`}>
            Sign in
          </button>
        </Card>
      </div>
    );
  }

  return (
    <main className="app-shell">
      <div className="app-container max-w-5xl">
        <h1 className="page-title mb-2">Budgets</h1>
        <AppNav />

        <Card className="mb-4 p-4">
          <SectionHeader title="Plan Budget" description="Set monthly spending caps by expense category." />
          <FormRow columnsClass="sm:grid-cols-3">
            <select
              className="field"
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
              className="field"
              placeholder="Budget amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <button className={primaryButtonClass} onClick={createBudget}>
              Add Budget
            </button>
          </FormRow>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
        </Card>

        <Card className="p-4">
          <SectionHeader title="Current Month" />
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
                  <button className="btn btn-danger text-xs" onClick={() => void deleteBudget(item.id)}>
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
        </Card>
      </div>
    </main>
  );
}
