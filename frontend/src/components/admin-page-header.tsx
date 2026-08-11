import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow = "Growise · Admin console",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gw-border-hairline pb-7">
      <div>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-gw-primary-text">{eyebrow}</div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-gw-ink">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gw-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
