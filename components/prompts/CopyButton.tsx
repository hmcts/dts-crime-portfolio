"use client";

import { useEffect, useRef, useState } from "react";

type CopyButtonVariant = "text" | "icon";

interface CopyButtonProps {
  value: string;
  /**
   * Display label in `text` variant, accessible label only in `icon`
   * variant. Defaults to "Copy" so the text-pill role keeps working
   * without callers having to set anything.
   */
  label?: string;
  className?: string;
  /**
   * `text` (default, backward-compatible) renders `label` inside the
   * button — used by the black "Copy" pill in the card footer. `icon`
   * renders an inline 16px clipboard SVG and keeps `label` as the
   * `aria-label` only — used by the small overlay button on the prompt
   * box where a 28×28 button can't fit a "Copy prompt" string.
   */
  variant?: CopyButtonVariant;
}

/**
 * Small client component that writes `value` to the clipboard via
 * `navigator.clipboard.writeText` and briefly flips its label to
 * "Copied" (text variant) or its glyph to a checkmark (icon variant).
 * Spec: `openspec/specs/prompts-library/spec.md` (Copy to clipboard).
 *
 * Click events are stopped from propagating so an enclosing `onClick`
 * handler (e.g. the clickable prompt body that opens the comments
 * modal) doesn't fire when the copy button is clicked.
 */
export function CopyButton({
  value,
  label = "Copy",
  className = "inline-flex items-center rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-400",
  variant = "text",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent the click from bubbling up to (e.g.) the clickable
    // prompt body that would otherwise open the comments modal.
    event.stopPropagation();
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

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={copied ? "Copied" : label}
        aria-live="polite"
        className={className}
      >
        {copied ? <CheckIcon /> : <ClipboardIcon />}
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-live="polite" className={className}>
      {copied ? "Copied" : label}
    </button>
  );
}

function ClipboardIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
