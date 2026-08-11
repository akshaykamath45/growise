type LoadingStateProps = {
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

/** A calm, consistent loading state for route and access transitions. */
export function LoadingState({
  title = "Preparing your space",
  description = "Just a moment while we get everything ready.",
  compact = false,
  className = "",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center ${compact ? "py-6" : "min-h-[48vh] px-4 py-12"} ${className}`}
    >
      <div className={`flex items-center ${compact ? "gap-3" : "max-w-sm flex-col text-center"}`}>
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-gw-primary/15 border-t-gw-primary" />
          <span className="h-2.5 w-2.5 rounded-full bg-gw-agent shadow-[0_0_0_5px_var(--gw-agent-bg)]" />
        </span>
        <div className={compact ? "text-left" : "mt-4"}>
          <div className="text-sm font-semibold text-gw-ink">{title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-gw-text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}
