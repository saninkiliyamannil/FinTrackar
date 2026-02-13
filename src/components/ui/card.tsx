import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`} {...props} />;
}
