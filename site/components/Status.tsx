import type { Status } from "@/data/types";

const styles: Record<Status, { dot: string; text: string; label: string }> = {
  open: { dot: "bg-signal glow", text: "text-signal", label: "Open" },
  rolling: { dot: "bg-signal glow", text: "text-signal", label: "Rolling" },
  soon: { dot: "bg-soon", text: "text-soon", label: "Opens soon" },
  closed: { dot: "bg-closed", text: "text-closed", label: "Closed" },
};

export function Dot({ status, className = "" }: { status: Status | "window"; className?: string }) {
  const cls = status === "window" ? "bg-dim" : styles[status].dot;
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls} ${className}`} aria-hidden />;
}

export function StatusLabel({ status, text }: { status: Status; text?: string }) {
  const s = styles[status];
  return (
    <span className={`flex items-center gap-2 text-[13px] ${s.text}`}>
      <Dot status={status} />
      {text ?? s.label}
    </span>
  );
}
