import { pool, isFallback, getFallbackStore, saveFallbackStore } from "../db/index.js";
import { createAuditEntry } from "../services/auditService.js";

export async function executePrint(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let doc = null;
    if (!isFallback()) {
      const { rows } = await pool.query("SELECT * FROM documents WHERE id = $1", [id]);
      doc = rows[0];
    } else {
      doc = getFallbackStore().documents.find(d => d.id === parseInt(id, 10));
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const printCount = doc.print_count || 0;
    const allowedPrints = doc.allowed_prints || 1;

    if (printCount >= allowedPrints) {
      return res.status(403).json({
        success: false,
        message: "Print limit reached! Original document can only be printed once. Request a reprint approval from QA.",
        reprintRequired: true,
      });
    }

    const isReprint = printCount > 0;
    const newPrintCount = printCount + 1;
    const newStatus = "PRINTED";
    const timestamp = new Date().toISOString();

    if (!isFallback()) {
      await pool.query(
        "UPDATE documents SET print_count = $1, status = $2 WHERE id = $3",
        [newPrintCount, newStatus, id]
      );
      await pool.query(
        "INSERT INTO print_logs (document_id, printed_by, print_type, ip_address) VALUES ($1, $2, $3, $4)",
        [id, userId, isReprint ? "REPRINT" : "ORIGINAL", req.ip || "127.0.0.1"]
      );
      // Notify QA/Admin
      await pool.query(
        `INSERT INTO notifications (recipient_role, title, message, type, document_id)
         VALUES ('QA_ADMIN', $1, $2, 'DOCUMENT_PRINTED', $3)`,
        [
          `Document Printed: ${doc.issuance_number}`,
          `Document ${doc.document_name} (${doc.issuance_number}) was printed by ${req.user.full_name}.`,
          id,
        ]
      );
    } else {
      const store = getFallbackStore();
      doc.print_count = newPrintCount;
      doc.status = newStatus;
      store.print_logs.push({
        id: store.print_logs.length + 1,
        document_id: parseInt(id, 10),
        printed_by: userId,
        print_type: isReprint ? "REPRINT" : "ORIGINAL",
        ip_address: req.ip || "127.0.0.1",
        printed_at: timestamp,
      });
      store.notifications.unshift({
        id: store.notifications.length + 1,
        recipient_role: "QA_ADMIN",
        title: `Document Printed: ${doc.issuance_number}`,
        message: `Document ${doc.document_name} (${doc.issuance_number}) was printed by ${req.user.full_name}.`,
        type: "DOCUMENT_PRINTED",
        document_id: parseInt(id, 10),
        is_read: false,
        created_at: timestamp,
      });
      saveFallbackStore();
    }

    const actionText = isReprint ? "Reprint Printed" : "Printed";
    await createAuditEntry({
      documentId: doc.id,
      userId: req.user.id,
      userName: req.user.full_name,
      userRole: req.user.role,
      action: actionText,
      documentName: doc.document_name,
      batchNumber: doc.batch_number,
      issuanceNumber: doc.issuance_number,
      details: `${actionText} (Total Prints: ${newPrintCount}/${allowedPrints}) by ${req.user.full_name}`,
    });

    await createAuditEntry({
      documentId: doc.id,
      userId: req.user.id,
      userName: req.user.full_name,
      userRole: req.user.role,
      action: "Print Notification Sent",
      documentName: doc.document_name,
      batchNumber: doc.batch_number,
      issuanceNumber: doc.issuance_number,
      details: `QA/Admin notified of ${actionText} execution.`,
    });

    return res.status(200).json({
      success: true,
      message: `Document printed successfully (${newPrintCount}/${allowedPrints}). Print button is now disabled until reprint authorization.`,
      print_count: newPrintCount,
      allowed_prints: allowedPrints,
    });
  } catch (error) {
    console.error("Execute Print Error:", error);
    return res.status(500).json({ success: false, message: "Error executing print" });
  }
}

