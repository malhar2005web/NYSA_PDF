import React, { useState, useEffect } from "react";
import {
  FileText, Upload, Printer, AlertTriangle, CheckCircle, Clock, Search,
  Filter, Eye, Edit3, Send, ShieldAlert, ChevronRight, FileCheck, Plus, XCircle, User
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UploadModal } from "../components/UploadModal";
import { DocumentViewerModal } from "../components/DocumentViewerModal";
import { ReviewReprintModal } from "../components/ReprintModal";
import { BatchAuditTimeline } from "../components/BatchAuditTimeline";
import { RBACManagement } from "../components/RBACManagement";

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

export function QADashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [stats, setStats] = useState({
    uploadedToday: 0,
    pendingPrint: 0,
    printed: 0,
    reprintRequests: 0,
    totalDocuments: 0,
  });
  const [activeTab, setActiveTab] = useState("requisitions");
  const [auditLogs, setAuditLogs] = useState([]);
  const [reprintRequests, setReprintRequests] = useState([]);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [presetRequisition, setPresetRequisition] = useState(null);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedReprintReq, setSelectedReprintReq] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchDocuments();
    fetchRequisitions();
    fetchReprintRequests();
    if (activeTab === "audit") fetchAuditLogs();
  }, [activeTab]);

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/v1/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents || []);
        if (data.stats) setStats(data.stats);
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

  async function fetchAuditLogs() {
    try {
      const res = await fetch("/api/v1/audit");
      const data = await res.json();
      if (data.success) setAuditLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchReprintRequests() {
    try {
      const res = await fetch("/api/v1/prints/reprint-requests");
      const data = await res.json();
      if (data.success) setReprintRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRejectRequisition(reqId) {
    const reason = window.prompt("Enter rejection reason for Production Operator:");
    if (reason === null) return;

    try {
      const res = await fetch(`/api/v1/requisitions/${reqId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Requisition request rejected");
        fetchRequisitions();
      }
    } catch (e) {
      console.error(e);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  const pendingRequisitionCount = requisitions.filter(r => r.status === "PENDING").length;
  const todayStr = new Date().toDateString();
  const issuedTodayCount = documents.filter(d => d.created_at && new Date(d.created_at).toDateString() === todayStr).length || documents.length;
  const printedCount = documents.filter(d => (d.print_count && d.print_count > 0) || d.status === "PRINTED").length;
  const pendingReprintCount = reprintRequests.filter(r => r.status === "PENDING").length;
  const totalDocumentsCount = documents.length;

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.issuance_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || d.document_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="app-container">
      {/* Toast Notification Bar */}
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

      {/* Top Header & User Profile Card */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#1F2937" }}>
            QA / Admin Controlled Issuance Dashboard
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#6B7280", fontWeight: 500 }}>
            Fulfill Production BMR/BPR requests, manage document issuance, and monitor audit trails.
          </p>
        </div>

        {/* User Profile Card with Icon */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          background: "#FFFFFF", border: "1px solid #CBD5E1", padding: "0.5rem 0.95rem",
          borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
        }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "#E6F4F1", color: "#0F766E", display: "flex",
            alignItems: "center", justifyContent: "center", fontWeight: 800
          }}>
            <User size={20} />
          </div>
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1F2937", margin: 0, lineHeight: 1.2 }}>
              {user?.full_name || "Dr. Rajesh Sharma (QA Lead)"}
            </p>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0F766E" }}>
              QA / Admin Lead
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-value" style={{ color: "#D97706" }}>{pendingRequisitionCount}</div>
            <div className="stat-label">Pending Requests</div>
          </div>
          <div className="stat-icon-bg" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-value">{issuedTodayCount}</div>
            <div className="stat-label">Issued Today</div>
          </div>
          <div className="stat-icon-bg" style={{ background: "#E6F4F1", color: "#0D9488" }}>
            <Upload size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-value" style={{ color: "#059669" }}>{printedCount}</div>
            <div className="stat-label">Printed</div>
          </div>
          <div className="stat-icon-bg" style={{ background: "#D1FAE5", color: "#059669" }}>
            <Printer size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-value" style={{ color: "#DC2626" }}>{pendingReprintCount}</div>
            <div className="stat-label">Reprint Requests</div>
          </div>
          <div className="stat-icon-bg" style={{ background: "#FEE2E2", color: "#DC2626" }}>
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-value">{totalDocumentsCount}</div>
            <div className="stat-label">Total Documents</div>
          </div>
          <div className="stat-icon-bg" style={{ background: "#ECFEFF", color: "#0891B2" }}>
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Nav Pills for QA Modules */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div className="nav-pills">
          <button
            className={`nav-pill ${activeTab === "requisitions" ? "active" : ""}`}
            onClick={() => setActiveTab("requisitions")}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            Production Requisitions
            {pendingRequisitionCount > 0 && (
              <span style={{ background: "#F59E0B", color: "white", borderRadius: "999px", padding: "2px 8px", fontSize: "0.72rem", fontWeight: 800 }}>
                {pendingRequisitionCount}
              </span>
            )}
          </button>
          <button
            className={`nav-pill ${activeTab === "documents" ? "active" : ""}`}
            onClick={() => setActiveTab("documents")}
          >
            Issued Directory ({documents.length})
          </button>
          <button
            className={`nav-pill ${activeTab === "reprints" ? "active" : ""}`}
            onClick={() => setActiveTab("reprints")}
          >
            Reprint Requests ({reprintRequests.filter(r => r.status === "PENDING").length})
          </button>
          <button
            className={`nav-pill ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            Audit Logs (Read-Only)
          </button>
          <button
            className={`nav-pill ${activeTab === "rbac" ? "active" : ""}`}
            onClick={() => setActiveTab("rbac")}
          >
            RBAC / Role Management
          </button>
        </div>

        {activeTab === "documents" && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "8px", color: "#9CA3AF" }} />
              <input
                type="text"
                placeholder="Search Batch / Issuance..."
                className="form-input"
                style={{ paddingLeft: "30px", width: "210px", padding: "0.4rem 0.6rem 0.4rem 30px", fontSize: "0.82rem" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="form-input"
              style={{ width: "110px", padding: "0.4rem 0.6rem", fontSize: "0.82rem" }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="BMR">BMR Only</option>
              <option value="BPR">BPR Only</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB: PRODUCTION REQUISITIONS */}
      {activeTab === "requisitions" && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Req ID</th>
                <th>Requested Product</th>
                <th>Type</th>
                <th>Batch Number</th>
                <th>Requested By</th>
                <th>Request Date</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3.5rem", color: "#9CA3AF" }}>
                    <Clock size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                    <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>No document requisitions received yet</p>
                    <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                      When Production operators request a BMR or BPR issuance, it will appear here for QA approval.
                    </p>
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => (
                  <tr key={req.id}>
                    <td>#{req.id}</td>
                    <td style={{ fontWeight: 700, color: "#1F2937" }}>
                      {req.product_name}
                      {req.remarks && <p style={{ fontSize: "0.74rem", color: "#64748B", margin: "2px 0 0 0", fontWeight: 400 }}>Note: "{req.remarks}"</p>}
                    </td>
                    <td>
                      <span style={{
                        padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 800,
                        background: req.document_type === "BMR" ? "#E6F4F1" : "#ECFEFF",
                        color: req.document_type === "BMR" ? "#0F766E" : "#0891B2",
                      }}>
                        {req.document_type}
                      </span>
                    </td>
                    <td><span className="mono-tag">{req.batch_number}</span></td>
                    <td style={{ fontWeight: 600 }}>{req.requested_by_name || "Production Operator"}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>{new Date(req.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>
                      <span style={{
                        padding: "0.25rem 0.65rem", borderRadius: "999px", fontSize: "0.74rem", fontWeight: 800,
                        background: req.status === "PENDING" ? "#FEF3C7" : req.status === "ISSUED" ? "#D1FAE5" : "#FEE2E2",
                        color: req.status === "PENDING" ? "#D97706" : req.status === "ISSUED" ? "#059669" : "#DC2626",
                      }}>
                        {req.status === "PENDING" ? "Pending QA Action" : req.status === "ISSUED" ? "Approved & Issued" : "Rejected"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {req.status === "PENDING" ? (
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                          <button
                            onClick={() => {
                              setPresetRequisition(req);
                              setIsUploadOpen(true);
                            }}
                            className="btn-primary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                          >
                            <Upload size={14} />
                            Fulfill & Issue
                          </button>
                          <button
                            onClick={() => handleRejectRequisition(req.id)}
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.78rem", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Fulfilled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 1: Documents Directory */}
      {activeTab === "documents" && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Issuance No</th>
                <th>Document Name</th>
                <th>Type</th>
                <th>Batch No</th>
                <th>Mfg Date</th>
                <th>Exp Date</th>
                <th>Issued By</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "#9CA3AF" }}>
                    No BMR/BPR documents found matching your search. Click "Upload & Issue Document" to add one.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="mono-tag" style={{ color: "#0F766E", background: "#E6F4F1" }}>
                        {doc.issuance_number}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#1F2937", maxWidth: "200px" }}>{doc.document_name}</td>
                    <td>
                      <span style={{
                        padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 800,
                        background: doc.document_type === "BMR" ? "#E6F4F1" : "#ECFEFF",
                        color: doc.document_type === "BMR" ? "#0F766E" : "#0891B2",
                      }}>
                        {doc.document_type}
                      </span>
                    </td>
                    <td><span className="mono-tag">{doc.batch_number}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>{doc.mfg_date}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{doc.expiry_date}</td>
                    <td style={{ color: "#374151", fontWeight: 600, fontSize: "0.78rem" }}>
                      {doc.issued_by || "Dr. Rajesh Sharma (QA Lead)"}
                    </td>
                    <td>
                      {renderStatusBadge(doc.status)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setIsViewerOpen(true);
                        }}
                        className="btn-secondary"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Reprint Requests */}
      {activeTab === "reprints" && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Req #</th>
                <th>Issuance No</th>
                <th>Batch No</th>
                <th>Requested By</th>
                <th>Reason</th>
                <th>Date / Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reprintRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#9CA3AF" }}>
                    No reprint authorization requests currently pending.
                  </td>
                </tr>
              ) : (
                reprintRequests.map((req) => (
                  <tr key={req.id}>
                    <td>#{req.id}</td>
                    <td><span className="mono-tag">{req.issuance_number}</span></td>
                    <td><span className="mono-tag">{req.batch_number}</span></td>
                    <td style={{ fontWeight: 600 }}>{req.requested_by_name}</td>
                    <td style={{ maxWidth: "250px", color: "#4B5563" }}>"{req.reason}"</td>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(req.requested_at).toLocaleString()}</td>
                    <td>
                      {renderStatusBadge(req.status)}
                    </td>
                    <td>
                      {req.status === "PENDING" ? (
                        <button
                          onClick={() => {
                            setSelectedReprintReq(req);
                            setIsReviewOpen(true);
                          }}
                          className="btn-primary"
                          style={{ padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                        >
                          Review
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Read-Only Audit Logs & Batch Progress Stepper */}
      {activeTab === "audit" && (
        <BatchAuditTimeline auditLogs={auditLogs} />
      )}

      {/* Tab 4: RBAC & User Role Management */}
      {activeTab === "rbac" && (
        <RBACManagement />
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        presetData={presetRequisition}
        onClose={() => { setIsUploadOpen(false); setPresetRequisition(null); }}
        onSuccess={(data) => {
          const num = data?.issuance_number || data?.document?.issuance_number || "Document";
          showToast(`Document issued & assigned: ${num}`);
          fetchDocuments();
          fetchRequisitions();
        }}
      />

      <DocumentViewerModal
        document={selectedDoc}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        onRefresh={() => fetchDocuments()}
      />

      <ReviewReprintModal
        request={selectedReprintReq}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchReprintRequests();
          fetchDocuments();
        }}
      />
    </div>
  );
}
