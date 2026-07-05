import type { ReactNode } from "react";

import { RequireAdmin } from "@/features/auth/guards";
import { AdminNav } from "@/components/ui/admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <div className="flex min-h-full flex-1 flex-col">
        <AdminNav />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </RequireAdmin>
  );
}
