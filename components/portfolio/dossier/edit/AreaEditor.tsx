"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EditorShell } from "./EditorShell";
import { savePatch } from "./savePatch";
import { useReferenceData } from "./useReferenceData";
import type { ProjectDossier } from "@/lib/portfolio/dossier";

interface AreaEditorProps {
  dossier: ProjectDossier;
  onClose: () => void;
}

export function AreaEditor({ dossier, onClose }: AreaEditorProps) {
  const router = useRouter();
  const reference = useReferenceData(true);
  const [groupId, setGroupId] = useState<string>(dossier.group?._id ?? "");
  const [directorateId, setDirectorateId] = useState<string>(dossier.directorate?._id ?? "");
  const [businessAreaIds, setBusinessAreaIds] = useState<string[]>(
    (dossier.businessAreas ?? []).map((area) => area._id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleBusinessArea(id: string): void {
    setBusinessAreaIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await savePatch(dossier._id, {
        groupId: groupId || null,
        directorateId: directorateId || null,
        businessAreaIds,
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
      title="Edit delivery area"
      busy={busy}
      error={error}
      onSave={handleSave}
      onCancel={onClose}
    >
      {reference.loading && <p className="text-xs text-neutral-500">Loading reference data…</p>}
      {reference.error && (
        <p className="text-xs text-red-700">Reference data unavailable: {reference.error}</p>
      )}
      {reference.data && (
        <>
          <label className="block text-xs font-medium text-neutral-700">
            Group
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {reference.data.groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-neutral-700">
            Directorate
            <select
              value={directorateId}
              onChange={(event) => setDirectorateId(event.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {reference.data.directorates.map((directorate) => (
                <option key={directorate._id} value={directorate._id}>
                  {directorate.name}
                  {directorate.group ? ` · ${directorate.group.name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="block text-xs font-medium text-neutral-700">
            <legend className="mb-1">Business areas</legend>
            <div className="flex flex-wrap gap-2">
              {reference.data.businessAreas.map((area) => {
                const checked = businessAreaIds.includes(area._id);
                return (
                  <label
                    key={area._id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                      checked
                        ? "border-blue-300 bg-blue-100 text-blue-900"
                        : "border-neutral-200 bg-white text-neutral-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBusinessArea(area._id)}
                      className="h-3 w-3"
                    />
                    {area.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </>
      )}
    </EditorShell>
  );
}
