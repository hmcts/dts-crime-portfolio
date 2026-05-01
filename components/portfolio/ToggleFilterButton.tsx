"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { toggleMultiParam } from "@/lib/portfolio/url";

interface ToggleFilterButtonProps {
  paramName: string;
  value: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}

/**
 * Client toggle button that updates a multi-select URL param without a
 * full page navigation. Used by every filter row in /portfolio.
 */
export function ToggleFilterButton({
  paramName,
  value,
  active,
  children,
  className = "",
  activeClassName = "",
}: ToggleFilterButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleClick = () => {
    const next = toggleMultiParam(new URLSearchParams(searchParams.toString()), paramName, value);
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
