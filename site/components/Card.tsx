export default function Card({
  id,
  className = "",
  dashed = false,
  children,
}: {
  id?: string;
  className?: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={`rounded-[10px] border bg-surface ${dashed ? "border-dashed" : ""} border-line ${className}`}
    >
      {children}
    </div>
  );
}
