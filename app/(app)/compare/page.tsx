import Link from "next/link";

import { resolveUser } from "@/lib/auth/resolver";
import { getSanityClient } from "@/lib/sanity/client";
import {
  diffFromChangeLog,
  diffSnapshotAgainstCurrent,
  type ChangeLogRow,
  type CompareResult,
} from "@/lib/compare/diff";
import {
  deserialiseSnapshot,
  SNAPSHOT_QUERY,
  type SerialisedProject,
} from "@/lib/reporting-cuts/serialize";

export const dynamic = "force-dynamic";

interface CompareSearchParams {
  preset?: string;
  from?: string;
  to?: string;
  reportingCut?: string;
}

interface CompareCutOption {
  _id: string;
  name: string;
  createdAt: string | null;
}

const REPORTING_CUTS_QUERY = /* groq */ `
  *[_type == "reportingCut"] | order(createdAt desc) {
    _id,
    name,
    createdAt
  }
`;

const CHANGELOG_RANGE_QUERY = /* groq */ `
  *[_type == "changeLog"
    && documentType == "project"
    && timestamp >= $from
    && timestamp <= $to
  ] | order(timestamp asc) {
    documentId,
    documentType,
    field,
    before,
    after,
    userEmail,
    timestamp
  }
`;

const PROJECT_NAMES_QUERY = /* groq */ `
  *[_type == "project"]{ _id, name }
`;

const REPORTING_CUT_QUERY = /* groq */ `
  *[_type == "reportingCut" && _id == $id][0]{ _id, name, snapshot }
`;

interface PageProps {
  searchParams: Promise<CompareSearchParams>;
}

/**
 * Compare page — pick a date preset or a saved Reporting Cut and review the
 * diff. Sidebar entry is intentionally NOT added here; the user will wire it
 * up post-merge when the Sidebar component is no longer being edited by
 * other agents.
 *
 * Spec: openspec/specs/compare-mode/spec.md.
 */
