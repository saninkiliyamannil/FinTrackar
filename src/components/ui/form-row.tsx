import { PropsWithChildren } from "react";

type FormRowProps = PropsWithChildren<{
  className?: string;
  columnsClass?: string;
}>;

export function FormRow({ children, className = "", columnsClass = "sm:grid-cols-2" }: FormRowProps) {
  return <div className={`grid gap-2 ${columnsClass} ${className}`.trim()}>{children}</div>;
}
