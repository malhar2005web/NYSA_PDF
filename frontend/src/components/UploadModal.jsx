import React, { useState, useEffect } from "react";
import { UploadCloud, X, FileCheck, CheckCircle2, Eye, Send, ArrowLeft, AlertCircle, Edit3 } from "lucide-react";
import { PDFSejdaEditor } from "./PDFSejdaEditor";

export function UploadModal({ isOpen, presetData, onClose, onSuccess }) {
  const [docType, setDocType] = useState("BMR");
  const [file, setFile] = useState(null);
  const [batchNumber, setBatchNumber] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [issuedBy, setIssuedBy] = useState("Dr. Rajesh Sharma (QA Lead)");
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split("T")[0]);
  const [customReceivedBy, setCustomReceivedBy] = useState("Amit Verma (Plant Officer)");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-Incrementing / Editable Issuance Number State
  const [issuanceNumber, setIssuanceNumber] = useState("");

  // Sejda Editor Mode state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      generateDefaultIssuanceNumber();
      setIsEditorOpen(false);
      setPreviewData(null);
      if (presetData) {
        if (presetData.document_type) setDocType(presetData.document_type.toUpperCase());
        if (presetData.batch_number) setBatchNumber(presetData.batch_number);
        if (presetData.requested_by_name) setCustomReceivedBy(presetData.requested_by_name);
      }
    }
  }, [isOpen, presetData]);

  function generateDefaultIssuanceNumber() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const randomSeq = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    setIssuanceNumber(`ISS-${y}-${m}${day}-${randomSeq}`);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.type === "application/pdf" || selected.name.endsWith(".pdf")) {
        setFile(selected);
        setError("");
      } else {
        setError("Please upload a valid PDF file.");
      }
    }
  }

  /**
   * Launch Sejda Interactive PDF Editor Layer
   */
  async function handleOpenEditor(e) {
    e.preventDefault();
    if (!file) {
      setError("Please select a scanned PDF file.");
      return;
    }
    if (!batchNumber || !mfgDate || !expiryDate) {
      setError("Please fill in Batch Number, Manufacturing Date, and Expiry Date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("document_type", docType);
      formData.append("batch_number", batchNumber);
      formData.append("mfg_date", mfgDate);
      formData.append("expiry_date", expiryDate);
      formData.append("issued_by", issuedBy);
      formData.append("issued_date", issuedDate);
      formData.append("custom_issuance_number", issuanceNumber);

      const res = await fetch("/api/v1/documents/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.previewData) {
        setPreviewData(data.previewData);
        setIsEditorOpen(true);
      } else {
        setError(data.message || "Failed to load interactive editor");
      }
    } catch (err) {
      setError("Error opening interactive PDF editor: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Final Issuance Callback from Sejda Editor
   */
  async function handleConfirmIssuanceFromEditor(editorPayload) {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/documents/confirm-issuance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...previewData,
          ...editorPayload,
          requisition_id: presetData?.id || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data);
        onClose();
        setFile(null);
        setBatchNumber("");
        setMfgDate("");
        setExpiryDate("");
        setIsEditorOpen(false);
      } else {
        setError(data.message || "Failed to issue document");
      }
    } catch (e) {
      setError("Error issuing document to Production");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* SEJDA INTERACTIVE 3-LAYER PDF EDITOR COMPONENT       */}
      {/* ---------------------------------------------------- */}
      {isEditorOpen && previewData && (
        <PDFSejdaEditor
          pdfUrl={`/${previewData.temp_original_path}`}
          issuanceNumber={issuanceNumber}
          initialData={{
            document_type: docType,
            batch_number: batchNumber,
            mfg_date: mfgDate,
            expiry_date: expiryDate,
            issued_by: issuedBy,
            issued_date: issuedDate,
            received_by: customReceivedBy,
          }}
          onClose={() => setIsEditorOpen(false)}
          onConfirmIssuance={handleConfirmIssuanceFromEditor}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* INITIAL METADATA ENTRY MODAL                         */}
      {/* ---------------------------------------------------- */}
      {!isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #EAE7E1", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1F2937" }}>
                  Upload Scanned {docType} Document
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                  Select PDF scan and enter batch metadata to launch Sejda-style interactive field editor.
                </p>
              </div>
              <button onClick={onClose} style={{ background: "#F3F4F6", padding: "0.4rem", borderRadius: "50%", color: "#6B7280" }}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleOpenEditor}>
              {/* Document Type Selector & Combo Button */}
              {/* INTERACTIVE BMR / BPR CARD TOGGLE SELECTOR */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label className="form-label">Document Type Selection *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                  {/* LEFT CARD: BMR */}
                  <div
                    onClick={() => setDocType("BMR")}
                    style={{
                      background: docType === "BMR" ? "#F0FDFA" : "#FFFFFF",
                      border: docType === "BMR" ? "2px solid #0D9488" : "1.5px solid #E2E8F0",
                      borderRadius: "12px",
                      padding: "0.75rem 0.9rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: docType === "BMR" ? "0 4px 14px rgba(13, 148, 136, 0.15)" : "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "8px",
                        background: docType === "BMR" ? "#0D9488" : "#F3F4F6",
                        color: docType === "BMR" ? "white" : "#6B7280",
                        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800
                      }}>
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: docType === "BMR" ? "#0F766E" : "#1F2937", margin: 0 }}>
                          BMR
                        </h4>
                        <p style={{ fontSize: "0.7rem", color: "#6B7280", margin: 0, fontWeight: 500 }}>
                          Batch Manufacturing
                        </p>
                      </div>
                    </div>
                    {docType === "BMR" && (
                      <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#0D9488", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={13} />
                      </div>
                    )}
                  </div>

                  {/* RIGHT CARD: BPR */}
                  <div
                    onClick={() => setDocType("BPR")}
                    style={{
                      background: docType === "BPR" ? "#ECFEFF" : "#FFFFFF",
                      border: docType === "BPR" ? "2px solid #06B6D4" : "1.5px solid #E2E8F0",
                      borderRadius: "12px",
                      padding: "0.75rem 0.9rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: docType === "BPR" ? "0 4px 14px rgba(6, 182, 212, 0.15)" : "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "8px",
                        background: docType === "BPR" ? "#06B6D4" : "#F3F4F6",
                        color: docType === "BPR" ? "white" : "#6B7280",
                        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800
                      }}>
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: docType === "BPR" ? "#0891B2" : "#1F2937", margin: 0 }}>
                          BPR
                        </h4>
                        <p style={{ fontSize: "0.7rem", color: "#6B7280", margin: 0, fontWeight: 500 }}>
                          Batch Packing Record
                        </p>
                      </div>
                    </div>
                    {docType === "BPR" && (
                      <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#06B6D4", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={13} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drag & Drop Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                style={{
                  border: "2px dashed #0D9488",
                  borderRadius: "12px",
                  background: "#F0FDFA",
                  padding: "1.25rem",
                  textAlign: "center",
                  marginBottom: "1.25rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  id="file-upload-input"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files[0] && setFile(e.target.files[0])}
                />
                <label htmlFor="file-upload-input" style={{ cursor: "pointer" }}>
                  <UploadCloud size={36} style={{ color: "#0D9488", marginBottom: "0.4rem" }} />
                  {file ? (
                    <div style={{ color: "#0D9488", fontWeight: 700, fontSize: "0.95rem" }}>
                      <FileCheck size={18} style={{ display: "inline", marginRight: "4px" }} />
                      {file.name} ({Math.round(file.size / 1024 / 1024 * 100) / 100} MB)
                    </div>
                  ) : (
                    <>
                      <p style={{ fontWeight: 700, color: "#1F2937", fontSize: "0.95rem" }}>
                        Click or Drag & Drop scanned PDF here
                      </p>
                      <p style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: "2px" }}>
                        Supports BMR/BPR PDF scans up to 50MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Top Margin Stamp (Editable) */}
              <div style={{ background: "#FBF9F5", border: "1px solid #EAE7E1", padding: "0.85rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
                <label className="form-label" style={{ fontSize: "0.78rem", color: "#4B5563" }}>
                  Top-Right Header Margin Issuance Number (Editable)
                </label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontWeight: 800, color: "#0F766E", background: "#FFFFFF", fontFamily: "monospace" }}
                    value={issuanceNumber}
                    onChange={(e) => setIssuanceNumber(e.target.value)}
                    placeholder="e.g. ISS-2026-0802-004"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateDefaultIssuanceNumber}
                    style={{ background: "#E6F4F1", color: "#0F766E", border: "1px solid #99F6E4", borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    Auto-Generate
                  </button>
                </div>
              </div>

              {/* Metadata Form Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Batch Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. B-2005"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Manufacturing Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Document Issued By</label>
                  <input
                    type="text"
                    className="form-input"
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Issued Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                  />
                </div>

                {/* RECEIVED BY (SINGLE TYPING INPUT ONLY) */}
                <div className="form-group">
                  <label className="form-label">Received By *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type recipient name..."
                    value={customReceivedBy}
                    onChange={(e) => setCustomReceivedBy(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem", borderTop: "1px solid #EAE7E1", paddingTop: "1rem" }}>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-tiffany" style={{ padding: "0.6rem 1.25rem" }}>
                  <Eye size={17} />
                  {loading ? "Loading Editor..." : "Open Interactive PDF Editor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
