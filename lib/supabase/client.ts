import { StorageClient } from "@supabase/storage-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * La app solo usa Storage de Supabase (nunca auth/postgrest/realtime), así
 * que instanciamos `@supabase/storage-js` directo en vez del cliente
 * universal `@supabase/supabase-js` — ahorra ~160 KB de JS que nunca se
 * ejecutaba. `supabase.storage.from(...)` sigue funcionando igual.
 */
export const supabase = {
  storage: new StorageClient(`${supabaseUrl}/storage/v1`, {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  }),
};

export const DOCS_BUCKET = "docslaterraza";
