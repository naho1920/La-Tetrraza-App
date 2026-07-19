"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

/** Sección colapsable estándar: cerrada por defecto, se abre con un tap en el header. */
export function CollapsibleSection({
  title,
  badge,
  defaultOpen = false,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    setOpen((v) => {
      onOpenChange?.(!v);
      return !v;
    });
  }

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge !== undefined && badge !== "" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <div className="flex flex-col gap-3 border-t px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}
