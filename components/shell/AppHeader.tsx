"use client";

import Link from "next/link";

import { useSidebar } from "./SidebarContext";

/**
 * Persistent app header. Shows on every authenticated page.
 *
 * Left:   hamburger toggle + DTS Crime / Portfolio wordmark.
 * Right:  reserved slot for user controls; today only sign-out.
 *
 * The hamburger has `aria-controls="primary-sidebar"`, an
 * `aria-expanded` reflecting the current state, and an `aria-label`
 * that flips between "Open navigation" / "Close navigation" so screen
 * readers announce the action, not the icon.
 */
export function AppHeader() {
  const { isOpen, toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-controls="primary-sidebar"
          aria-expanded={isOpen}
          data-testid="sidebar-toggle"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          {/* Inline hamburger SVG — three horizontal lines, 24x24,
              monochrome. No icon library, per the brief. */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <Link href="/portfolio" className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold tracking-tight text-neutral-900">DTS Crime</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Portfolio
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <form action="/preview-auth/sign-out" method="post">
          <button
            type="submit"
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