export async function requestReprint(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: "A valid reason for reprint is required" });
    }

    let doc = null;
    if (!isFallback()) {
      const { rows } = await pool.query("SELECT * FROM documents WHERE id = $1", [id]);
      doc = rows[0];
    } else {
      doc = getFallbackStore().documents.find(d => d.id === parseInt(id, 10));
    }

    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    let requestId = null;
    const timestamp = new Date().toISOString();

    if (!isFallback()) {
      await pool.query("UPDATE documents SET status = 'REPRINT_PENDING' WHERE id = $1", [id]);
      const resReq = await pool.query(
        `INSERT INTO reprint_requests (document_id, requested_by, reason, status) VALUES ($1, $2, $3, 'PENDING') RETURNING id`,
        [id, req.user.id, reason]
      );
      requestId = resReq.rows[0].id;
      // Notify QA
      await pool.query(
        `INSERT INTO notifications (recipient_role, title, message, type, document_id)
         VALUES ('QA_ADMIN', $1, $2, 'REPRINT_REQUESTED', $3)`,
        [
          `Reprint Requested: ${doc.issuance_number}`,
          `Reprint requested for ${doc.issuance_number} by ${req.user.full_name}. Reason: ${reason}`,
          id,
        ]
      );
    } else {
      const store = getFallbackStore();
      doc.status = "REPRINT_PENDING";
      requestId = store.reprint_requests.length + 1;
      store.reprint_requests.unshift({
        id: requestId,
        document_id: parseInt(id, 10),
        requested_by: req.user.id,
        reason,
        status: "PENDING",
        reviewed_by: null,
        review_reason: "",
        requested_at: timestamp,
        reviewed_at: null,
      });
      store.notifications.unshift({
        id: store.notifications.length + 1,
        recipient_role: "QA_ADMIN",
        title: `Reprint Requested: ${doc.issuance_number}`,
        message: `Reprint requested for ${doc.issuance_number} by ${req.user.full_name}. Reason: ${reason}`,
        type: "REPRINT_REQUESTED",
        document_id: parseInt(id, 10),
        is_read: false,
        created_at: timestamp,
      });
      saveFallbackStore();
    }

    await createAuditEntry({
      documentId: doc.id,
      userId: req.user.id,
      userName: req.user.full_name,
      userRole: req.user.role,
      action: "Reprint Requested",
      documentName: doc.document_name,
      batchNumber: doc.batch_number,
      issuanceNumber: doc.issuance_number,
      details: `Reason submitted: "${reason}"`,
    });

    return res.status(200).json({ success: true, message: "Reprint request submitted to QA/Admin successfully", request_id: requestId });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error submitting reprint request" });
  }
}

export async function getReprintRequests(req, res) {
  try {
    let requests = [];
    if (!isFallback()) {
      const { rows } = await pool.query(
        `SELECT rr.*, d.document_name, d.document_type, d.batch_number, d.issuance_number,
          u.full_name as requested_by_name, u.department as requester_dept
         FROM reprint_requests rr
         JOIN documents d ON rr.document_id = d.id
         JOIN users u ON rr.requested_by = u.id
         ORDER BY rr.requested_at DESC`
      );
      requests = rows;
    } else {
      const store = getFallbackStore();
      requests = store.reprint_requests.map(r => {
        const d = store.documents.find(x => x.id === r.document_id);
        const u = store.users.find(x => x.id === r.requested_by);
        return {
          ...r,
          document_name: d ? d.document_name : "Document",
          document_type: d ? d.document_type : "BMR",
          batch_number: d ? d.batch_number : "",
          issuance_number: d ? d.issuance_number : "",
          requested_by_name: u ? u.full_name : "Production User",
          requester_dept: u ? u.department : "Production",
        };
      });
    }

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch reprint requests" });
  }
}

