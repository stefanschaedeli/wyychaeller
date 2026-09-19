import type { ReactNode } from "react";

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <section className="card mt-6 text-center">
      <h2>{title}</h2>
      <p className="mt-2 text-ink-muted">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
