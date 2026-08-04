import React, { useState } from "react";
import { X, RefreshCcw, CheckCircle2, AlertOctagon, HelpCircle, FilePlus, Package, Hash, Layers, MessageSquare, FileText } from "lucide-react";

export function ReprintModal({ document: doc, isOpen, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !doc) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason || reason.trim().length === 0) {
      setError("Please provide a valid reason for requesting a reprint.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/prints/${doc.id}/reprint-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.message);
        onClose();
        setReason("");
      } else {
        setError(data.message || "Failed to submit reprint request");
      }
    } catch (e) {
      setError("Network or server error submitting reprint request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #EAE7E1", paddingBottom: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1F2937", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <RefreshCcw size={18} style={{ color: "#06B6D4" }} />
              Request Document Reprint Authorization
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
              Issuance No: <strong style={{ color: "#0D9488" }}>{doc.issuance_number}</strong> | Batch: {doc.batch_number}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#F3F4F6", padding: "0.4rem", borderRadius: "50%", color: "#6B7280" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Reason for Reprint *</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="e.g. Printer paper jam occurred during page 12 print out, requiring full authorized reprint."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.8rem", color: "#B45309", marginBottom: "1.25rem", display: "flex", gap: "0.5rem" }}>
            <HelpCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              Note: Submitting this request sends an instant alert to QA/Admin. If approved, exactly 1 additional print will be unlocked.
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-tiffany">
              {loading ? "Submitting..." : "Submit Reprint Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ReviewReprintModal({ request: reqItem, isOpen, onClose, onSuccess }) {
  const [reviewReason, setReviewReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !reqItem) return null;

  async function handleReview(decision) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/prints/reprint-requests/${reqItem.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, review_reason: reviewReason }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.message);
        onClose();
      } else {
        setError(data.message || "Failed to review request");
      }
    } catch (e) {
      setError("Server error reviewing reprint request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #EAE7E1", paddingBottom: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1F2937" }}>
              QA Reprint Authorization Review
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
              Request #{reqItem.id} | Document: {reqItem.issuance_number}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#F3F4F6", padding: "0.4rem", borderRadius: "50%", color: "#6B7280" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ background: "#F8F6F0", border: "1px solid #EAE7E1", borderRadius: "8px", padding: "1rem", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>Requested By:</p>
          <p style={{ fontSize: "0.9rem", color: "#1F2937", marginBottom: "0.5rem" }}>{reqItem.requested_by_name} ({reqItem.requester_dept})</p>
          
          <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>Submitted Reason:</p>
          <p style={{ fontSize: "0.9rem", color: "#0F766E", fontStyle: "italic", background: "#FFFFFF", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid #E5E7EB" }}>
            "{reqItem.reason}"
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">QA Review Remarks (Optional)</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Add any QA verification notes..."
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #EAE7E1", paddingTop: "1rem" }}>
          <button type="button" onClick={() => handleReview("REJECT")} disabled={loading} className="btn-danger">
            Reject Request
          </button>
          <button type="button" onClick={() => handleReview("APPROVE")} disabled={loading} className="btn-primary">
            Approve 1 Additional Print
          </button>
        </div>
      </div>
    </div>
  );
}

export function RequestBmrBprModal({ isOpen, onClose, onSuccess }) {
  const [docType, setDocType] = useState("BMR");
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productName || !batchNumber) {
      setError("Product Name and Batch Number are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: docType,
          product_name: productName,
          batch_number: batchNumber,
          batch_size: batchSize,
          remarks
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.message || "Requisition submitted successfully");
        onClose();
        setProductName("");
        setBatchNumber("");
        setBatchSize("");
        setRemarks("");
      } else {
        setError(data.message || "Failed to submit requisition");
      }
    } catch (err) {
      setError("Server or network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: "480px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #EAE7E1", paddingBottom: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1F2937", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <FilePlus size={18} style={{ color: "#0D9488" }} />
              Request New BMR / BPR Issuance
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
              Send formal requisition to QA for document preparation & issuance.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#F3F4F6", padding: "0.4rem", borderRadius: "50%", color: "#6B7280" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* INTERACTIVE BMR / BPR CARD TOGGLE SELECTOR */}
          <div className="form-group">
            <label className="form-label">Select Document Type *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              {/* LEFT CARD: BMR */}
              <div
                onClick={() => setDocType("BMR")}
                style={{
                  background: docType === "BMR" ? "#F0FDFA" : "#FFFFFF",
                  border: docType === "BMR" ? "2px solid #0D9488" : "1.5px solid #E2E8F0",
                  borderRadius: "12px",
                  padding: "0.85rem 1rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: docType === "BMR" ? "0 4px 14px rgba(13, 148, 136, 0.15)" : "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px",
                    background: docType === "BMR" ? "#0D9488" : "#F3F4F6",
                    color: docType === "BMR" ? "white" : "#6B7280",
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800
                  }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: docType === "BMR" ? "#0F766E" : "#1F2937", margin: 0 }}>
                      BMR
                    </h4>
                    <p style={{ fontSize: "0.72rem", color: "#6B7280", margin: 0, fontWeight: 500 }}>
                      Batch Manufacturing
                    </p>
                  </div>
                </div>
                {docType === "BMR" && (
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0D9488", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle2 size={14} />
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
                  padding: "0.85rem 1rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: docType === "BPR" ? "0 4px 14px rgba(6, 182, 212, 0.15)" : "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px",
                    background: docType === "BPR" ? "#06B6D4" : "#F3F4F6",
                    color: docType === "BPR" ? "white" : "#6B7280",
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800
                  }}>
                    <Package size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: docType === "BPR" ? "#0891B2" : "#1F2937", margin: 0 }}>
                      BPR
                    </h4>
                    <p style={{ fontSize: "0.72rem", color: "#6B7280", margin: 0, fontWeight: 500 }}>
                      Batch Packing Record
                    </p>
                  </div>
                </div>
                {docType === "BPR" && (
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#06B6D4", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle2 size={14} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <div style={{ position: "relative" }}>
              <Package size={18} style={{ position: "absolute", left: "12px", top: "12px", color: "#0D9488" }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: "38px" }}
                placeholder="e.g. Ondansetron Tablets BP 8 mg"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Batch Number *</label>
            <div style={{ position: "relative" }}>
              <Hash size={18} style={{ position: "absolute", left: "12px", top: "12px", color: "#0D9488" }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: "38px" }}
                placeholder="e.g. B-2005"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Batch Size / Quantity</label>
            <div style={{ position: "relative" }}>
              <Layers size={18} style={{ position: "absolute", left: "12px", top: "12px", color: "#0D9488" }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: "38px" }}
                placeholder="e.g. 30000 Tablets / 2.920 Kg"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks / Special Notes</label>
            <div style={{ position: "relative" }}>
              <MessageSquare size={18} style={{ position: "absolute", left: "12px", top: "12px", color: "#0D9488" }} />
              <textarea
                className="form-input"
                style={{ paddingLeft: "38px", minHeight: "75px" }}
                rows={2}
                placeholder="Any additional notes for QA Admin..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: "0.6rem 1.1rem" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: "0.6rem 1.3rem" }}>
              {loading ? "Submitting..." : "Submit Requisition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
