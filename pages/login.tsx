import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FormRow } from "@/components/ui/form-row";
import { SectionHeader } from "@/components/ui/section-header";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const value = email.trim().toLowerCase();
    if (!emailRegex.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, password }),
      });

      const payload = await res.json();
      if (!res.ok || payload.code !== "OK") {
        setError(payload?.error?.message || "Login failed.");
        return;
      }

      await router.replace("/transactions");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="app-container grid items-start gap-6 py-6 md:grid-cols-2">
        <Card className="p-6" as="div">
          <p className="inline-block rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-800">
            FinTrack
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900">Sign in to your finance workspace</h1>
          <p className="mt-3 text-sm text-slate-600">
            Securely access your accounts, categories, transactions, and analytics.
          </p>
        </Card>

        <Card className="p-6" as="div">
          <SectionHeader title="Login" />
          <form onSubmit={onSubmit}>
            <FormRow columnsClass="grid-cols-1">
            <label className="block text-sm text-slate-700">
              <span className="text-slate-700">Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={`field mt-1 ${error ? "field-error" : ""}`}
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span className="text-slate-700">Password</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={`field mt-1 ${error ? "field-error" : ""}`}
              />
            </label>
            </FormRow>

            {error ? <p className="text-error mt-3 text-sm">{error}</p> : null}

            <button type="submit" disabled={loading} className="btn btn-primary mt-5 w-full">
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="mt-4 text-sm text-slate-600">
              No account?{" "}
              <Link href="/signup" className="font-semibold text-teal-700 hover:text-teal-600">
                Create one
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
