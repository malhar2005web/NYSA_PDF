import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stampDocumentPDF } from "../services/pdfStamper.js";
import { getFallbackStore, saveFallbackStore } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, "../..");
const bmrSrc = path.join(rootDir, "bmr.pdf");
const bprSrc = path.join(rootDir, "bpr.pdf");

const bmrDestDir = path.join(__dirname, "../uploads/bmr");
const bprDestDir = path.join(__dirname, "../uploads/bpr");

export async function seedSampleDocuments() {
  try {
    const store = getFallbackStore();
    if (store.documents && store.documents.length > 0) {
      return; // Already has documents
    }

    if (!fs.existsSync(bmrDestDir)) fs.mkdirSync(bmrDestDir, { recursive: true });
    if (!fs.existsSync(bprDestDir)) fs.mkdirSync(bprDestDir, { recursive: true });

    // Seed BMR Document
    if (fs.existsSync(bmrSrc)) {
      const bmrIssuance = "ISS-2026-0208-001";
      const bmrStampedPath = path.join(bmrDestDir, `${bmrIssuance}_stamped_bmr.pdf`);
      await stampDocumentPDF({ inputPath: bmrSrc, outputPath: bmrStampedPath, issuanceNumber: bmrIssuance });

      const relPath = path.relative(path.join(__dirname, ".."), bmrStampedPath).replace(/\\/g, "/");

      const bmrDoc = {
        id: 1,
        issuance_number: bmrIssuance,
        document_name: "Paracetamol 500mg Batch Manufacturing Record",
        document_type: "BMR",
        batch_number: "BMR-2026-8829",
        mfg_date: "2026-08",
        expiry_date: "2028-08",
        issued_by: "Dr. Rajesh Sharma (QA Lead)",
        issued_date: new Date().toISOString().split("T")[0],
        received_by: "Amit Verma (Plant Officer)",
        file_path: relPath,
        stamped_file_path: relPath,
        original_filename: "bmr.pdf",
        file_size: fs.statSync(bmrSrc).size,
        page_count: 50,
        status: "ISSUED",
        print_count: 0,
        allowed_prints: 1,
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      };
      store.documents.push(bmrDoc);

      store.document_assignments.push({
        id: 1,
        document_id: 1,
        assigned_to: 2,
        assigned_by: 1,
        assigned_at: new Date().toISOString(),
      });
    }

    // Seed BPR Document
    if (fs.existsSync(bprSrc)) {
      const bprIssuance = "ISS-2026-0208-002";
      const bprStampedPath = path.join(bprDestDir, `${bprIssuance}_stamped_bpr.pdf`);
      await stampDocumentPDF({ inputPath: bprSrc, outputPath: bprStampedPath, issuanceNumber: bprIssuance });

      const relPath = path.relative(path.join(__dirname, ".."), bprStampedPath).replace(/\\/g, "/");

      const bprDoc = {
        id: 2,
        issuance_number: bprIssuance,
        document_name: "Amoxicillin 250mg Batch Packaging Record",
        document_type: "BPR",
        batch_number: "BPR-2026-9041",
        mfg_date: "2026-08",
        expiry_date: "2028-08",
        issued_by: "Dr. Rajesh Sharma (QA Lead)",
        issued_date: new Date().toISOString().split("T")[0],
        received_by: "Amit Verma (Plant Officer)",
        file_path: relPath,
        stamped_file_path: relPath,
        original_filename: "bpr.pdf",
        file_size: fs.statSync(bprSrc).size,
        page_count: 35,
        status: "ISSUED",
        print_count: 0,
        allowed_prints: 1,
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      };
      store.documents.push(bprDoc);

      store.document_assignments.push({
        id: 2,
        document_id: 2,
        assigned_to: 2,
        assigned_by: 1,
        assigned_at: new Date().toISOString(),
      });
    }

    // Initial Audit Logs
    store.audit_logs.push({
      id: 1,
      document_id: 1,
      user_id: 1,
      user_name: "Dr. Rajesh Sharma (QA Lead)",
      user_role: "QA_ADMIN",
      action: "Document Uploaded",
      document_name: "Paracetamol 500mg Batch Manufacturing Record",
      batch_number: "BMR-2026-8829",
      issuance_number: "ISS-2026-0208-001",
      details: "BMR PDF uploaded and auto-stamped with header ISS-2026-0208-001.",
      created_at: new Date().toISOString(),
    });

    saveFallbackStore();
  } catch (err) {
    console.error("Seed sample docs error:", err);
  }
}
