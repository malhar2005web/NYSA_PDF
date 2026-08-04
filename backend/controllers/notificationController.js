import { pool, isFallback, getFallbackStore, saveFallbackStore } from "../db/index.js";

export async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let notifications = [];
    if (!isFallback()) {
      const { rows } = await pool.query(
        `SELECT * FROM notifications
         WHERE recipient_id = $1 OR recipient_role = $2 OR recipient_role = 'ALL'
         ORDER BY created_at DESC LIMIT 50`,
        [userId, userRole]
      );
      notifications = rows;
    } else {
      const store = getFallbackStore();
      notifications = store.notifications.filter(
        n => n.recipient_id === userId || n.recipient_role === userRole || n.recipient_role === "ALL"
      );
    }

    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching notifications" });
  }
}

export async function markNotificationAsRead(req, res) {
  try {
    const { id } = req.params;
    if (!isFallback()) {
      await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [id]);
    } else {
      const store = getFallbackStore();
      const n = store.notifications.find(x => x.id === parseInt(id, 10));
      if (n) {
        n.is_read = true;
        saveFallbackStore();
      }
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating notification" });
  }
}
