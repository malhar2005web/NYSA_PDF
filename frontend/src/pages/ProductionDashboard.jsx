import React, { useState, useEffect } from "react";
import { Eye, FileText, Lock, Printer, RefreshCcw, CheckCircle, Plus, Send, Clock, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DocumentViewerModal } from "../components/DocumentViewerModal";
import { ReprintModal, RequestBmrBprModal } from "../components/ReprintModal";

function renderStatusBadge(statusRaw) {
  const status = (statusRaw || "ISSUED").toUpperCase();
  if (status === "PENDING_PRINT" || status === "PENDING") {
    return (
      <span style={{
        background: "#FEF3C7",
        color: "#B45309",
        border: "1px solid #FDE68A",
        padding: "0.25rem 0.65rem",
        borderRadius: "9999px",
        fontSize: "0.72rem",
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        letterSpacing: "0.02em",
        boxShadow: "0 1px 3px rgba(245, 158, 11, 0.12)",
        whiteSpace: "nowrap"
      }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#F59E0B" }}></span>
        Pending
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span style={{
        background: "#FEE2E2",
        color: "#DC2626",
        border: "1px solid #FCA5A5",
        padding: "0.25rem 0.65rem",
        borderRadius: "9999px",
        fontSize: "0.72rem",
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        letterSpacing: "0.02em",
        boxShadow: "0 1px 3px rgba(220, 38, 38, 0.12)",
        whiteSpace: "nowrap"
      }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EF4444" }}></span>
        Rejected
      </span>
    );
  }
  if (status === "PRINTED") {
    return (
      <span style={{
        background: "#CCFBF1",
        color: "#0D9488",
        border: "1px solid #99F6E4",
        padding: "0.25rem 0.65rem",
        borderRadius: "9999px",
        fontSize: "0.72rem",
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        letterSpacing: "0.02em",
        boxShadow: "0 1px 3px rgba(13, 148, 136, 0.12)",
        whiteSpace: "nowrap"
      }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0D9488" }}></span>
        Printed
      </span>
    );
  }
  return (
    <span style={{
      background: "#D1FAE5",
      color: "#059669",
      border: "1px solid #A7F3D0",
      padding: "0.25rem 0.65rem",
      borderRadius: "9999px",
      fontSize: "0.72rem",
      fontWeight: 800,
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      letterSpacing: "0.02em",
      boxShadow: "0 1px 3px rgba(16, 185, 129, 0.12)",
      whiteSpace: "nowrap"
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }}></span>
      Issued
    </span>
  );
}

export function ProductionDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("received"); // 'received' or 'requests'
  const [documents, setDocuments] = useState([]);
  const [requisitions, setRequisitions] = useState([]);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const [reprintDoc, setReprintDoc] = useState(null);
  const [isReprintOpen, setIsReprintOpen] = useState(false);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchReceivedDocuments();
    fetchRequisitions();
  }, []);

  async function fetchReceivedDocuments() {
    try {
      const res = await fetch("/api/v1/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchRequisitions() {
    try {
      const res = await fetch("/api/v1/requisitions");
      const data = await res.json();
      if (data.success) {
        setRequisitions(data.requisitions || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  const pendingReqCount = requisitions.filter(r => r.status === "PENDING").length;

  return (
    <div className="app-container">
      {/* Toast Bar */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 1000,
          background: "#0D9488", color: "white", padding: "0.85rem 1.5rem",
          borderRadius: "12px", boxShadow: "0 10px 25px rgba(13,148,136,0.3)",
          fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          <CheckCircle size={18} />
          {toast}
        </div>
      )}

      {/* Production Header & Top Action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1F2937" }}>
            Production Batch Operations
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#6B7280", fontWeight: 500 }}>
            Request new BMR/BPR batch documents from QA and access issued records for controlled printing.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* User Profile Card */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            background: "#FFFFFF", border: "1px solid #CBD5E1", padding: "0.5rem 0.95rem",
            borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "#ECFEFF", color: "#0891B2", display: "flex",
              alignItems: "center", justifyContent: "center", fontWeight: 800
            }}>
              <User size={20} />
            </div>
            <div>
              <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1F2937", margin: 0, lineHeight: 1.2 }}>
                {user?.full_name || "Amit Verma (Plant Officer)"}
              </p>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0891B2" }}>
                Production Operator
              </span>
            </div>
          </div>

        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="btn-primary"
          style={{
            padding: "0.85rem 1.75rem",
            fontSize: "1.05rem",
            fontWeight: 800,
            borderRadius: "12px",
            boxShadow: "0 6px 20px rgba(13, 148, 136, 0.35)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            letterSpacing: "0.2px"
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
          Request BMR / BPR Document
        </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid #E2E8F0", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setActiveTab("received")}
          style={{
            padding: "0.65rem 1.25rem", fontWeight: 700, fontSize: "0.92rem",
            background: "none", border: "none", cursor: "pointer",
            borderBottom: activeTab === "received" ? "3px solid #0D9488" : "3px solid transparent",
            color: activeTab === "received" ? "#0D9488" : "#64748B",
            display: "flex", alignItems: "center", gap: "0.4rem"
          }}
        >
          <FileText size={18} />
          Received Documents ({documents.length})
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          style={{
            padding: "0.65rem 1.25rem", fontWeight: 700, fontSize: "0.92rem",
            background: "none", border: "none", cursor: "pointer",
            borderBottom: activeTab === "requests" ? "3px solid #0D9488" : "3px solid transparent",
            color: activeTab === "requests" ? "#0D9488" : "#64748B",
            display: "flex", alignItems: "center", gap: "0.5rem"
          }}
        >
          <Clock size={18} />
          My Requisitions
          {pendingReqCount > 0 && (
            <span style={{ background: "#F59E0B", color: "white", borderRadius: "999px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 800 }}>
              {pendingReqCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: RECEIVED DOCUMENTS TABLE */}
      {activeTab === "received" && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Document Type</th>
                <th>Batch Number</th>
                <th>Issuance Number</th>
                <th>Sent By</th>
                <th>Received Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3.5rem", color: "#9CA3AF" }}>
                    <FileText size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                    <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>No documents received yet</p>
                    <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                      Click <strong>"+ Request BMR / BPR Document"</strong> above to request a new batch issuance from QA.
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 700, color: "#1F2937" }}>{doc.document_name}</td>
                    <td>
                      <span style={{
                        padding: "0.2rem 0.55rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 800,
                        background: doc.document_type === "BMR" ? "#E6F4F1" : "#ECFEFF",
                        color: doc.document_type === "BMR" ? "#0F766E" : "#0891B2",
                      }}>
                        {doc.document_type}
                      </span>
                    </td>
                    <td><span className="mono-tag">{doc.batch_number}</span></td>
                    <td>
                      <span className="mono-tag" style={{ color: "#0F766E", background: "#E6F4F1" }}>
                        {doc.issuance_number}
                      </span>
                    </td>
                    <td>{doc.sent_by_name || "QA Lead"}</td>
                    <td>
                      {(() => {
                        const rawDate = doc.received_date || doc.assigned_at || doc.created_at || doc.issued_date;
                        if (!rawDate) return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                        try {
                          const d = new Date(rawDate);
                          return isNaN(d.getTime()) ? rawDate : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                        } catch (e) {
                          return String(rawDate);
                        }
                      })()}
                    </td>
                    <td>
                      {renderStatusBadge(doc.status)}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setIsViewerOpen(true);
                        }}
                        className="btn-primary"
                        style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}
                      >
                        <Eye size={15} />
                        Open Document
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: REQUISITION REQUESTS TABLE */}
      {activeTab === "requests" && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Type</th>
                <th>Batch Number</th>
                <th>Batch Size</th>
                <th>Requested Date</th>
                <th>QA Status</th>
                <th>Notes / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3.5rem", color: "#9CA3AF" }}>
                    <Clock size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                    <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>No requisition requests submitted yet</p>
                    <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                      Submit your first BMR or BPR issuance request to QA using the button above.
                    </p>
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 700, color: "#1F2937" }}>{req.product_name}</td>
                    <td>
                      <span style={{
                        padding: "0.2rem 0.55rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 800,
                        background: req.document_type === "BMR" ? "#E6F4F1" : "#ECFEFF",
                        color: req.document_type === "BMR" ? "#0F766E" : "#0891B2",
                      }}>
                        {req.document_type}
                      </span>
                    </td>
                    <td><span className="mono-tag">{req.batch_number}</span></td>
                    <td>{req.batch_size || "Standard"}</td>
                    <td>{new Date(req.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>
                      {renderStatusBadge(req.status)}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "#4B5563" }}>
                      {req.review_notes ? <span style={{ color: "#DC2626", fontWeight: 600 }}>QA Note: {req.review_notes}</span> : (req.remarks || "—")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Controlled Viewer & Reprint Request Modals */}
      <DocumentViewerModal
        document={selectedDoc}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        onRefresh={() => fetchReceivedDocuments()}
        onRequestReprint={(d) => {
          setReprintDoc(d);
          setIsReprintOpen(true);
        }}
      />

      <ReprintModal
        document={reprintDoc}
        isOpen={isReprintOpen}
        onClose={() => setIsReprintOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchReceivedDocuments();
        }}
      />

      <RequestBmrBprModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchRequisitions();
          setActiveTab("requests");
        }}
      />
    </div>
  );
}
