import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell">
      <div className="app-container max-w-5xl">
        <div className="panel p-7">
          <h1 className="page-title">FinTrack</h1>
          <p className="page-subtitle">Personal finance tracking app</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-subtle">
              Login
            </Link>
            <Link href="/signup" className="btn btn-subtle">
              Sign up
            </Link>
            <Link href="/transactions" className="btn btn-primary">
              Open Dashboard
            </Link>
            <Link href="/budgets" className="btn btn-subtle">
              Budgets
            </Link>
            <Link href="/goals" className="btn btn-subtle">
              Goals
            </Link>
            <Link href="/shared-expenses" className="btn btn-subtle">
              Shared Expenses
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
