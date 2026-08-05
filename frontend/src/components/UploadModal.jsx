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

  const [customCategory, setCustomCategory] = useState("");
  const [docTitle, setDocTitle] = useState("");

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
      setCustomCategory("");
      setDocTitle("");
      if (presetData) {
        if (presetData.document_type) setDocType(presetData.document_type.toUpperCase());
        if (presetData.batch_number) setBatchNumber(presetData.batch_number);
        if (presetData.requested_by_name) setCustomReceivedBy(presetData.requested_by_name);
      } else {
        setDocType("FORM");
        setCustomReceivedBy("");
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
    const finalType = docType === "CUSTOM" ? (customCategory || "CUSTOM") : docType;
    const isBmrOrBpr = finalType === "BMR" || finalType === "BPR";
    if (isBmrOrBpr && (!batchNumber || !mfgDate || !expiryDate)) {
      setError("Please fill in Batch Number, Manufacturing Date, and Expiry Date.");
      return;
    }

    // Default fallbacks for Forms / Incidence / CAPA / Custom if left blank
    const effectiveBatchNumber = batchNumber || `${finalType}-${new Date().getFullYear()}`;
    const effectiveMfgDate = mfgDate || new Date().toISOString().split("T")[0];
    const effectiveExpiryDate = expiryDate || new Date().toISOString().split("T")[0];

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("document_type", finalType);
      formData.append("batch_number", effectiveBatchNumber);
      formData.append("mfg_date", effectiveMfgDate);
      formData.append("expiry_date", effectiveExpiryDate);
      formData.append("issued_by", issuedBy);
      formData.append("issued_date", issuedDate);
      formData.append("custom_issuance_number", issuanceNumber);

      const res = await fetch("/api/v1/documents/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.previewData) {
        setPreviewData({
          ...data.previewData,
          document_name: docTitle || `${finalType} ${effectiveBatchNumber}`,
        });
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
      const finalType = docType === "CUSTOM" ? (customCategory || "CUSTOM") : docType;
      const res = await fetch("/api/v1/documents/confirm-issuance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...previewData,
          ...editorPayload,
          document_type: finalType,
          document_name: docTitle || editorPayload.document_name || `${finalType} Batch ${batchNumber || "N/A"}`,
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
        setDocTitle("");
        setCustomCategory("");
        setIsEditorOpen(false);
      } else {
        setError(data.message || "Failed to issue document");
      }
    } catch (e) {
      setError("Error issuing document");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const finalType = docType === "CUSTOM" ? (customCategory || "CUSTOM") : docType;
  const isBmrOrBpr = finalType === "BMR" || finalType === "BPR";

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
            document_type: finalType,
            batch_number: batchNumber || `${finalType}-${new Date().getFullYear()}`,
            mfg_date: mfgDate || new Date().toISOString().split("T")[0],
            expiry_date: expiryDate || new Date().toISOString().split("T")[0],
            issued_by: issuedBy,
            issued_date: issuedDate,
            received_by: customReceivedBy,
          }}
          onClose={() => setIsEditorOpen(false)}
          onConfirmIssuance={handleConfirmIssuanceFromEditor}
        />
      )}

      {/* Upload & Setup Modal */}
      {!isEditorOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "16px", width: "100%", maxWidth: "620px", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #EAE7E1", paddingBottom: "0.85rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1F2937", margin: 0 }}>
                  Issue Controlled PDF Document / Form
                </h3>
                <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: "2px 0 0 0" }}>
                  Upload scanned PDF, set recipient details, and add custom fields in interactive editor
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
              {/* INTERACTIVE DOCUMENT TYPE CARD SELECTOR */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label className="form-label">Select Document Category *</label>
                <div style={{ display: "grid", gridTemplateColumns: presetData ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "0.5rem" }}>
                  {(presetData ? [
                    { id: "BMR", title: "BMR", desc: "Mfg Record", color: "#0D9488" },
                    { id: "BPR", title: "BPR", desc: "Packing Record", color: "#06B6D4" },
                  ] : [
                    { id: "FORM", title: "FORM", desc: "SOP / Blank Form", color: "#8B5CF6" },
                    { id: "INCIDENCE", title: "INCIDENCE", desc: "Deviation Report", color: "#F59E0B" },
                    { id: "CAPA", title: "CAPA", desc: "Action Plan", color: "#EF4444" },
                    { id: "CUSTOM", title: "+ Custom", desc: "User Category", color: "#6366F1" },
                  ]).map(t => (
                    <div
                      key={t.id}
                      onClick={() => setDocType(t.id)}
                      style={{
                        background: docType === t.id ? `${t.color}15` : "#FFFFFF",
                        border: docType === t.id ? `2px solid ${t.color}` : "1.5px solid #E2E8F0",
                        borderRadius: "10px",
                        padding: "0.6rem 0.3rem",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <h4 style={{ fontSize: "0.76rem", fontWeight: 800, color: docType === t.id ? t.color : "#1F2937", margin: 0 }}>
                        {t.title}
                      </h4>
                      <p style={{ fontSize: "0.62rem", color: "#6B7280", margin: "2px 0 0 0", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {docType === "CUSTOM" && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <label className="form-label" style={{ fontSize: "0.78rem" }}>Type Custom Category Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Logbook, SOP Form, Change Control, Maintenance Sheet..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      required
                    />
                  </div>
                )}
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
                        Supports PDF scans up to 50MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Top Margin Stamp (Editable) */}
              <div style={{ background: "#FBF9F5", border: "1px solid #EAE7E1", padding: "0.85rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
                <label className="form-label" style={{ fontSize: "0.78rem", color: "#4B5563" }}>
                  Top-Right Header Margin Issuance Number (Editable Stamp)
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

              {/* Metadata Form Fields — CONDITIONAL FOR BMR/BPR VS FORMS/INCIDENCE/CAPA/CUSTOM */}
              {isBmrOrBpr ? (
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

                  <div className="form-group">
                    <label className="form-label">Received By / Recipient Email *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Name or Email (e.g. operator@nysabiomed.com)"
                      value={customReceivedBy}
                      onChange={(e) => setCustomReceivedBy(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Document Title / Form Name (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`e.g. ${finalType} Report - Equipment Maintenance Sheet`}
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Send To / Recipient Name or Email (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Leave blank for QA Direct Print, or enter recipient (e.g. Amit Verma / operator@nysabiomed.com)"
                      value={customReceivedBy}
                      onChange={(e) => setCustomReceivedBy(e.target.value)}
                    />
                    <span style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: "4px", display: "block" }}>
                      💡 If specified, document will be sent to recipient for printing. If left blank, QA Admin can print directly.
                    </span>
                  </div>
                </div>
              )}

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
