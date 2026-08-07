import React, { useState } from "react";
import { Download, X, FileSpreadsheet, FileText, Calendar, Building2, CheckCircle2 } from "lucide-react";
import { generateRegisterPDF, generateRegisterCSV } from "../utils/generateRegisterPDF";

export function ExportRegisterModal({ isOpen, documents = [], onClose }) {
  const [formCode, setFormCode] = useState("(QAP-009/F2-02)");
  const [companyName, setCompanyName] = useState("Nysa Biomed Pvt.Ltd. Satara.");
  const [registerTitle, setRegisterTitle] = useState("BMR/BPR ISSUANCE AND RETRIEVAL RECORD");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!isOpen) return null;

  // Filter documents based on user selection in modal
  const filteredDocs = (documents || []).filter(d => {
    // Type Filter
    if (docTypeFilter !== "ALL") {
      const type = (d.document_type || "").toUpperCase();
      if (docTypeFilter === "BMR_BPR" && type !== "BMR" && type !== "BPR") return false;
      if (docTypeFilter === "FORMS" && (type === "BMR" || type === "BPR")) return false;
    }

    // Date Range Filter
    const dDate = d.created_at ? d.created_at.split("T")[0] : (d.issued_date || "");
    if (startDate && dDate && dDate < startDate) return false;
    if (endDate && dDate && dDate > endDate) return false;

    return true;
  });

  function handleExportPDF() {
    generateRegisterPDF(filteredDocs, {
      formCode,
      companyName,
      registerTitle,
      startDate,
      endDate,
    });
    onClose();
  }

  function handleExportCSV() {
    generateRegisterCSV(filteredDocs);
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)",
      display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem"
    }}>
      <div style={{
        background: "#FFFFFF", borderRadius: "16px", width: "100%", maxWidth: "540px",
        padding: "1.75rem", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)"
      }}>
        {/* MODAL HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #EAE7E1", paddingBottom: "0.85rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1F2937", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={20} color="#0D9488" />
              Configure Official PDF Register Export
            </h3>
            <p style={{ fontSize: "0.78rem", color: "#6B7280", margin: "2px 0 0 0" }}>
              Customize Protocol Ref Code & Filters before generating official PDF.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#F3F4F6", padding: "0.4rem", borderRadius: "50%", color: "#6B7280", border: "none", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* METADATA SETUP FORM */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          {/* Form / Protocol Reference Code */}
          <div className="form-group" style={{ gridColumn: "span 2" }}>
            <label className="form-label" style={{ fontSize: "0.78rem" }}>Form / Protocol Ref Code *</label>
            <div style={{ position: "relative" }}>
              <FileText size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#0D9488" }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: "34px", fontWeight: 700, fontFamily: "monospace" }}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. (QAP-009/F2-02)"
                required
              />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginBottom: "1rem" }}>
          {/* Company Name Line */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.78rem" }}>Company Header Line</label>
            <div style={{ position: "relative" }}>
              <Building2 size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#0D9488" }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: "34px", fontWeight: 600 }}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          {/* Register Document Title */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.78rem" }}>Register Document Title</label>
            <input
              type="text"
              className="form-input"
              style={{ fontWeight: 700 }}
              value={registerTitle}
              onChange={(e) => setRegisterTitle(e.target.value)}
            />
          </div>
        </div>

        {/* FILTER SELECTION PANEL */}
        <div style={{ background: "#F8F6F0", border: "1px solid #EAE7E1", borderRadius: "10px", padding: "1rem", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 800, color: "#374151", marginBottom: "0.6rem" }}>
            Filter Records to Include in PDF Register ({filteredDocs.length} records selected):
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: "#6B7280", display: "block", marginBottom: "2px" }}>Category</label>
              <select
                className="form-input"
                style={{ padding: "0.35rem 0.5rem", fontSize: "0.8rem", background: "#FFFFFF" }}
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
              >
                <option value="ALL">All Documents ({documents.length})</option>
                <option value="BMR_BPR">BMR & BPR Only</option>
                <option value="FORMS">Forms & Incidents</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", color: "#6B7280", display: "block", marginBottom: "2px" }}>From Date</label>
              <input
                type="date"
                className="form-input"
                style={{ padding: "0.35rem 0.5rem", fontSize: "0.8rem", background: "#FFFFFF" }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", color: "#6B7280", display: "block", marginBottom: "2px" }}>To Date</label>
              <input
                type="date"
                className="form-input"
                style={{ padding: "0.35rem 0.5rem", fontSize: "0.8rem", background: "#FFFFFF" }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* MODAL ACTION BUTTONS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #EAE7E1", paddingTop: "1rem" }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{ background: "#FFFFFF", color: "#0F766E", border: "1.5px solid #0D9488", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.84rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <FileSpreadsheet size={16} />
            Export CSV
          </button>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              style={{
                background: "linear-gradient(135deg, #0F766E, #0E7490)",
                color: "white",
                padding: "0.6rem 1.35rem",
                borderRadius: "8px",
                fontSize: "0.86rem",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(15, 118, 110, 0.35)",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem"
              }}
            >
              <Download size={17} />
              Generate Official PDF Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
