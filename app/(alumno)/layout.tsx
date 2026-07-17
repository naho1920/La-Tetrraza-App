import type { ReactNode } from "react";

import { TabBar } from "@/components/ui/tab-bar";
import { RequireApproved } from "@/features/auth/guards";
import { OfflineBanner } from "@/features/pwa/offline-banner";
import { InstallPrompt } from "@/features/pwa/install-prompt";
import { Toaster } from "@/components/ui/toast";

export default function AlumnoLayout({ children }: { children: ReactNode }) {
  return (
    <RequireApproved>
      <div className="flex min-h-full flex-1 flex-col">
        {/* TASK-072: padding superior igual al safe-area-inset-top para que el
            header no quede bajo el notch/Dynamic Island en modo standalone. */}
        <main className="flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
          {/* TASK-075: banner visible cuando la app está en modo offline. */}
          <OfflineBanner />
          {children}
        </main>
        <TabBar />
        {/* TASK-071: prompt de instalación PWA — se muestra sobre la tab bar. */}
        <InstallPrompt />
        {/* TASK-081: pila de toasts con auto-dismiss. */}
        <Toaster />
      </div>
    </RequireApproved>
  );
}
