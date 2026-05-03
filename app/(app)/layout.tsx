import { AppHeader } from "@/components/shell/AppHeader";
import { Sidebar } from "@/components/shell/Sidebar";
import { SidebarProvider } from "@/components/shell/SidebarContext";
import { resolveUser } from "@/lib/auth/resolver";

import { AppShell } from "./AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the user once at layout level so the sidebar can show
  // admin-only links without each surface having to redo the work.
  // Unauthorised callers don't reach here in normal flow — middleware
  // redirects them to /preview-auth — but if they do, we render the
  // shell as a non-admin (no admin links) and let downstream pages
  // decide what to do.
  const user = await resolveUser();
  const isAdmin = user.kind === "authorized" && user.isAdmin;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <AppHeader />
        <AppShell sidebar={<Sidebar isAdmin={isAdmin} />}>{children}</AppShell>
      </div>
    </SidebarProvider>
  );
}
