"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { NavSearch } from "@/components/nav-search";
import { useTheme } from "@/components/theme-provider";
import { BrandMark } from "@/components/brand-mark";

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

/** "taylor@example.com" -> "Taylor", so the menu has a human label without
 *  putting the full address in the bar itself. */
function displayName(email: string) {
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const signOutTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!menuOpen || signingOut) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, signingOut]);

  useEffect(() => {
    return () => {
      if (signOutTimer.current !== null) window.clearTimeout(signOutTimer.current);
    };
  }, []);

  function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    signOutTimer.current = window.setTimeout(() => {
      setMenuOpen(false);
      logout();
    }, 2000);
  }

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const navLink = (href: string, label: string, dot?: boolean) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-sm no-underline transition-colors hover:no-underline ${
          active
            ? "font-semibold text-gw-ink"
            : "font-medium text-gw-text-muted hover:bg-gw-surface-muted hover:text-gw-ink"
        }`}
      >
        {label}
        {dot && <span className="h-1.5 w-1.5 rounded-full bg-gw-agent-accent" />}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gw-border-soft bg-gw-surface/90 backdrop-blur md:h-16">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex h-14 items-center gap-2 md:h-16 md:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 no-underline hover:no-underline">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-tight text-gw-ink sm:text-base">Growise</span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-0.5 sm:flex">
            {navLink("/courses", "Catalog")}
            {user && navLink("/for-you", "For you", true)}
          </nav>

          <div className="hidden flex-1 justify-center px-2 md:flex">
            <Suspense fallback={<div className="h-9 w-full max-w-[460px]" />}>
              <NavSearch />
            </Suspense>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0 md:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] border border-gw-border-soft bg-gw-surface-muted text-gw-text-muted transition-colors hover:border-gw-primary-border hover:bg-gw-primary-soft hover:text-gw-primary-text"
          >
            {theme === "dark" ? (
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3" />
              </svg>
            ) : (
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                <path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />
              </svg>
            )}
          </button>

          {loading ? null : user ? (
            <>
              <span className="hidden sm:contents">{navLink("/my-learning", "My learning")}</span>

              <div className="relative ml-1" ref={menuRef}>
                <button
                  onClick={() => !signingOut && setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 disabled:cursor-default"
                  disabled={signingOut}
                >
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gw-primary-soft text-[12.5px] font-semibold text-gw-primary-text">
                    {initials(user.email)}
                  </span>
                  <span className="text-[10px] text-gw-text-placeholder" aria-hidden>
                    ▾
                  </span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[42px] z-30 w-56 overflow-hidden rounded-xl border border-gw-border-soft bg-gw-surface py-1.5 shadow-[0_16px_32px_-12px_rgba(28,30,42,0.22)]"
                  >
                    <div className="border-b border-gw-border-hairline px-3.5 py-2.5">
                      <div className="text-[13px] font-semibold text-gw-ink">
                        {displayName(user.email)}
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-gw-text-faint">
                        {user.email}
                      </div>
                    </div>
                    <Link
                      href="/my-learning"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3.5 py-2.5 text-sm text-gw-text no-underline hover:bg-gw-surface-muted hover:no-underline"
                    >
                      My learning
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin/courses"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3.5 py-2.5 text-sm text-gw-text no-underline hover:bg-gw-surface-muted hover:no-underline"
                      >
                        Course admin
                      </Link>
                    )}
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={signingOut}
                      aria-busy={signingOut}
                      className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3.5 py-2.5 text-left text-sm text-gw-error hover:bg-gw-surface-muted disabled:cursor-default disabled:bg-gw-surface-muted"
                    >
                      {signingOut && (
                        <span
                          aria-hidden
                          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gw-error/25 border-t-gw-error"
                        />
                      )}
                      <span aria-live="polite">{signingOut ? "Signing out…" : "Log out"}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            isAuthPage ? (
              pathname === "/login" ? (
                <Link
                  href="/signup"
                  className="flex h-9 items-center rounded-[8px] bg-gw-primary px-3.5 text-sm font-semibold text-white no-underline shadow-[0_6px_14px_-8px_rgb(90_71_220_/_70%)] transition-colors hover:bg-gw-primary-hover hover:no-underline md:px-[18px]"
                >
                  Sign up
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex h-9 items-center rounded-[8px] border border-gw-border-soft bg-gw-surface px-3 text-sm font-medium text-gw-ink no-underline transition-colors hover:border-gw-primary-border hover:bg-gw-surface-muted hover:text-gw-primary-text hover:no-underline md:px-3.5"
                >
                  Log in
                </Link>
              )
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-9 items-center rounded-[8px] border border-gw-border-soft bg-gw-surface px-3 text-sm font-medium text-gw-ink no-underline transition-colors hover:border-gw-primary-border hover:bg-gw-surface-muted hover:text-gw-primary-text hover:no-underline min-[390px]:flex md:px-3.5"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="flex h-9 items-center rounded-[8px] bg-gw-primary px-3.5 text-sm font-semibold text-white no-underline shadow-[0_6px_14px_-8px_rgb(90_71_220_/_70%)] transition-colors hover:bg-gw-primary-hover hover:no-underline md:px-[18px]"
                >
                  Sign up
                </Link>
              </>
            )
          )}
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <Suspense fallback={<div className="h-9 w-full" />}>
            <NavSearch />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
