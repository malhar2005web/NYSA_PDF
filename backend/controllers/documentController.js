import { query, getFallbackStore, saveFallbackStore } from "../db/index.js";
import { stampDocumentPDF } from "../services/pdfStamper.js";
import { recordAuditLog } from "../services/auditService.js";
import { downloadBufferFromStorage, uploadBufferToStorage } from "../services/storageService.js";
import fs from "fs";
import path from "path";

/**
 * Generate Auto-Incrementing Issuance Number in format: ISS-YYYY-MMDD-XXX
 * Auto-increments 001, 002, 003... based on documents issued today.
 */
async function generateIssuanceNumber() {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const datePrefix = `ISS-${year}-${month}${day}`;

  try {
    const res = await query(
      "SELECT issuance_number FROM documents WHERE issuance_number LIKE $1 ORDER BY id DESC LIMIT 50",
      [`${datePrefix}%`]
    );

    let nextSeq = 1;
    if (res.rows && res.rows.length > 0) {
      for (const row of res.rows) {
        const parts = row.issuance_number.split("-");
        if (parts.length >= 4) {
          const num = parseInt(parts[3], 10);
          if (!isNaN(num) && num >= nextSeq) {
            nextSeq = num + 1;
          }
        }
      }
    }
    return `${datePrefix}-${String(nextSeq).padStart(3, '0')}`;
  } catch (e) {
    const store = getFallbackStore();
    const docsToday = (store.documents || []).filter(d => d.issuance_number && d.issuance_number.startsWith(datePrefix));
    let nextSeq = docsToday.length + 1;
    return `${datePrefix}-${String(nextSeq).padStart(3, '0')}`;
  }
}

/**
 * Preview Uploaded Document (Supports both Supabase Direct Storage and Local File)
 */
