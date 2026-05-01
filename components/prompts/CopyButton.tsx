"use client";

import { useEffect, useRef, useState } from "react";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

/**
 * Small client component that writes `value` to the clipboard via
 * `navigator.clipboard.writeText` and briefly flips its label to
 * "Copied". Spec: `openspec/specs/prompts-library/spec.md` (Copy to
 * clipboard).
 */
export function CopyButton({
  value,
  label = "Copy",
  className = "inline-flex items-center rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-400",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in insecure contexts; ignore silently —
      // the button just won't flip its label.
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className={className}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
