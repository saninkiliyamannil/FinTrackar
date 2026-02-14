import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold">FinTrack</h1>
      <p className="mt-2 text-white/70">Personal finance tracking app</p>

      <div className="mt-6 flex gap-3">
        <Link href="/login" className="rounded bg-white/10 px-3 py-2 hover:bg-white/20">
          Login
        </Link>
        <Link href="/signup" className="rounded bg-blue-600 px-3 py-2 hover:bg-blue-500">
          Sign up
        </Link>
        <Link href="/transactions" className="rounded bg-emerald-600 px-3 py-2 hover:bg-emerald-500">
          Open Dashboard
        </Link>
        <Link href="/budgets" className="rounded bg-white/10 px-3 py-2 hover:bg-white/20">
          Budgets
        </Link>
        <Link href="/goals" className="rounded bg-white/10 px-3 py-2 hover:bg-white/20">
          Goals
        </Link>
        <Link href="/shared-expenses" className="rounded bg-white/10 px-3 py-2 hover:bg-white/20">
          Shared Expenses
        </Link>
      </div>
    </main>
  );
}
