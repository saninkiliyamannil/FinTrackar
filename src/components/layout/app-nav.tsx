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
    <nav className="mb-5 flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const active = router.pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`btn ${
              active ? "btn-primary" : "btn-subtle"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
