import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border border-slate-900 bg-slate-900 text-white hover:bg-slate-700 hover:border-slate-700",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger:
    "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
  ghost:
    "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  iconLeft,
  iconRight,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {/* Icons are optional and keep the button API reusable across pages. */}
      {iconLeft ? <span aria-hidden="true">{iconLeft}</span> : null}
      <span>{children}</span>
      {iconRight ? <span aria-hidden="true">{iconRight}</span> : null}
    </button>
  );
}
