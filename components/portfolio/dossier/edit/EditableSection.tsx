"use client";

import { useState, type ReactNode } from "react";

import { PencilButton } from "./PencilButton";

interface EditableSectionProps {
  canEdit: boolean;
  pencilLabel: string;
  display: ReactNode;
  /** Renders the inline editor; the close callback returns to display mode. */
  renderEditor: (close: () => void) => ReactNode;
  /** Optional class names applied to the pencil container. */
  pencilClassName?: string;
}

/**
 * Toggles a dossier section between read-only display and an inline editor.
 * The pencil renders in the top-right of the section when `canEdit` is true.
 *
 * Spec: openspec/specs/edit-studio/spec.md (Inline edit affordances by role).
 */
export function EditableSection({
  canEdit,
  pencilLabel,
  display,
  renderEditor,
  pencilClassName,
}: EditableSectionProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <>{renderEditor(() => setEditing(false))}</>;
  }

  return (
    <div className="relative">
      {display}
      {canEdit && (
        <div className={pencilClassName ?? "absolute right-0 top-0"}>
          <PencilButton onClick={() => setEditing(true)} label={pencilLabel} />
        </div>
      )}
    </div>
  );
}
