"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { setSingleParam } from "@/lib/portfolio/url";

interface SetParamButtonProps {
  paramName: string;
  value: string;
  active: boolean;
  /** When true, clicking an already-active button clears the param. */
  toggleOffWhenActive?: boolean;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  ariaLabel?: string;
}

/**
 * Client button that updates a single-value URL param without a full
 * navigation. Used by the tool filter row (toggleable) and sort tabs
 * (mutually exclusive). Reuses `setSingleParam` from
 * `lib/portfolio/url.ts` so URL handling stays in one place.
 */
export function SetParamButton({
  paramName,
  value,
  active,
  toggleOffWhenActive = false,
  children,
  className = "",
  activeClassName = "",
  ariaLabel,
}: SetParamButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleClick = () => {
    const next = setSingleParam(
      new URLSearchParams(searchParams.toString()),
      paramName,
      active && toggleOffWhenActive ? "" : value,
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
      aria-label={ariaLabel}
      className={`${className} ${active ? activeClassName : ""}`}
    >
      {children}
    </button>
  );
}
