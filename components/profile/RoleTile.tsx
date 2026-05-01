import { PROFILE_ROLE_LABELS, type ProfileRole } from "@/lib/profile/list";

interface RoleTileProps {
  role: ProfileRole;
  count: number;
}

export function RoleTile({ role, count }: RoleTileProps) {
  return (
    <a
      href={`#${role}`}
      className="flex flex-col rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {PROFILE_ROLE_LABELS[role]}
      </span>
      <span className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">{count}</span>
      <span className="mt-1 text-xs text-neutral-500">
        {count === 1 ? "project" : "projects"}
      </span>
    </a>
  );
}
