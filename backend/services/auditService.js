import { pool, isFallback, getFallbackStore, saveFallbackStore } from "../db/index.js";

/**
 * Audit Logger Service
 * Inserts read-only audit log entries for strict compliance and document traceability.
 */
export async function createAuditEntry({
  documentId = null,
  userId = null,
  userName = "System",
  userRole = "QA_ADMIN",
  action,
  documentName = "N/A",
  batchNumber = "N/A",
  issuanceNumber = "N/A",
  details = "",
}) {
  try {
    const timestamp = new Date().toISOString();

    if (!isFallback()) {
      await pool.query(
        `INSERT INTO audit_logs (document_id, user_id, user_name, user_role, action, document_name, batch_number, issuance_number, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          documentId,
          userId,
          userName,
          userRole,
          action,
          documentName,
          batchNumber,
          issuanceNumber,
          details,
          timestamp,
        ]
      );
    } else {
      const store = getFallbackStore();
      const newEntry = {
        id: store.audit_logs.length + 1,
        document_id: documentId,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        action,
        document_name: documentName,
        batch_number: batchNumber,
        issuance_number: issuanceNumber,
        details,
        created_at: timestamp,
      };
      if (!store.audit_logs) store.audit_logs = [];
      store.audit_logs.unshift(newEntry);
      saveFallbackStore();
    }
  } catch (err) {
    console.error("Audit Logging Failure:", err.message);
  }
}

export const recordAuditLog = createAuditEntry;
