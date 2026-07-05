/**
 * Asigna el rol admin a una cuenta: custom claim de Firebase Auth + campo
 * `rol` en Firestore. Se corre una sola vez por admin, a mano:
 *
 *   npm run set-admin -- profesora@correo.com
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: npm run set-admin -- correo@ejemplo.com");
    process.exit(1);
  }

  const { adminAuth, adminDb } = await import("../../lib/firebase/admin");

  const userRecord = await adminAuth.getUserByEmail(email);
  await adminAuth.setCustomUserClaims(userRecord.uid, { admin: true });
  await adminDb
    .collection("users")
    .doc(userRecord.uid)
    .set({ rol: "admin" }, { merge: true });

  console.log(`✔ ${email} (${userRecord.uid}) ahora es admin.`);
  console.log("Debe cerrar sesión y volver a entrar para que el claim tome efecto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
