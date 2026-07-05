import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCS_BUCKET } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const path = new URL(request.url).searchParams.get("path");
  if (!path || !path.startsWith("nutrition-plans/")) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }

  const ownerUid = path.split("/")[1];
  if (decoded.admin !== true && decoded.uid !== ownerUid) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage.from(DOCS_BUCKET).createSignedUrl(path, 300);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo generar el enlace." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
