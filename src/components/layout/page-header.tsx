import type { ReactNode } from "react";

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 border-b border-ink pb-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}
