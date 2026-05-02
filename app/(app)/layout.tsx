import { AppHeader } from "@/components/shell/AppHeader";
import { Sidebar } from "@/components/shell/Sidebar";
import { SidebarProvider } from "@/components/shell/SidebarContext";

import { AppShell } from "./AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <AppHeader />
        <AppShell sidebar={<Sidebar />}>{children}</AppShell>
      </div>
    </SidebarProvider>
  );
}
