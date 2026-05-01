"use client";

import { useEffect, useRef, useState } from "react";

import { ToggleFilterButton } from "./ToggleFilterButton";

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectDropdownProps {
  paramName: string;
  label: string;
  options: DropdownOption[];
  active: string[];
}

export function MultiSelectDropdown({
  paramName,
  label,
  options,
  active,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = active.length;

  useEffect(() => {
    if (!open) return;
    function handleDocumentClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
          count > 0
            ? "border-blue-300 bg-blue-50 text-blue-900 hover:border-blue-400"
            : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
        }`}
      >
        <span>{label}</span>
        {count > 0 && (
          <span className="rounded-full bg-blue-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-blue-900">
            {count}
          </span>
        )}
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-72 max-h-80 overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
          {options.length === 0 ? (
            <p className="p-3 text-xs text-neutral-500">No options.</p>
          ) : (
            <ul role="listbox" aria-label={label} className="space-y-0.5">
              {options.map((option) => {
                const isActive = active.includes(option.value);
                return (
                  <li key={option.value}>
                    <ToggleFilterButton
                      paramName={paramName}
                      value={option.value}
                      active={isActive}
                      className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-50"
                    >
                      <Checkbox checked={isActive} />
                      <span className="flex-1">
                        <span className="block font-medium text-neutral-800">{option.label}</span>
                        {option.sublabel && (
                          <span className="block text-[10px] text-neutral-500">
                            {option.sublabel}
                          </span>
                        )}
                      </span>
                    </ToggleFilterButton>
                  </li>
                );
              })}
            </ul>
          )}
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

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded border ${
        checked ? "border-blue-500 bg-blue-500 text-white" : "border-neutral-300 bg-white"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
          <path
            fill="currentColor"
            d="m4.5 7.94 4.69-4.69 1.06 1.06L4.5 10.06 1.25 6.81l1.06-1.06z"
          />
        </svg>
      )}
    </span>
  );
}
