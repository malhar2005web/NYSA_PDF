import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from current dir and project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://gwfpwowtfqhjukamaicb.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3ZnB3b3d0ZnFoanVrYW1haWNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTUzMzM3NywiZXhwIjoyMTA3MTA5Mzc3fQ.EG1sf4rc-EZcIisf6h17N7y4sCUBHKyaOQ79nAbImN4";

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
export const BUCKET_NAME = "pharma-documents";

/**
 * Download file from Supabase storage into memory Buffer
 */
export async function downloadBufferFromStorage(storagePath) {
  const cleanPath = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(cleanPath);
  if (error) {
    throw new Error(`Failed to download from storage (${cleanPath}): ${error.message}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload memory Buffer to Supabase storage
 */
export async function uploadBufferToStorage(storagePath, buffer, contentType = "application/pdf") {
  const cleanPath = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(cleanPath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload to storage (${cleanPath}): ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(cleanPath);
  return {
    path: cleanPath,
    publicUrl: urlData.publicUrl,
  };
}
