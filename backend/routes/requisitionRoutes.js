import express from "express";
import { getRequisitions, createRequisition, rejectRequisition } from "../controllers/requisitionController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getRequisitions);
router.post("/", createRequisition);
router.post("/:id/reject", authorize("QA_ADMIN"), rejectRequisition);

export default router;
