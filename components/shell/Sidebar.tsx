"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/action-plan", label: "Action plan" },
  { href: "/learning", label: "Learning" },
  { href: "/events", label: "Events" },
  { href: "/prompts", label: "Prompts" },
  { href: "/profile", label: "Profile" },
  { href: "/help", label: "Help" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden border-r border-neutral-200 bg-white md:block md:w-56 md:shrink-0">
      <div className="flex h-full flex-col">
        <div className="border-b border-neutral-200 p-4">
          <Link href="/portfolio" className="block text-sm font-semibold tracking-tight">
            DTS Crime
          </Link>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Portfolio
          </p>
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition ${
                      active
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          active ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-neutral-200 p-3 text-[10px] text-neutral-500">
          <Link href="/studio" className="text-neutral-700 hover:text-neutral-900">
            Sanity Studio →
          </Link>
        </div>
      </div>
    </aside>
  );
}
