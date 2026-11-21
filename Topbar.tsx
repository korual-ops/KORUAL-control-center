"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { usePathname, useRouter } from "next/navigation";

const menu = [
  { name: "대시보드", path: "/dashboard" },
  { name: "상품 관리", path: "/products" },
  { name: "주문 관리", path: "/orders" },
  { name: "회원 관리", path: "/members" },
  { name: "재고 관리", path: "/stock" },
  { name: "로그 모니터링", path: "/logs" },
];

export default function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshRequestedAt, setRefreshRequestedAt] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = menu.find((m) => m.path === pathname)?.name ?? "KORUAL CONTROL";

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const handleRefresh = () => {
    router.refresh();
    // This is the time a refresh was requested, not proof of API synchronization.
    setRefreshRequestedAt(new Date().toLocaleTimeString("ko-KR"));
  };

  return (
    <header className="relative z-30 m-3 mb-0 rounded-t-2xl border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-[var(--text)] md:px-6">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] md:hidden"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-controls="korual-mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" className="text-lg">{menuOpen ? "×" : "☰"}</span>
          </button>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-soft)]">KORUAL</div>
            <div className="truncate text-sm font-semibold md:text-base">{pageTitle}</div>
            <div className="text-[11px] text-[var(--text-soft)]" aria-live="polite">
              {refreshRequestedAt ? `화면 새로고침 요청: ${refreshRequestedAt}` : "운영자 화면"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-3 text-xs transition-colors hover:bg-[var(--border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            aria-label="현재 화면 새로고침"
          >새로고침</button>
          <ThemeToggle />
        </div>
      </div>
      {menuOpen && (
        <nav id="korual-mobile-navigation" aria-label="모바일 관리 메뉴"
          className="mt-3 grid gap-1 border-t border-[var(--border)] pt-3 md:hidden">
          {menu.map((item) => (
            <Link key={item.path} href={item.path}
              aria-current={pathname === item.path ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className={`flex min-h-11 items-center rounded-xl px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${pathname === item.path ? "bg-amber-500/10 font-semibold text-[var(--text)]" : "text-[var(--text-soft)] hover:bg-white/5"}`}
            >{item.name}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
