"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  encodePreference,
  parseStoredPreference,
  resolveInitialOpen,
  SIDEBAR_STORAGE_KEY as STORAGE_KEY,
} from "@/lib/shell/sidebar-preference";

/**
 * Sidebar shell state for the authenticated app layout.
 *
 * Two defects forced this provider into existence:
 *
 *  1. PM: "should be able to slide hide the navigation side bar." Today
 *     the sidebar is permanently visible on `md`+ with no toggle. We
 *     need a controlled open/closed state that persists across
 *     navigations.
 *  2. PM: "the site seems responsive but when the browser is very small
 *     the side bar is lost." Today the sidebar is `hidden md:block`, so
 *     below 768px it's gone with no entry-point. We need a different
 *     positioning mode below 768px (overlay drawer) so it remains
 *     reachable from the hamburger.
 *
 * `isOverlayMode` lets the layout know which mode to render — overlay
 * (fixed, with backdrop) or push (in-flow, main-content margin reacts).
 * It's tracked with `matchMedia('(max-width: 767px)')` and a listener
 * so it reacts to viewport resize without a full reload.
 *
 * `isOpen` is read from / written to localStorage under `sidebar-open`
 * so the user's preference survives a page reload, per the spec for
 * this fix. On first paint we default to `true` for `lg`+ (≥1024px)
 * and `false` below; the stored preference, if present, wins. The
 * pure parsing / defaulting logic lives in
 * `lib/shell/sidebar-preference.ts` so it can be unit-tested without
 * a DOM.
 */

interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  isOverlayMode: boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredPreference(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // localStorage can throw in private browsing / quota cases — treat
    // as "no stored preference" rather than crashing the layout.
    return null;
  }
}

function computeIsLargeViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 1024px)").matches;
}

function computeOverlayMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  // SSR renders with `false` to avoid a hydration flicker; the effect
  // below reconciles to the real preference on mount.
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOverlayMode, setIsOverlayMode] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    const stored = readStoredPreference();
    setIsOpen(
      resolveInitialOpen({
        stored,
        isLargeViewport: computeIsLargeViewport(),
      }),
    );
    setIsOverlayMode(computeOverlayMode());
    setHydrated(true);

    const overlayQuery = window.matchMedia("(max-width: 767px)");
    const handler = (event: MediaQueryListEvent) => {
      setIsOverlayMode(event.matches);
    };
    overlayQuery.addEventListener("change", handler);
    return () => overlayQuery.removeEventListener("change", handler);
  }, []);

  // ESC closes the sidebar in overlay mode. Bound at the provider level
  // so the listener exists regardless of which child rendered the
  // drawer.
  useEffect(() => {
    if (!isOverlayMode || !isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOverlayMode, isOpen]);

  const persist = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, encodePreference(next));
    } catch {
      // Same defensive posture as the read path.
    }
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, [persist]);

  const close = useCallback(() => {
    setIsOpen(false);
    persist(false);
  }, [persist]);

  // Pre-hydration we expose `isOpen=false` to prevent the closed→open
  // flash on small viewports. Once hydrated, `isOpen` is the real
  // value.
  const value = useMemo<SidebarContextValue>(
    () => ({
      isOpen: hydrated ? isOpen : false,
      toggle,
      close,
      isOverlayMode,
    }),
    [hydrated, isOpen, toggle, close, isOverlayMode],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside <SidebarProvider>");
  }
  return ctx;
}

export { STORAGE_KEY as SIDEBAR_STORAGE_KEY };
