"use client";

interface PencilButtonProps {
  onClick: () => void;
  label: string;
}

/**
 * Small pencil affordance shown on dossier sections when the current user
 * is an Admin or an Editor for the open project. Clicking switches the
 * section into edit mode. See openspec/specs/edit-studio/spec.md (Inline
 * edit affordances by role).
 */
export function PencilButton({ onClick, label }: PencilButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M14.5 3.5a2.121 2.121 0 1 1 3 3L8 16l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  );
}
