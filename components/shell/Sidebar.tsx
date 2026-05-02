"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSidebar } from "./SidebarContext";

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

/**
 * Single sidebar component for both modes. The `isOverlayMode` flag
 * flips the positioning classes — `position: fixed` overlay drawer on
 * narrow viewports, in-flow `md`+ pushed-content sidebar otherwise.
 *
 * Slide animation is `transform: translateX` so it composites on the
 * GPU and doesn't reflow the rest of the page. `motion-reduce`
 * disables the transition for users who set
 * `prefers-reduced-motion: reduce`.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, isOverlayMode, close } = useSidebar();

  // Visual width is constant; only `translateX` and `position` differ
  // between modes. Below `md`, the drawer is wider (`w-64`) to give
  // touch targets room; on `md`+ the historical `w-56` is preserved
  // so the desktop layout is unchanged.
  const positionClasses = isOverlayMode
    ? "fixed inset-y-0 left-0 z-40 w-64 shadow-xl"
    : "h-full w-56 shrink-0";

  const transformClasses = isOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Backdrop — only rendered in overlay mode while open. Click
          dismisses the drawer. Pointer events through to underlying
          content are blocked by the backdrop covering the viewport. */}
      {isOverlayMode && isOpen && (
        <div
          data-testid="sidebar-backdrop"
          aria-hidden="true"
          onClick={close}
          className="fixed inset-0 z-30 bg-black/40"
        />
      )}
      <aside
        id="primary-sidebar"
        aria-label="Primary navigation"
        aria-hidden={isOverlayMode && !isOpen ? "true" : undefined}
        className={`${positionClasses} ${transformClasses} border-r border-neutral-200 bg-white transition-transform duration-200 ease-out motion-reduce:transition-none`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-neutral-200 p-4">
            <Link
              href="/portfolio"
              onClick={() => {
                if (isOverlayMode) close();
              }}
              className="block text-sm font-semibold tracking-tight"
            >
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
                      onClick={() => {
                        // Auto-close on mobile after a navigation, to
                        // match standard drawer behaviour.
                        if (isOverlayMode) close();
                      }}
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
                            active
                              ? "bg-white/15 text-white"
                              : "bg-neutral-100 text-neutral-500"
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
            <Link
              href="/studio"
              onClick={() => {
                if (isOverlayMode) close();
              }}
              className="text-neutral-700 hover:text-neutral-900"
            >
              Sanity Studio →
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
