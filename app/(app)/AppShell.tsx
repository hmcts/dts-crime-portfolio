"use client";

import { type ReactNode } from "react";

import { useSidebar } from "@/components/shell/SidebarContext";

/**
 * Responsive frame for sidebar + main content.
 *
 *  - Overlay mode (mobile, <768px): main takes full width unconditionally;
 *    the sidebar floats above as a fixed drawer (positioning lives in the
 *    Sidebar component itself).
 *  - Push mode (md+): sidebar is in-flow. We render the sidebar in the
 *    flex row and the main content reclaims the width when the sidebar
 *    is closed (the Sidebar's `translateX(-100%)` plus a width transition
 *    on its container do the visual work).
 *
 * We keep the sidebar mounted in both modes so the slide animation has
 * something to animate to/from. In overlay mode it's `position: fixed`
 * out of flow; in push mode it's part of the flex row.
 */
export function AppShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const { isOpen, isOverlayMode } = useSidebar();

  if (isOverlayMode) {
    return (
      <div className="flex min-w-0 flex-1">
        {sidebar}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  // Push mode. The wrapping `<div>` collapses to width 0 when closed
  // so the main content reclaims the space; the sidebar itself
  // translates left so the collapse animates smoothly.
  return (
    <div className="flex min-w-0 flex-1">
      <div
        className={`overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none ${
          isOpen ? "w-56" : "w-0"
        }`}
      >
        {sidebar}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
