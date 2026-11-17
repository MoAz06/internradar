import type { HTMLAttributes } from "react";

export default function Card({
  className = "",
  dashed = false,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { dashed?: boolean }) {
  return (
    <div
      {...rest}
      className={`rounded-[10px] border bg-surface ${dashed ? "border-dashed" : ""} border-line ${className}`}
    >
      {children}
    </div>
  );
}
