import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCS_BUCKET } from "@/lib/supabase/client";

/**
 * Keep-alive de Supabase.
 *
 * El plan free de Supabase pausa el proyecto tras ~7 días sin peticiones a su
 * API, y esta app lo usa SOLO para Storage: si nadie sube una foto, un PDF o un
 * comprobante durante una semana, el proyecto se pausa, su dominio deja de
 * resolver en DNS y TODAS las subidas/descargas se caen a la vez (pasó el
 * 2026-08-02 y el error que veía el usuario no apuntaba para nada a la causa).
 *
 * Este cron corre a diario, no semanal, a propósito: un ping semanal llegaría
 * justo en el límite de los 7 días y una demora o un fallo suelto bastarían
 * para que se pause igual. Diario deja 7x de margen y cuesta lo mismo (dos
 * peticiones mínimas al día).
 */

// Se pinchan las DOS APIs porque Supabase no documenta con precisión qué cuenta
// como "actividad": Storage es lo que realmente usamos, y PostgREST es el
// endpoint que su sistema de inactividad mira con más seguridad.
async function pingStorage(): Promise<string> {
  const { error } = await supabaseAdmin.storage.getBucket(DOCS_BUCKET);
  return error ? `error: ${error.message}` : "ok";
}

async function pingRest(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return "error: faltan variables de entorno de Supabase";
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
    });
    return res.ok ? "ok" : `error: HTTP ${res.status}`;
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Vercel Cron manda `Authorization: Bearer <CRON_SECRET>` cuando la variable
 * `CRON_SECRET` existe. Si está configurada se exige (comparación en tiempo
 * constante); si no, el endpoint sigue funcionando para que el keep-alive
 * proteja el proyecto desde el primer deploy — es de solo lectura, no muta
 * nada y no devuelve datos sensibles, así que el riesgo de dejarlo abierto es
 * mínimo y de todos modos está rate-limited.
 */
function autorizado(request: Request): boolean {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) return true;

  const recibido = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  if (excedeLimite(`cron-supabase:${ip}`, 5)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const [storage, rest] = await Promise.all([pingStorage(), pingRest()]);
  const ok = storage === "ok" && rest === "ok";

  // Un fallo acá significa que el almacenamiento está caído y que las subidas
  // NO van a funcionar: queda en los logs de Vercel para poder diagnosticarlo
  // sin esperar a que un alumno reporte el error.
  if (!ok) {
    console.error(`[cron/mantener-supabase] Supabase no responde bien — storage: ${storage}, rest: ${rest}`);
  }

  return NextResponse.json({ ok, storage, rest }, { status: ok ? 200 : 503 });
}
