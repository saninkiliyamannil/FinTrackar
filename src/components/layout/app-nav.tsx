import Link from "next/link";
import { useRouter } from "next/router";

const links = [
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/goals", label: "Goals" },
  { href: "/shared-expenses", label: "Shared Expenses" },
];

export function AppNav() {
  const router = useRouter();

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const active = router.pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              active ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
