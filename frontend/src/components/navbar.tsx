"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/tracker";

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === "/login" || pathname === "/signup") return null;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) track({ event_type: "search", search_query: q });
    router.push(q ? `/courses?q=${encodeURIComponent(q)}` : "/courses");
  }

  const navLink = (href: string, label: string, dot?: boolean) => (
    <Link
      href={href}
      className={`text-sm flex items-center gap-1.5 no-underline hover:no-underline ${
        pathname === href ? "font-semibold text-gw-ink" : "font-medium text-gw-text"
      }`}
    >
      {label}
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-gw-agent-accent" />}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 h-[60px] bg-white/90 backdrop-blur border-b border-gw-border-soft">
      <div className="max-w-[1440px] mx-auto h-full px-6 flex items-center gap-7">
        <Link href="/" className="flex items-center gap-2 no-underline hover:no-underline">
          <span className="w-5 h-5 rounded-md bg-gw-primary inline-block" />
          <span className="text-base font-semibold tracking-tight text-gw-ink">Growise</span>
        </Link>

        <nav className="flex items-center gap-6">
          {navLink("/courses", "Catalog")}
          {user && navLink("/for-you", "For you", true)}
          {user?.role === "admin" && navLink("/admin/courses", "Admin")}
        </nav>

        <form onSubmit={handleSearch} className="flex-1 max-w-[320px] ml-3">
          <div className="h-[34px] border border-gw-border-soft rounded-[9px] bg-gw-surface-muted flex items-center px-3 gap-2 focus-within:border-gw-primary-border">
            <span className="w-[11px] h-[11px] rounded-full border-[1.5px] border-gw-text-placeholder" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses"
              className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-gw-text-placeholder"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-4">
          {loading ? null : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 bg-transparent border-0 cursor-pointer"
              >
                <span className="text-xs text-gw-text-faint hidden sm:inline">{user.email}</span>
                <span className="w-[30px] h-[30px] rounded-full bg-gw-primary-soft text-gw-primary-hover flex items-center justify-center text-[12.5px] font-semibold">
                  {initials(user.email)}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[42px] w-52 bg-white border border-gw-border-soft rounded-xl shadow-[0_10px_24px_-8px_rgba(28,30,42,0.2)] py-1.5 z-30">
                  <div className="px-3.5 py-2.5 border-b border-gw-border-hairline">
                    <div className="text-[13px] font-medium text-gw-ink truncate">{user.email}</div>
                    <div className="text-[11px] text-gw-text-faint capitalize mt-0.5">{user.role} account</div>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-gw-error bg-transparent border-0 cursor-pointer hover:bg-gw-surface-muted"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gw-text no-underline hover:no-underline">
                Log in
              </Link>
              <Link
                href="/signup"
                className="h-9 px-4 rounded-[10px] bg-gw-primary text-white text-sm font-medium flex items-center no-underline hover:no-underline hover:bg-gw-primary-hover"
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
