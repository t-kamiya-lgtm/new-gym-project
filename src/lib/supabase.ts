import { createClient } from "@supabase/supabase-js";

// Server-side client using the service role key. Only import this from
// server code (API routes, server components, sync jobs) -- never expose
// the service role key to the browser.
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
