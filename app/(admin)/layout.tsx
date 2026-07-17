import type { ReactNode } from "react";

import { AdminTabBar } from "@/components/ui/admin-tab-bar";
import { RequireAdmin } from "@/features/auth/guards";
import { Toaster } from "@/components/ui/toast";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <div className="flex min-h-full flex-1 flex-col">
        {/* TASK-072: safe area superior para iPhone en modo standalone. */}
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pt-[env(safe-area-inset-top)]">
          {children}
        </main>
        <AdminTabBar />
        {/* TASK-081: toasts con auto-dismiss para confirmar acciones admin. */}
        <Toaster />
      </div>
    </RequireAdmin>
  );
}
