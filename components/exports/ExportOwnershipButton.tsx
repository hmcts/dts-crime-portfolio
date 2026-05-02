"use client";

import { useEffect, useRef, useState } from "react";

import type { OwnershipProject, OwnershipRole } from "@/lib/exports/wordOwnership";

import { downloadBlob, todayStamp } from "./downloadBlob";

interface ExportOwnershipButtonProps {
  projects: OwnershipProject[];
}

const ROLE_OPTIONS: { value: OwnershipRole; label: string; description: string }[] = [
  {
    value: "deliveryOwner",
    label: "Delivery owner",
    description: "Group projects by delivery owner",
  },
  {
    value: "businessLead",
    label: "Business lead",
    description: "Group projects by business lead",
  },
  {
    value: "legalLead",
    label: "Legal lead",
    description: "Group projects by legal lead",
  },
];

/**
 * Word ownership report button. Opens a small dropdown to pick the role,
 * then dynamically imports `docx` plus the document builder so the heavy
 * libs stay out of the initial bundle.
 */
export function ExportOwnershipButton({ projects }: ExportOwnershipButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleDocumentClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function exportFor(role: OwnershipRole, label: string) {
    if (busy) return;
    setBusy(true);
    try {
      const [{ buildOwnershipDocument }, { Packer }] = await Promise.all([
        import("@/lib/exports/wordOwnership"),
        import("docx"),
      ]);
      const doc = buildOwnershipDocument(projects, role);
      const blob = await Packer.toBlob(doc);
      const slug = label.toLowerCase().replace(/\s+/g, "-");
      downloadBlob(blob, `ownership-${slug}-${todayStamp()}.docx`);
    } catch (error) {
      // TODO observability
      console.error("ownership export failed", error);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Generating…" : "Export Word ownership"}
        <Chevron open={open} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Ownership role"
          className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-md border border-neutral-200 bg-white p-1 text-xs shadow-lg"
        >
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              onClick={() => exportFor(option.value, option.label)}
              className="flex w-full flex-col items-start gap-0.5 rounded px-2 py-2 text-left text-neutral-800 hover:bg-neutral-50"
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-[10px] text-neutral-500">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        fill="currentColor"
        d="M6 8.25 1.5 3.75l1.06-1.06L6 6.13l3.44-3.44 1.06 1.06z"
      />
    </svg>
  );
}
