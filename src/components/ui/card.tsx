import { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  className?: string;
  as?: "section" | "div" | "li";
}>;

export function Card({ children, className = "", as = "section" }: CardProps) {
  if (as === "div") {
    return <div className={`panel motion-enter ${className}`.trim()}>{children}</div>;
  }
  if (as === "li") {
    return <li className={`panel motion-enter ${className}`.trim()}>{children}</li>;
  }
  return <section className={`panel motion-enter ${className}`.trim()}>{children}</section>;
}
