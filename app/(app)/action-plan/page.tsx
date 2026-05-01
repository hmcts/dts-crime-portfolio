import { ActionDetailPane } from "@/components/actionPlan/ActionDetail";
import { ActionList } from "@/components/actionPlan/ActionList";
import { StrandSummaries } from "@/components/actionPlan/StrandSummary";
import { resolveUser } from "@/lib/auth/resolver";
import {
  fetchActionByNumber,
  fetchActions,
  fetchLinkedProjects,
  groupActionsByStrand,
  summariseByStrand,
} from "@/lib/actionPlan/list";

export const dynamic = "force-dynamic";

interface ActionPlanPageProps {
  searchParams: Promise<{ action?: string | string[] }>;
}

export default async function ActionPlanPage({ searchParams }: ActionPlanPageProps) {
  const { action: actionParam } = await searchParams;
  const requestedActionNo = Array.isArray(actionParam) ? actionParam[0] : actionParam;

  const user = await resolveUser();
  const isAdmin = user.kind === "authorized" && user.isAdmin;

  const actions = await fetchActions();
  if (actions.length === 0) {
    return <EmptyActionPlan />;
  }

  const summaries = summariseByStrand(actions);
  const grouped = groupActionsByStrand(actions);

  const fallbackActionNo = actions[0]!.actionNo;
  const selectedActionNo =
    requestedActionNo && actions.some((action) => action.actionNo === requestedActionNo)
      ? requestedActionNo
      : fallbackActionNo;

  const [selected, linkedProjects] = await Promise.all([
    fetchActionByNumber(selectedActionNo),
    fetchActionByNumber(selectedActionNo).then((action) =>
      action ? fetchLinkedProjects(action._id) : [],
    ),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="border-b border-neutral-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Action plan</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Delivery tracker for the published AI strategy. Status pills are RAG-style.
        </p>
      </header>
      <section className="mt-4">
        <StrandSummaries summaries={summaries} />
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <ActionList groupedActions={grouped} selectedActionNo={selectedActionNo} />
        </aside>
        <div className="min-w-0">
          {selected ? (
            <ActionDetailPane
              action={selected}
              linkedProjects={linkedProjects}
              isAdmin={isAdmin}
            />
          ) : (
            <p className="text-sm text-neutral-500">Action not found.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyActionPlan() {
  return (
    <main className="mx-auto max-w-3xl p-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Action plan</h1>
      <p className="mt-3 text-sm text-neutral-600">
        No actions have been added yet. Create them in the Sanity Studio.
      </p>
    </main>
  );
}
