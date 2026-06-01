"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { roleNavGroups } from "@/lib/brand";

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 grid gap-5">
      {roleNavGroups.map((group, groupIndex) => (
        <div key={group.label}>
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-korual-mist/60">
            {group.label}
          </div>
          <div className="grid gap-2">
            {group.items.map((item, itemIndex) => {
              const active =
                pathname === item.href ||
                (pathname === "/" && item.href === "/seller") ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              const number = groupIndex * 10 + itemIndex + 1;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition",
                    active
                      ? "border-korual-gold/35 bg-korual-gold/[0.12] text-white shadow-gold"
                      : "border-white/0 text-korual-mist hover:border-korual-gold/20 hover:bg-white/[0.06] hover:text-white"
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3">
                    <span className={active ? "text-korual-champagne" : "text-korual-mist/55"}>
                      {String(number).padStart(2, "0")}
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full transition",
                      active ? "bg-korual-gold" : "bg-korual-gold/0 group-hover:bg-korual-gold"
                    ].join(" ")}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
