"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { usePathname, useRouter } from "next/navigation";

const titleMap: Record<string, string> = {
  "/dashboard": "대시보드",
  "/products": "상품 관리",
  "/orders": "주문 관리",
  "/members": "회원 관리",
  "/stock": "재고 관리",
  "/logs": "로그 모니터링",
};

export default function Topbar() {
  const [lastSync, setLastSync] = useState<string>("-");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setLastSync(new Date().toLocaleString("ko-KR"));
  }, []);

  // 간단 로그인 체크 (localStorage korual_user)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("korual_user");
      if (!raw) return; // 실제 로그인 페이지 연동 시 여기서 router.push("/login")
    } catch {}
  }, []);

  const handleRefresh = () => {
    setLastSync(new Date().toLocaleString("ko-KR"));
    router.refresh();
  };

  const pageTitle = titleMap[pathname] ?? "KORUAL CONTROL";

  return (
    <header
      className="
        flex items-center justify-between
        h-16 px-4 md:px-6
        bg-[var(--card-bg)] backdrop-blur-2xl
        border-b border-[var(--border)]
        shadow-[0_12px_30px_var(--shadow)]
        m-3 mb-0 rounded-t-3xl md:rounded-tl-3xl md:rounded-tr-3xl
      "
    >
      <div className="flex items-center gap-3">
        {/* 모바일 햄버거 버튼 (필요하면 실제 동작 연결) */}
        <button className="md:hidden w-9 h-9 rounded-full border border-[var(--border)] flex flex-col items-center justify-center gap-[3px]">
          <span className="w-4 h-[1.5px] bg-[var(--text)]" />
          <span className="w-4 h-[1.5px] bg-[var(--text)]" />
        </button>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--text-soft)]">
            korual
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-semibold">{pageTitle}</span>
            <span className="text-[10px] px-2 py-[2px] rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              LIVE
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-soft)]">
            마지막 동기화: {lastSync}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleRefresh}
          className="hidden md:inline-flex text-xs px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-white/40 dark:hover:bg-white/10"
        >
          새로고침
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
