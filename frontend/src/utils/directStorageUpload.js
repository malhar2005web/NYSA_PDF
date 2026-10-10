import { supabase, BUCKET_NAME } from "./supabaseClient";

/**
 * Directly upload large PDF files (10MB - 50MB+) from the browser to Supabase Storage.
 * This completely bypasses Vercel's 4.5MB Serverless Function payload limit.
 *
 * @param {File} file - PDF File object from user file input
 * @param {string} folder - Destination folder in bucket ('originals' or 'temp')
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
export async function uploadPDFToSupabaseDirect(file, folder = "originals") {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  // Sanitize file name
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cleanPath = `${folder}/${Date.now()}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(cleanPath, file, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("Supabase direct upload failed:", error);
    throw new Error(`Cloud storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(cleanPath);

  return {
    path: cleanPath,
    publicUrl: urlData.publicUrl,
  };
}
