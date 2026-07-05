import type { ReactNode } from "react";

import { TabBar } from "@/components/ui/tab-bar";
import { RequireApproved } from "@/features/auth/guards";

export default function AlumnoLayout({ children }: { children: ReactNode }) {
  return (
    <RequireApproved>
      <div className="flex min-h-full flex-1 flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
        <TabBar />
      </div>
    </RequireApproved>
  );
}
