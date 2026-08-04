import { pool, isFallback, getFallbackStore } from "../db/index.js";

export async function getAuditLogs(req, res) {
  try {
    let logs = [];
    if (!isFallback()) {
      const { rows } = await pool.query(
        "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500"
      );
      logs = rows;
    } else {
      logs = getFallbackStore().audit_logs;
    }

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching audit logs" });
  }
}
