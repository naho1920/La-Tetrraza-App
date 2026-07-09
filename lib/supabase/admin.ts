import { StorageClient } from "@supabase/storage-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Solo para uso en el servidor (Route Handlers): salta las RLS del bucket.
 * Mismo motivo que `lib/supabase/client.ts` para usar `@supabase/storage-js`
 * standalone en vez de `@supabase/supabase-js`.
 */
export const supabaseAdmin = {
  storage: new StorageClient(`${supabaseUrl}/storage/v1`, {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  }),
};