export default async function ComparePage({ searchParams }: PageProps) {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Compare</h1>
        <p className="mt-2 text-sm text-neutral-600">
          You must be signed in to view portfolio comparisons.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const client = getSanityClient();

  const cuts = await client.fetch<CompareCutOption[]>(REPORTING_CUTS_QUERY);
  const cutOptions = cuts ?? [];

  const range = resolveDateRange(params);
  const reportingCutId = params.reportingCut?.trim() || null;

  let result: CompareResult | null = null;
  let mode: "range" | "snapshot" | null = null;
  let snapshotName: string | null = null;
  let errorMessage: string | null = null;

  if (reportingCutId) {
    mode = "snapshot";
    const cut = await client.fetch<{
      _id: string;
      name: string;
      snapshot: string;
    } | null>(REPORTING_CUT_QUERY, { id: reportingCutId });
    if (!cut) {
      errorMessage = "Selected Reporting Cut was not found.";
    } else {
      snapshotName = cut.name;
      const snapshot = deserialiseSnapshot(cut.snapshot);
      const current = await client.fetch<SerialisedProject[]>(SNAPSHOT_QUERY);
      result = diffSnapshotAgainstCurrent(snapshot, current ?? []);
    }
  } else if (range) {
    mode = "range";
    if (range.from === range.to) {
      result = { added: [], removed: [], changed: [] };
    } else {
      const [rows, projects] = await Promise.all([
        client.fetch<ChangeLogRow[]>(CHANGELOG_RANGE_QUERY, {
          from: `${range.from}T00:00:00.000Z`,
          to: `${range.to}T23:59:59.999Z`,
        }),
        client.fetch<{ _id: string; name: string }[]>(PROJECT_NAMES_QUERY),
      ]);
      const names = new Map<string, string>();
      for (const p of projects ?? []) names.set(p._id, p.name);
      result = diffFromChangeLog(rows ?? [], names);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="border-b border-neutral-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
        <p className="mt-1 text-sm text-neutral-600">
          See what changed in the portfolio over a window of time, or against
          a saved Reporting Cut.
        </p>
      </header>

      <PresetSelector
        params={params}
        cutOptions={cutOptions}
        currentRange={range}
      />

      {errorMessage && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      {!result && !errorMessage && (
        <p className="mt-6 text-sm text-neutral-600">
          Choose a preset, custom range, or saved Reporting Cut to see the
          diff.
        </p>
      )}

      {result && (
        <CompareResultView
          result={result}
          mode={mode!}
          range={range}
          snapshotName={snapshotName}
        />
      )}
    </main>
  );
}

interface DateRange {
  from: string;
  to: string;
  preset: string | null;
}

function resolveDateRange(params: CompareSearchParams): DateRange | null {
  if (params.from && params.to) {
    const fromOk = /^\d{4}-\d{2}-\d{2}$/.test(params.from);
    const toOk = /^\d{4}-\d{2}-\d{2}$/.test(params.to);
    if (!fromOk || !toOk) return null;
    return { from: params.from, to: params.to, preset: params.preset ?? "custom" };
  }
  if (!params.preset || params.preset === "custom") return null;
  const today = new Date();
  const to = formatDate(today);
  switch (params.preset) {
    case "last-30-days": {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - 30);
      return { from: formatDate(d), to, preset: "last-30-days" };
    }
    case "since-last-quarter": {
      const m = today.getUTCMonth();
      const currentQuarter = Math.floor(m / 3);
      const prevQuarter = currentQuarter - 1;
      const yearAdjust = prevQuarter < 0 ? -1 : 0;
      const normalisedQuarter = (prevQuarter + 4) % 4;
      const fromDate = new Date(
        Date.UTC(today.getUTCFullYear() + yearAdjust, normalisedQuarter * 3, 1),
      );
      return { from: formatDate(fromDate), to, preset: "since-last-quarter" };
    }
    case "since-january": {
      const fromDate = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      return { from: formatDate(fromDate), to, preset: "since-january" };
    }
    default:
      return null;
  }
}

function formatDate(d: Date): string {
  const yyyy = d.getUTCFullYear().toString().padStart(4, "0");
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function PresetSelector({
  params,
  cutOptions,
  currentRange,
}: {
  params: CompareSearchParams;
  cutOptions: CompareCutOption[];
  currentRange: DateRange | null;
}) {
  const presets: Array<{ slug: string; label: string }> = [
    { slug: "last-30-days", label: "Last 30 days" },
    { slug: "since-last-quarter", label: "Since last quarter" },
    { slug: "since-january", label: "Since January" },
  ];
  return (
    <form
      className="mt-6 grid gap-4 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-2"
      method="get"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-neutral-700">
          Preset
        </legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const active = params.preset === preset.slug && !params.reportingCut;
            return (
              <Link
                key={preset.slug}
                href={`/compare?preset=${preset.slug}`}
                className={
                  "rounded-md border px-3 py-1.5 text-xs font-medium " +
                  (active
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400")
                }
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-neutral-700">
          Custom range
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex flex-col text-xs text-neutral-600">
            <span>From</span>
            <input
              type="date"
              name="from"
              defaultValue={currentRange?.preset === "custom" ? currentRange.from : ""}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs text-neutral-600">
            <span>To</span>
            <input
              type="date"
              name="to"
              defaultValue={currentRange?.preset === "custom" ? currentRange.to : ""}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <input type="hidden" name="preset" value="custom" />
          <button
            type="submit"
            className="self-end rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-medium hover:border-neutral-400"
          >
            Apply
          </button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2 md:col-span-2">
        <legend className="text-sm font-medium text-neutral-700">
          Saved Reporting Cut
        </legend>
        {cutOptions.length === 0 ? (
          <p className="text-xs text-neutral-500">
            No Reporting Cuts have been captured yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cutOptions.map((cut) => {
              const active = params.reportingCut === cut._id;
              return (
                <Link
                  key={cut._id}
                  href={`/compare?reportingCut=${encodeURIComponent(cut._id)}`}
                  className={
                    "rounded-md border px-3 py-1.5 text-xs font-medium " +
                    (active
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400")
                  }
                >
                  {cut.name}
                  {cut.createdAt && (
                    <span className="ml-1 text-neutral-500">
                      ({cut.createdAt.slice(0, 10)})
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </fieldset>
    </form>
  );
}

function CompareResultView({
  result,
  mode,
  range,
  snapshotName,
}: {
  result: CompareResult;
  mode: "range" | "snapshot";
  range: DateRange | null;
  snapshotName: string | null;
}) {
  return (
    <section className="mt-8 flex flex-col gap-6">
      <header className="text-sm text-neutral-700">
        {mode === "snapshot" && snapshotName && (
          <p>
            Comparing the current portfolio against snapshot{" "}
            <strong>{snapshotName}</strong>.
          </p>
        )}
        {mode === "range" && range && (
          <p>
            Comparing portfolio between <strong>{range.from}</strong> and{" "}
            <strong>{range.to}</strong>.
          </p>
        )}
      </header>

      <DiffList
        title="Added"
        emptyMessage="No projects were added in this window."
        items={result.added}
      />

      <DiffList
        title="Removed"
        emptyMessage="No projects were removed in this window."
        items={result.removed}
      />

      <ChangedList changed={result.changed} />
    </section>
  );
}

function DiffList({
  title,
  emptyMessage,
  items,
}: {
  title: string;
  emptyMessage: string;
  items: { projectId: string; projectName: string }[];
}) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-800">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.projectId} className="text-neutral-800">
              {item.projectName}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ChangedList({
  changed,
}: {
  changed: CompareResult["changed"];
}) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-800">
        Changed ({changed.length})
      </h2>
      {changed.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">
          No projects had field changes in this window.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {changed.map((entry) => (
            <li
              key={entry.projectId}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-3"
            >
              <h3 className="text-sm font-medium text-neutral-800">
                {entry.projectName}
              </h3>
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-neutral-500">
                    <th className="w-1/4 py-1">Field</th>
                    <th className="w-1/3 py-1">Before</th>
                    <th className="w-1/3 py-1">After</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.fields.map((field) => (
                    <tr
                      key={field.field}
                      className="border-t border-neutral-200 align-top"
                    >
                      <td className="py-1 font-mono text-neutral-700">
                        {field.field}
                      </td>
                      <td className="py-1 text-neutral-700">
                        {formatValue(field.before)}
                      </td>
                      <td className="py-1 text-neutral-700">
                        {formatValue(field.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}
