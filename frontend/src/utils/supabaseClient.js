import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://gwfpwowtfqhjukamaicb.supabase.co";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3ZnB3b3d0ZnFoanVrYW1haWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MzMzNzcsImV4cCI6MjEwNzEwOTM3N30.k8fC3_fnJEFUcRiJzjDlHnNgE-uKMrCgZZjnZXBtBwY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const BUCKET_NAME = "pharma-documents";
