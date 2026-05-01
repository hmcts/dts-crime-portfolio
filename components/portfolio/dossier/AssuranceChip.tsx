import type { AssuranceVerdict } from "@/lib/portfolio/dossierFormat";

const TONE_CLASSES: Record<AssuranceVerdict["tone"], string> = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900",
  warn: "border-amber-400 bg-amber-50 text-amber-900",
  missing: "border-dashed border-neutral-300 bg-neutral-50 text-neutral-600",
};

interface AssuranceChipProps {
  label: string;
  verdict: AssuranceVerdict;
  detail?: string;
}

export function AssuranceChip({ label, verdict, detail }: AssuranceChipProps) {
  return (
    <span
      className={`inline-flex flex-col rounded-md border px-3 py-2 text-xs ${TONE_CLASSES[verdict.tone]}`}
    >
      <span className="flex items-center gap-1.5 font-semibold">
        {verdict.tone === "ok" && <Tick />}
        {label}
      </span>
      <span className="mt-0.5 text-[11px] font-medium">{verdict.label}</span>
      {detail && <span className="mt-0.5 text-[10px] opacity-80">{detail}</span>}
    </span>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3">
      <path
        fill="currentColor"
        d="m4.5 7.94 4.69-4.69 1.06 1.06L4.5 10.06 1.25 6.81l1.06-1.06z"
      />
    </svg>
  );
}
