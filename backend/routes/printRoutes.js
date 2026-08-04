import express from "express";
import {
  executePrint,
  requestReprint,
  getReprintRequests,
  reviewReprintRequest,
} from "../controllers/printController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/:id/print", executePrint);
router.post("/:id/reprint-request", authorize("PRODUCTION"), requestReprint);
router.get("/reprint-requests", authorize("QA_ADMIN"), getReprintRequests);
router.post("/reprint-requests/:requestId/review", authorize("QA_ADMIN"), reviewReprintRequest);

export default router;
