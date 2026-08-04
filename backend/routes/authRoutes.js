import express from "express";
import { login, logout, getMe, getProductionUsers } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.get("/production-users", protect, getProductionUsers);

export default router;
