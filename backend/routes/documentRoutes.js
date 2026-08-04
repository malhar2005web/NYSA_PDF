import express from "express";
import multer from "multer";
import {
  uploadDocument,
  previewDocument,
  confirmDocumentIssuance,
  updateMetadata,
  sendToProduction,
  getDocuments,
  recordDocumentOpened,
} from "../controllers/documentController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const upload = multer({
  dest: "temp_uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF documents are allowed"));
    }
  },
});

const router = express.Router();

router.use(protect);

router.get("/", getDocuments);
router.post("/preview", authorize("QA_ADMIN"), upload.single("pdf"), previewDocument);
router.post("/confirm-issuance", authorize("QA_ADMIN"), confirmDocumentIssuance);
router.post("/upload", authorize("QA_ADMIN"), upload.single("pdf"), uploadDocument);
router.put("/:id/metadata", authorize("QA_ADMIN"), updateMetadata);
router.post("/:id/send", authorize("QA_ADMIN"), sendToProduction);
router.post("/:id/open", recordDocumentOpened);

export default router;
