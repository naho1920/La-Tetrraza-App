/**
 * Carga el catálogo completo de medallas (PRD §7.5) en Firestore.
 * Idempotente: usa el slug de cada medalla como id del doc, así correrlo
 * varias veces actualiza en vez de duplicar.
 *
 *   npm run seed-skills
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
  const { adminDb } = await import("../../lib/firebase/admin");
  const { CATALOGO_MEDALLAS } = await import("../../features/medallas/catalogo");

  let count = 0;
  for (const skill of CATALOGO_MEDALLAS) {
    await adminDb
      .collection("skills")
      .doc(skill.arte)
      .set({ ...skill, activa: true }, { merge: true });
    count += 1;
  }

  console.log(`✔ ${count} medallas cargadas/actualizadas en la colección "skills".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
