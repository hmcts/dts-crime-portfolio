"use client";

import { useCallback, useMemo, useState } from "react";

import type { EditorAllowlistEntry } from "@/lib/admin/editors";

import { AllowlistTable } from "./AllowlistTable";
import { GrantEditAccessForm } from "./GrantEditAccessForm";
import { RecentChangesList, type ChangeEvent } from "./RecentChangesList";

export interface ProjectOption {
  id: string;
  name: string;
}

interface Props {
  initialEntries: EditorAllowlistEntry[];
  projects: ProjectOption[];
  currentAdminEmail: string;
}

/**
 * Top-level client component for the editor allowlist admin surface.
 * Holds the allowlist + recent-changes state and threads
 * mutate-handlers down to the form and the table. The recent-changes
 * footer is purely client-side state — it captures activity from the
 * current admin's session, not historical audit data — so it stays
 * empty until the admin makes their first change. The full audit log
 * lives in Sanity ChangeLog.
 *
 * Spec: openspec/specs/access-control/spec.md (Admin) and
 * decisions/2026-05-03-editor-allowlist-claude-design-brief.md.
 */
export function EditorAllowlistPage({
  initialEntries,
  projects,
  currentAdminEmail,
}: Props) {
  const [entries, setEntries] = useState<EditorAllowlistEntry[]>(initialEntries);
  const [recentChanges, setRecentChanges] = useState<ChangeEvent[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) map.set(project.id, project.name);
    return map;
  }, [projects]);

  const onGranted = useCallback(
    (entry: EditorAllowlistEntry) => {
      setEntries((prev) => [entry, ...prev]);
      setRecentChanges((prev) =>
        [
          {
            kind: "granted" as const,
            id: entry.id,
            email: entry.email,
            projectName: projectNameById.get(entry.projectId) ?? entry.projectId,
            actor: currentAdminEmail,
            at: entry.grantedAt,
          },
          ...prev,
        ].slice(0, 5),
      );
      setHighlightId(entry.id);
      window.setTimeout(() => setHighlightId(null), 2000);
    },
    [currentAdminEmail, projectNameById],
  );

  const onRemoved = useCallback(
    (removed: EditorAllowlistEntry) => {
      setEntries((prev) => prev.filter((row) => row.id !== removed.id));
      setRecentChanges((prev) =>
        [
          {
            kind: "revoked" as const,
            id: removed.id,
            email: removed.email,
            projectName:
              projectNameById.get(removed.projectId) ?? removed.projectId,
            actor: currentAdminEmail,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 5),
      );
    },
    [currentAdminEmail, projectNameById],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="border-b border-neutral-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Editor allowlist
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Grant or revoke per-project edit access. Editors can only mutate
          projects on their allowlist; admins can edit anything.
        </p>
      </header>

      <GrantEditAccessForm
        projects={projects}
        existingPairs={entries.map((e) => ({
          email: e.email,
          projectId: e.projectId,
        }))}
        onGranted={onGranted}
      />

      <AllowlistTable
        entries={entries}
        projectNameById={projectNameById}
        highlightId={highlightId}
        onRemoved={onRemoved}
      />

      <RecentChangesList changes={recentChanges} />
    </main>
  );
}
