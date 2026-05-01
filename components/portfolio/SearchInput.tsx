"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { setSingleParam } from "@/lib/portfolio/url";

const DEBOUNCE_MS = 300;

interface SearchInputProps {
  initial: string;
}

export function SearchInput({ initial }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  // Re-sync local state when the URL is changed externally (Clear filters,
  // back-button navigation).
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    if (value === initial) return;
    const handle = setTimeout(() => {
      const next = setSingleParam(new URLSearchParams(searchParams.toString()), "q", value.trim());
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [value, initial, pathname, router, searchParams]);

  return (
    <input
      type="search"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Search projects"
      aria-label="Search projects"
      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}
