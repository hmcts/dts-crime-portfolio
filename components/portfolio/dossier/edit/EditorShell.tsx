"use client";

import type { ReactNode } from "react";

interface EditorShellProps {
  title: string;
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}

/**
 * Common inline-editor frame: title, body slot, error region, and the
 * Save/Cancel buttons. Each section's editor wires its own form state into
 * the body slot. Spec: openspec/specs/edit-studio/spec.md (Inline edit
 * affordances).
 */
export function EditorShell({ title, busy, error, onSave, onCancel, children }: EditorShellProps) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">{title}</p>
      <div className="mt-2 space-y-3">{children}</div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="inline-flex items-center rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
