import { pool, isFallback, getFallbackStore } from "../db/index.js";

export async function getRequisitions(req, res) {
  try {
    const store = getFallbackStore();
    if (!store.requisitions) store.requisitions = [];
    if (!store.documents) store.documents = [];

    // Reconcile pending requisitions against existing issued documents
    const issuedBatchNumbers = new Set(store.documents.map(d => String(d.batch_number || "").trim().toLowerCase()));

    store.requisitions.forEach(r => {
      if (r.status === "PENDING" && issuedBatchNumbers.has(String(r.batch_number || "").trim().toLowerCase())) {
        r.status = "ISSUED";
        r.fulfilled_at = r.fulfilled_at || new Date().toISOString();
      }
    });

    if (!isFallback()) {
      try {
        const { rows } = await pool.query("SELECT * FROM requisitions ORDER BY created_at DESC");
        return res.json({ success: true, requisitions: rows });
      } catch (dbErr) {
        console.warn("Database requisitions query error, falling back to local store:", dbErr.message);
      }
    }

    return res.json({ success: true, requisitions: store.requisitions });
  } catch (error) {
    console.error("Error fetching requisitions:", error);
    return res.status(500).json({ success: false, message: "Server error fetching requisitions" });
  }
}

export async function createRequisition(req, res) {
  try {
    const { document_type, product_name, batch_number, batch_size, remarks } = req.body;
    const requested_by = req.user?.id || 2;
    const requested_by_name = req.user?.full_name || "Amit Verma (Plant Officer)";

    if (!product_name || !batch_number) {
      return res.status(400).json({ success: false, message: "Product Name and Batch Number are required" });
    }

    const newReq = {
      id: Date.now(),
      document_type: document_type || "BMR",
      product_name,
      batch_number,
      batch_size: batch_size || "Standard",
      remarks: remarks || "",
      status: "PENDING",
      requested_by,
      requested_by_name,
      created_at: new Date().toISOString(),
    };

    if (!isFallback()) {
      try {
        const queryText = `
          INSERT INTO requisitions (document_type, product_name, batch_number, batch_size, remarks, status, requested_by, requested_by_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;
        const { rows } = await pool.query(queryText, [
          newReq.document_type,
          newReq.product_name,
          newReq.batch_number,
          newReq.batch_size,
          newReq.remarks,
          "PENDING",
          requested_by,
          requested_by_name
        ]);
        if (rows[0]) newReq.id = rows[0].id;
      } catch (dbErr) {
        console.warn("DB insert requisition error, saving to local store fallback:", dbErr.message);
      }
    }

    const store = getFallbackStore();
    if (!store.requisitions) store.requisitions = [];
    store.requisitions.unshift(newReq);

    // Create Audit Log
    if (!store.audit_logs) store.audit_logs = [];
    store.audit_logs.unshift({
      id: Date.now() + 1,
      action: "REQUISITION_SUBMITTED",
      batch_number,
      document_name: `${newReq.document_type} for ${product_name}`,
      details: `Production operator ${requested_by_name} submitted ${newReq.document_type} requisition for Batch #${batch_number}`,
      user_id: requested_by,
      user_name: requested_by_name,
      user_role: req.user?.role || "PRODUCTION",
      created_at: new Date().toISOString(),
    });

    // Create QA Notification
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift({
      id: Date.now() + 2,
      user_id: 1,
      title: `New ${newReq.document_type} Requisition Request`,
      message: `Batch #${batch_number} (${product_name}) requested by ${requested_by_name}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: `${newReq.document_type} Requisition submitted successfully for Batch #${batch_number}`,
      requisition: newReq,
    });
  } catch (error) {
    console.error("Error creating requisition:", error);
    return res.status(500).json({ success: false, message: "Server error creating requisition" });
  }
}

export async function rejectRequisition(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const store = getFallbackStore();
    if (!store.requisitions) store.requisitions = [];

    const reqItem = store.requisitions.find(r => String(r.id) === String(id));
    if (!reqItem) {
      return res.status(404).json({ success: false, message: "Requisition request not found" });
    }

    reqItem.status = "REJECTED";
    reqItem.review_notes = reason || "Rejected by QA Lead";

    if (!isFallback()) {
      try {
        await pool.query("UPDATE requisitions SET status = $1, review_notes = $2 WHERE id = $3", ["REJECTED", reason, id]);
      } catch (dbErr) {
        console.warn("DB update requisition error:", dbErr.message);
      }
    }

    // Record Audit Log
    if (!store.audit_logs) store.audit_logs = [];
    store.audit_logs.unshift({
      id: Date.now(),
      action: "REQUISITION_REJECTED",
      batch_number: reqItem.batch_number,
      details: `QA Admin rejected requisition for Batch #${reqItem.batch_number}. Reason: ${reason || 'None'}`,
      user_id: req.user?.id || 1,
      user_name: req.user?.full_name || "Dr. Rajesh Sharma",
      user_role: "QA_ADMIN",
      created_at: new Date().toISOString(),
    });

    return res.json({ success: true, message: "Requisition rejected", requisition: reqItem });
  } catch (error) {
    console.error("Error rejecting requisition:", error);
    return res.status(500).json({ success: false, message: "Server error rejecting requisition" });
  }
}