export async function reviewReprintRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { decision, review_reason } = req.body; // decision: 'APPROVE' or 'REJECT'

    if (!["APPROVE", "REJECT"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be APPROVE or REJECT" });
    }

    let rr = null;
    let doc = null;

    if (!isFallback()) {
      const rRes = await pool.query("SELECT * FROM reprint_requests WHERE id = $1", [requestId]);
      rr = rRes.rows[0];
      if (rr) {
        const dRes = await pool.query("SELECT * FROM documents WHERE id = $1", [rr.document_id]);
        doc = dRes.rows[0];
      }
    } else {
      const store = getFallbackStore();
      rr = store.reprint_requests.find(x => x.id === parseInt(requestId, 10));
      if (rr) {
        doc = store.documents.find(x => x.id === rr.document_id);
      }
    }

    if (!rr || !doc) {
      return res.status(404).json({ success: false, message: "Reprint request or document not found" });
    }

    const timestamp = new Date().toISOString();
    const isApproved = decision === "APPROVE";
    const newStatus = isApproved ? "REPRINT_APPROVED" : "PRINTED";
    const requestStatus = isApproved ? "APPROVED" : "REJECTED";

    if (!isFallback()) {
      await pool.query(
        "UPDATE reprint_requests SET status = $1, reviewed_by = $2, review_reason = $3, reviewed_at = $4 WHERE id = $5",
        [requestStatus, req.user.id, review_reason || "", timestamp, requestId]
      );

      if (isApproved) {
        // Increment allowed prints by 1
        await pool.query(
          "UPDATE documents SET status = 'REPRINT_APPROVED', allowed_prints = allowed_prints + 1 WHERE id = $1",
          [doc.id]
        );
      } else {
        await pool.query("UPDATE documents SET status = 'PRINTED' WHERE id = $1", [doc.id]);
      }

      // Notify Production user
      await pool.query(
        `INSERT INTO notifications (recipient_id, title, message, type, document_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          rr.requested_by,
          isApproved ? `Reprint Approved: ${doc.issuance_number}` : `Reprint Rejected: ${doc.issuance_number}`,
          isApproved
            ? `Your reprint request for ${doc.issuance_number} has been approved by QA. Exactly 1 additional print is now enabled.`
            : `Your reprint request for ${doc.issuance_number} was rejected by QA.`,
          isApproved ? "REPRINT_APPROVED" : "REPRINT_REJECTED",
          doc.id,
        ]
      );
    } else {
      const store = getFallbackStore();
      rr.status = requestStatus;
      rr.reviewed_by = req.user.id;
      rr.review_reason = review_reason || "";
      rr.reviewed_at = timestamp;

      if (isApproved) {
        doc.status = "REPRINT_APPROVED";
        doc.allowed_prints = (doc.allowed_prints || doc.print_count || 1) + 1;
      } else {
        doc.status = "PRINTED";
      }

      store.notifications.unshift({
        id: store.notifications.length + 1,
        recipient_id: rr.requested_by,
        title: isApproved ? `Reprint Approved: ${doc.issuance_number}` : `Reprint Rejected: ${doc.issuance_number}`,
        message: isApproved
          ? `Your reprint request for ${doc.issuance_number} has been approved by QA. Exactly 1 additional print is now enabled.`
          : `Your reprint request for ${doc.issuance_number} was rejected by QA.`,
        type: isApproved ? "REPRINT_APPROVED" : "REPRINT_REJECTED",
        document_id: doc.id,
        is_read: false,
        created_at: timestamp,
      });
      saveFallbackStore();
    }

    const auditAction = isApproved ? "Reprint Approved" : "Reprint Rejected";
    await createAuditEntry({
      documentId: doc.id,
      userId: req.user.id,
      userName: req.user.full_name,
      userRole: req.user.role,
      action: auditAction,
      documentName: doc.document_name,
      batchNumber: doc.batch_number,
      issuanceNumber: doc.issuance_number,
      details: `${auditAction} by QA ${req.user.full_name}. ${review_reason ? `Note: ${review_reason}` : ""}`,
    });

    return res.status(200).json({
      success: true,
      message: `Reprint request ${isApproved ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    console.error("Review Reprint Request Error:", error);
    return res.status(500).json({ success: false, message: "Error reviewing reprint request" });
  }
}
