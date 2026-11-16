export default function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-16 ${className}`}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">{children}</div>
    </section>
  );
}
