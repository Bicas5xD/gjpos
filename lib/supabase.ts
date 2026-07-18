import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "As variáveis do Supabase não estão configuradas no .env.local"
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);