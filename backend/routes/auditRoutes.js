import express from "express";
import { getAuditLogs } from "../controllers/auditController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", authorize("QA_ADMIN"), getAuditLogs);

export default router;
