export default function Card({
  className = "",
  dashed = false,
  children,
}: {
  className?: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[10px] border bg-surface ${dashed ? "border-dashed" : ""} border-line ${className}`}
    >
      {children}
    </div>
  );
}
