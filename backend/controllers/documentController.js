import { query, getFallbackStore, saveFallbackStore } from "../db/index.js";
import { stampDocumentPDF } from "../services/pdfStamper.js";
import { recordAuditLog } from "../services/auditService.js";
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
 * Preview Uploaded Document & Launch Sejda Editor
 */
export async function previewDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF file uploaded" });
    }

    const {
      document_type,
      batch_number,
      mfg_date,
      expiry_date,
      issued_by,
      issued_date,
      custom_issuance_number,
    } = req.body;

    const issuance_number = custom_issuance_number || (await generateIssuanceNumber());

    const tempFilename = `preview_${Date.now()}_${req.file.originalname}`;
    const tempPath = path.join("uploads", "temp_previews", tempFilename);

    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.copyFileSync(req.file.path, tempPath);
    try { fs.unlinkSync(req.file.path); } catch (e) { }

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

    const subDir = (document_type || "BMR").toLowerCase();
    const finalFilename = `${issuance_number}_${Date.now()}.pdf`;
    const relativePath = path.join("uploads", subDir, finalFilename).replace(/\\/g, "/");
    const absoluteOutputPath = path.resolve(relativePath);

    const absoluteInputPath = path.resolve(temp_original_path);

    if (!fs.existsSync(absoluteInputPath)) {
      return res.status(400).json({ success: false, message: "Temp preview file expired or missing." });
    }

    // Persist clean base original PDF file in uploads/originals/
    const origDir = path.join("uploads", "originals");
    if (!fs.existsSync(origDir)) {
      fs.mkdirSync(origDir, { recursive: true });
    }
    const cleanOriginalRelativePath = path.join(origDir, `clean_${issuance_number}.pdf`).replace(/\\/g, "/");
    fs.copyFileSync(absoluteInputPath, path.resolve(cleanOriginalRelativePath));

    const stampResult = await stampDocumentPDF({
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
      customFields: custom_fields,
    });

    let newDoc = null;
    let assignment = null;

    try {
      const docRes = await query(
        `INSERT INTO documents (
          issuance_number, document_type, document_name, batch_number,
          mfg_date, expiry_date, total_pages, original_file_path,
          stamped_file_path, file_size_bytes, created_by, status
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
          cleanOriginalRelativePath,
          relativePath,
          fs.statSync(absoluteOutputPath).size,
          req.user.id,
        ]
      );

      newDoc = { ...docRes.rows[0], custom_fields: custom_fields || [] };

      const targetAssignedUserId = assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : 2;
      const assignRes = await query(
        `INSERT INTO document_assignments (document_id, assigned_to_user_id, assigned_by_user_id)
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
        total_pages: stampResult.pageCount || 1,
        original_file_path: cleanOriginalRelativePath,
        stamped_file_path: relativePath,
        file_size_bytes: fs.statSync(absoluteOutputPath).size,
        print_count: 0,
        max_allowed_prints: 1,
        status: "PENDING_PRINT",
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        custom_fields: custom_fields || [],
      };
      store.documents.unshift(newDoc);

      const targetAssignedUserId = assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : 2;
      assignment = {
        id: store.document_assignments ? store.document_assignments.length + 1 : 1,
        document_id: newDoc.id,
        assigned_to_user_id: targetAssignedUserId,
        assigned_by_user_id: req.user.id,
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
      documentId: newDoc.id,
      userId: req.user.id,
      userRole: req.user.role,
      action: "Document Uploaded",
      details: `Issued ${document_type} ${issuance_number} for Batch ${batch_number} (Received by ${received_by || 'Production'}).`,
      ipAddress: req.ip,
    });

    try { fs.unlinkSync(absoluteInputPath); } catch (e) { }

    return res.status(201).json({
      success: true,
      message: "Document issued successfully and sent to Production.",
      issuance_number,
      document: newDoc,
      assignment,
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
