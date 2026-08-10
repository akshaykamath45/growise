"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { NavSearch } from "@/components/nav-search";

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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (pathname === "/login" || pathname === "/signup") return null;

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
    <header className="sticky top-0 z-20 h-16 border-b border-gw-border-soft bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 no-underline hover:no-underline">
          <span className="inline-block h-5 w-5 rounded-md bg-gw-primary" />
          <span className="text-base font-semibold tracking-tight text-gw-ink">Growise</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5">
          {navLink("/courses", "Catalog")}
          {user && navLink("/for-you", "For you", true)}
        </nav>

        <div className="hidden flex-1 justify-center px-2 md:flex">
          <Suspense fallback={<div className="h-9 w-full max-w-[460px]" />}>
            <NavSearch />
          </Suspense>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          {loading ? null : user ? (
            <>
              {navLink("/my-learning", "My learning")}

              <div className="relative ml-1" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0"
                >
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gw-primary-soft text-[12.5px] font-semibold text-gw-primary-hover">
                    {initials(user.email)}
                  </span>
                  <span className="text-[10px] text-gw-text-placeholder" aria-hidden>
                    ▾
                  </span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[42px] z-30 w-56 overflow-hidden rounded-xl border border-gw-border-soft bg-white py-1.5 shadow-[0_16px_32px_-12px_rgba(28,30,42,0.22)]"
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
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="w-full cursor-pointer border-0 bg-transparent px-3.5 py-2.5 text-left text-sm text-gw-error hover:bg-gw-surface-muted"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-2 text-sm font-medium text-gw-text no-underline hover:no-underline hover:text-gw-ink"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="flex h-9 items-center rounded-[8px] bg-gw-primary-hover px-[18px] text-sm font-medium text-white no-underline hover:bg-gw-primary hover:no-underline"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
