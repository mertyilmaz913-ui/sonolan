import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database as SupabaseDatabase } from '../types';

export type Database = SupabaseDatabase;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Server Components may throw on set; swallow safely.
          try {
            cookieStore.set({ name, value, ...(options ?? {}) });
          } catch {}
        },
        remove(name: string) {
          try {
            cookieStore.delete(name);
          } catch {}
        },
      },
    }
  );
}

export function createSupabaseServiceRoleClient() {
  // Only for backend tasks outside RLS (NOT for user-facing API).
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
