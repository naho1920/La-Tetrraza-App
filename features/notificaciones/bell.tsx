"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { getNotificaciones } from "./api";

/** Campanita con contador para el header; lleva a la bandeja de notificaciones. */
export function NotificationsBell() {
  const { userDoc } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userDoc) return;
    let ignore = false;
    getNotificaciones(userDoc)
      .then((items) => {
        if (!ignore) setCount(items.length);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [userDoc]);

  if (!userDoc) return null;

  const href = userDoc.rol === "admin" ? "/notificaciones-admin" : "/notificaciones";

  return (
    <Link
      href={href}
      aria-label={count > 0 ? `Notificaciones (${count})` : "Notificaciones"}
      className="relative flex size-10 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10 transition-colors hover:bg-muted"
    >
      <Bell className="size-4.5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-background">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
