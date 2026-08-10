import Link from "next/link";

export function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium no-underline hover:no-underline ${
        active
          ? "bg-gw-primary border border-gw-primary text-white"
          : "bg-gw-surface border border-gw-border-soft text-gw-text hover:border-gw-primary-border hover:text-gw-primary-text"
      }`}
    >
      {children}
    </Link>
  );
}