export async function previewDocument(req, res) {
  try {
    const {
      storage_path,
      document_type,
      batch_number,
      mfg_date,
      expiry_date,
      issued_by,
      issued_date,
      custom_issuance_number,
    } = req.body;

    const issuance_number = custom_issuance_number || (await generateIssuanceNumber());

    // 1. Supabase Cloud Storage path
    if (storage_path) {
      return res.status(200).json({
        success: true,
        previewData: {
          storage_path,
          issuance_number,
          document_type,
          batch_number,
          mfg_date,
          expiry_date,
          issued_by,
          issued_date,
        },
      });
    }

    // 2. Traditional Local File upload fallback
    if (req.file) {
      const tempFilename = `preview_${Date.now()}_${req.file.originalname}`;
      const tempPath = path.join("uploads", "temp_previews", tempFilename);
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      fs.copyFileSync(req.file.path, tempPath);
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      return res.status(200).json({
        success: true,
        previewData: {
          temp_original_path: tempPath.replace(/\\/g, "/"),
          issuance_number,
          document_type,
          batch_number,
          mfg_date,
          expiry_date,
          issued_by,
          issued_date,
        },
      });
    }

    return res.status(400).json({ success: false, message: "No PDF file or storage path provided" });
  } catch (error) {
    console.error("Preview Document Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Confirm Issuance & Generate Final Stamped PDF (Layer 3)
 */
export async function confirmDocumentIssuance(req, res) {
  try {
    const {
      storage_path,
      temp_original_path,
      issuance_number: customIssuanceNum,
      document_type,
      document_name,
      batch_number,
      mfg_date,
      expiry_date,
      issued_by,
      issued_date,
      assigned_to_user_id,
      received_by,
      file_mappings,
      custom_fields,
      requisition_id,
    } = req.body;

    const issuance_number = customIssuanceNum || (await generateIssuanceNumber());
    let stampResult = null;
    let finalPublicFilePath = "";
    let finalCleanFilePath = "";
    let fileSizeBytes = 0;

    // A. CLOUD SUPABASE STORAGE FLOW (Runs on Vercel)
    if (storage_path) {
      const originalBuffer = await downloadBufferFromStorage(storage_path);
      stampResult = await stampDocumentPDF({
        pdfBuffer: originalBuffer,
        issuanceNumber: issuance_number,
        documentType: document_type,
        batchNumber: batch_number,
        mfgDate: mfg_date,
        expiryDate: expiry_date,
        issuedBy: issued_by,
        issuedDate: issued_date,
        receivedBy: received_by,
        fileMappings: file_mappings,
      });

      const subDir = (document_type || "BMR").toLowerCase();
      const stampedStoragePath = `stamped/${subDir}/${issuance_number}_stamped.pdf`;
      const uploadResult = await uploadBufferToStorage(stampedStoragePath, stampResult.stampedBuffer);

      finalPublicFilePath = uploadResult.publicUrl;
      finalCleanFilePath = storage_path;
      fileSizeBytes = stampResult.stampedBuffer.length;
    } 
    // B. LOCAL DISK FLOW (Runs on Local Dev Machine)
    else if (temp_original_path) {
      const absoluteInputPath = path.resolve(temp_original_path);
      const subDir = (document_type || "BMR").toLowerCase();
      const finalFilename = `${issuance_number}_${Date.now()}.pdf`;
      const relativePath = path.join("uploads", subDir, finalFilename).replace(/\\/g, "/");
      const absoluteOutputPath = path.resolve(relativePath);

      const origDir = path.join("uploads", "originals");
      if (!fs.existsSync(origDir)) fs.mkdirSync(origDir, { recursive: true });
      const cleanOriginalRelativePath = path.join(origDir, `clean_${issuance_number}.pdf`).replace(/\\/g, "/");
      fs.copyFileSync(absoluteInputPath, path.resolve(cleanOriginalRelativePath));

      stampResult = await stampDocumentPDF({
        inputPath: absoluteInputPath,
        outputPath: absoluteOutputPath,
        issuanceNumber: issuance_number,
        documentType: document_type,
        batchNumber: batch_number,
        mfgDate: mfg_date,
        expiryDate: expiry_date,
        issuedBy: issued_by,
        issuedDate: issued_date,
        receivedBy: received_by,
        fileMappings: file_mappings,
      });

      finalPublicFilePath = relativePath;
      finalCleanFilePath = cleanOriginalRelativePath;
      fileSizeBytes = fs.statSync(absoluteOutputPath).size;
      try { fs.unlinkSync(absoluteInputPath); } catch (e) {}
    } else {
      return res.status(400).json({ success: false, message: "Missing document source path" });
    }

    let newDoc = null;
    let assignment = null;

    try {
      const docRes = await query(
        `INSERT INTO documents (
          issuance_number, document_type, document_name, batch_number,
          mfg_date, expiry_date, page_count, file_path,
          stamped_file_path, file_size, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING_PRINT')
        RETURNING *`,
        [
          issuance_number,
          document_type || "BMR",
          document_name || `${document_type || "BMR"} Batch ${batch_number}`,
          batch_number,
          mfg_date,
          expiry_date,
          stampResult.pageCount || 1,
          finalCleanFilePath,
          finalPublicFilePath,
          fileSizeBytes,
          req.user.id,
        ]
      );

      newDoc = { ...docRes.rows[0], custom_fields: custom_fields || [] };
      const targetAssignedUserId = assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : 2;
      const assignRes = await query(
        `INSERT INTO document_assignments (document_id, assigned_to, assigned_by)
         VALUES ($1, $2, $3) RETURNING *`,
        [newDoc.id, targetAssignedUserId, req.user.id]
      );
      assignment = assignRes.rows[0];
    } catch (dbErr) {
      console.warn("PostgreSQL DB insert failed, writing to fallback local store:", dbErr.message);
      const store = getFallbackStore();

      newDoc = {
        id: store.documents.length + 1,
        issuance_number,
        document_type: document_type || "BMR",
        document_name: document_name || `${document_type || "BMR"} Batch ${batch_number}`,
        batch_number,
        mfg_date,
        expiry_date,
        page_count: stampResult.pageCount || 1,
        file_path: finalCleanFilePath,
        stamped_file_path: finalPublicFilePath,
        file_size: fileSizeBytes,
        print_count: 0,
        allowed_prints: 1,
        status: "PENDING_PRINT",
        uploaded_by: req.user.id,
        created_at: new Date().toISOString(),
        custom_fields: custom_fields || [],
      };
      store.documents.unshift(newDoc);

      const targetAssignedUserId = assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : 2;
      assignment = {
        id: store.document_assignments ? store.document_assignments.length + 1 : 1,
        document_id: newDoc.id,
        assigned_to: targetAssignedUserId,
        assigned_by: req.user.id,
        status: "ISSUED",
        created_at: new Date().toISOString(),
      };
      if (!store.document_assignments) store.document_assignments = [];
      store.document_assignments.unshift(assignment);
      saveFallbackStore();
    }

    // UPDATE REQUISITION STATUS TO ISSUED FOR THIS BATCH & REQUISITION ID
    try {
      if (requisition_id) {
        await query(`UPDATE requisitions SET status = 'ISSUED', updated_at = NOW() WHERE id = $1`, [requisition_id]);
      }
      if (batch_number) {
        await query(`UPDATE requisitions SET status = 'ISSUED', updated_at = NOW() WHERE LOWER(batch_number) = LOWER($1) AND status = 'PENDING'`, [batch_number]);
      }
    } catch (reqErr) {
      console.warn("Updating PostgreSQL requisition error:", reqErr.message);
    }

    // ALWAYS UPDATE LOCAL FALLBACK STORE AS WELL
    try {
      const store = getFallbackStore();
      if (store && store.requisitions) {
        store.requisitions.forEach(r => {
          const reqIdStr = String(r.id).replace("#", "");
          const targetIdStr = String(requisition_id || "").replace("#", "");
          if ((requisition_id && reqIdStr === targetIdStr) ||
              (batch_number && String(r.batch_number).trim().toLowerCase() === String(batch_number).trim().toLowerCase() && r.status === "PENDING")) {
            r.status = "ISSUED";
            r.fulfilled_at = new Date().toISOString();
          }
        });
        saveFallbackStore();
      }
    } catch (fallbackErr) {
      console.error("Fallback store requisition update error:", fallbackErr);
    }

    await recordAuditLog({
      documentId: newDoc ? newDoc.id : null,
      userId: req.user.id,
      userRole: req.user.role,
      action: "Document Uploaded",
      details: `Issued ${document_type} ${issuance_number} for Batch ${batch_number} (Received by ${received_by || 'Production'}).`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Document issued successfully and sent to Production.",
      issuance_number,
      document: newDoc,
      assignment,
      publicUrl: finalPublicFilePath,
    });
  } catch (error) {
    console.error("Confirm Issuance Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export const sendToProduction = confirmDocumentIssuance;
export const uploadDocument = previewDocument;

export async function getDocuments(req, res) {
  try {
    let result = [];
    try {
      if (req.user.role === "PRODUCTION") {
        const dbRes = await query(
          `SELECT d.*, da.id as assignment_id, da.status as assignment_status,
                  da.assigned_at, u.full_name as created_by_name
           FROM document_assignments da
           JOIN documents d ON da.document_id = d.id
           JOIN users u ON d.created_by = u.id
           WHERE da.assigned_to_user_id = $1
           ORDER BY d.id DESC`,
          [req.user.id]
        );
        result = dbRes.rows;
      } else {
        const dbRes = await query(
          `SELECT d.*, u.full_name as created_by_name
           FROM documents d
           LEFT JOIN users u ON d.created_by = u.id
           ORDER BY d.id DESC`
        );
        result = dbRes.rows;
      }
    } catch (dbErr) {
      const store = getFallbackStore();
      if (!store.document_assignments) store.document_assignments = [];

      // Auto-reconcile document assignments in fallback store for all documents
      (store.documents || []).forEach(doc => {
        const hasAssign = store.document_assignments.some(a => a.document_id === doc.id);
        if (!hasAssign) {
          store.document_assignments.unshift({
            id: store.document_assignments.length + 1,
            document_id: doc.id,
            assigned_to_user_id: 2,
            assigned_by_user_id: 1,
            status: "ISSUED",
            created_at: doc.created_at || new Date().toISOString(),
          });
        }
      });
      saveFallbackStore();

      const assignments = store.document_assignments || [];
      if (req.user.role === "PRODUCTION") {
        const myAssignments = assignments.filter(a => a.assigned_to_user_id === req.user.id || !a.assigned_to_user_id);
        result = store.documents.map(doc => {
          const a = myAssignments.find(assign => assign.document_id === doc.id);
          return {
            ...doc,
            assignment_id: a ? a.id : doc.id,
            assignment_status: a ? a.status : "ISSUED",
            assigned_at: a ? a.created_at : doc.created_at,
            created_by_name: "Dr. Rajesh Sharma (QA Lead)",
          };
        });
      } else {
        result = store.documents.map(d => ({ ...d, created_by_name: "Dr. Rajesh Sharma (QA Lead)" }));
      }
    }

    return res.status(200).json({ success: true, documents: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateMetadata(req, res) {
  const { id } = req.params;
  const { batch_number, mfg_date, expiry_date } = req.body;
  try {
    const store = getFallbackStore();
    const doc = store.documents.find(d => d.id === parseInt(id, 10));
    if (doc) {
      if (batch_number) doc.batch_number = batch_number;
      if (mfg_date) doc.mfg_date = mfg_date;
      if (expiry_date) doc.expiry_date = expiry_date;
      saveFallbackStore();
    }
    return res.status(200).json({ success: true, message: "Metadata updated" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

export async function recordDocumentOpened(req, res) {
  const { id } = req.params;
  try {
    await recordAuditLog({
      documentId: id,
      userId: req.user ? req.user.id : null,
      userRole: req.user ? req.user.role : "PRODUCTION",
      action: "Document Opened",
      details: `Document #${id} opened for viewing by Production`,
      ipAddress: req.ip,
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
