"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { name: "대시보드", path: "/dashboard", icon: "📊" },
  { name: "상품 관리", path: "/products", icon: "📦" },
  { name: "주문 관리", path: "/orders", icon: "📮" },
  { name: "회원 관리", path: "/members", icon: "🧑‍🤝‍🧑" },
  { name: "재고 관리", path: "/stock", icon: "🏬" },
  { name: "로그", path: "/logs", icon: "📝" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="
        hidden md:flex w-64 shrink-0 flex-col
        bg-[var(--card-bg)] backdrop-blur-2xl
        border-r border-[var(--border)]
        shadow-[0_18px_45px_var(--shadow)]
        rounded-tr-3xl rounded-br-3xl
        m-3 mr-0 px-4 py-5
      "
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs tracking-[0.2em] text-[var(--text-soft)] uppercase">
            korual
          </div>
          <div className="text-lg font-semibold">Control Center</div>
        </div>
        <div className="w-8 h-8 rounded-2xl bg-black/80 dark:bg-white/90 flex items-center justify-center text-xs text-white dark:text-black">
          K
        </div>
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {menu.map((m) => {
          const active = pathname === m.path || (pathname === "/" && m.path === "/dashboard");
          return (
            <Link
              key={m.path}
              href={m.path}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl
                transition-all duration-150
                ${active
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-md"
                  : "text-[var(--text-soft)] hover:bg-white/40 dark:hover:bg-white/10"}
              `}
            >
              <span className="text-base">{m.icon}</span>
              <span>{m.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-[var(--border)] text-xs text-[var(--text-soft)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>API 연결 상태</span>
        </div>
        <div className="opacity-70">© 2025 KORUAL · All Systems Automated</div>
      </div>
    </aside>
  );
}
