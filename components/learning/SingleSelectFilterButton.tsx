"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { setSingleParam } from "@/lib/portfolio/url";

interface SingleSelectFilterButtonProps {
  paramName: string;
  /** Value to set when clicking; an empty string clears the param. */
  value: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}

/**
 * Single-select sibling of `components/portfolio/ToggleFilterButton.tsx`.
 * Selecting an already-active value clears it. Used by the Learning hub's
 * type pill row (`All` / `Videos` / `Playlists` / `Guides`).
 */
export function SingleSelectFilterButton({
  paramName,
  value,
  active,
  children,
  className = "",
  activeClassName = "",
}: SingleSelectFilterButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleClick = () => {
    const next = setSingleParam(
      new URLSearchParams(searchParams.toString()),
      paramName,
      active ? "" : value,
    );
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={`${className} ${active ? activeClassName : ""}`}
    >
      {children}
    </button>
  );
}
