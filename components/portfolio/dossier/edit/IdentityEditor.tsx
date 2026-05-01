"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EditorShell } from "./EditorShell";
import { savePatch } from "./savePatch";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/enums/stage";
import type { ProjectDossier } from "@/lib/portfolio/dossier";

interface IdentityEditorProps {
  dossier: ProjectDossier;
  onClose: () => void;
}

/**
 * Inline editor for the identity section: name, description, stage. Spec:
 * openspec/specs/edit-studio/spec.md (Inline edit affordances by role).
 */
export function IdentityEditor({ dossier, onClose }: IdentityEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(dossier.name ?? "");
  const [description, setDescription] = useState(dossier.description ?? "");
  const [stage, setStage] = useState<Stage>(dossier.projectStage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await savePatch(dossier._id, {
        name: name.trim(),
        description: description.trim().length === 0 ? null : description,
        projectStage: stage,
      });
      router.refresh();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorShell
      title="Edit identity"
      busy={busy}
      error={error}
      onSave={handleSave}
      onCancel={onClose}
    >
      <label className="block text-xs font-medium text-neutral-700">
        Name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </label>
      <label className="block text-xs font-medium text-neutral-700">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </label>
      <label className="block text-xs font-medium text-neutral-700">
        Stage
        <select
          value={stage}
          onChange={(event) => setStage(event.target.value as Stage)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {STAGES.map((value) => (
            <option key={value} value={value}>
              {STAGE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
    </EditorShell>
  );
}
