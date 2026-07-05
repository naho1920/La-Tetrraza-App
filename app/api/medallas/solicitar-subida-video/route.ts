import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCS_BUCKET } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const { uid } = await request.json();
  if (typeof uid !== "string") {
    return NextResponse.json({ error: "Falta el uid." }, { status: 400 });
  }
  if (decoded.admin !== true && decoded.uid !== uid) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const path = `achievement-videos/${uid}/${Date.now()}.mp4`;
  const { data, error } = await supabaseAdmin.storage.from(DOCS_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo preparar la subida." }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token, signedUrl: data.signedUrl });
}
