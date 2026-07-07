import type { ReactNode } from "react";

import { AdminTabBar } from "@/components/ui/admin-tab-bar";
import { RequireAdmin } from "@/features/auth/guards";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <div className="flex min-h-full flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">{children}</main>
        <AdminTabBar />
      </div>
    </RequireAdmin>
  );
}
