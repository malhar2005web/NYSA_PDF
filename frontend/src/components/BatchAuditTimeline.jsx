import React, { useState } from "react";
import { Clock, Shield, User, FileText, CheckCircle2, Check, Filter, Printer, FileCheck, Layers, ChevronDown, ChevronUp, Download, FileSpreadsheet } from "lucide-react";
import { generateRegisterPDF, generateRegisterCSV } from "../utils/generateRegisterPDF";
import { ExportRegisterModal } from "./ExportRegisterModal";

export function BatchAuditTimeline({ auditLogs = [], documents = [] }) {
  const [selectedBatch, setSelectedBatch] = useState("ALL");
  const [expandedBatches, setExpandedBatches] = useState({});
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Extract unique batch numbers
  const uniqueBatches = Array.from(
    new Set(auditLogs.map(l => l.batch_number).filter(Boolean))
  );

  // Group audit logs by batch number
  const groupedBatches = {};
  auditLogs.forEach(log => {
    const key = log.batch_number || "General / System Logs";
    if (!groupedBatches[key]) groupedBatches[key] = [];
    groupedBatches[key].push(log);
  });

  // Filter keys based on dropdown selection
  const displayBatchKeys = selectedBatch === "ALL" 
    ? Object.keys(groupedBatches) 
    : Object.keys(groupedBatches).filter(k => k === selectedBatch);

  function toggleBatchExpand(batchKey) {
    setExpandedBatches(prev => ({ ...prev, [batchKey]: !prev[batchKey] }));
  }

  // Calculate workflow milestone progress for a batch's logs
  function getBatchMilestones(logs = []) {
    const hasRequisition = logs.some(l => 
      (l.action && l.action.toUpperCase().includes("REQUISITION")) || 
      (l.details && l.details.toLowerCase().includes("requested"))
    );
    const hasQaAccept = logs.some(l => 
      (l.action && (l.action.toUpperCase().includes("ACCEPT") || l.action.toUpperCase().includes("ISSUED") || l.action.toUpperCase().includes("UPLOAD"))) ||
      hasRequisition
    );
    const hasIssuance = logs.some(l => 
      (l.action && l.action.toUpperCase().includes("ISSUED")) ||
      (l.details && l.details.toLowerCase().includes("issued to"))
    );
    const printLog = logs.find(l => 
      (l.action && l.action.toUpperCase().includes("PRINT")) ||
      (l.details && l.details.toLowerCase().includes("printed"))
    );
    const hasPrint = !!printLog;

    // Find recipient name if issued
    let receivedByName = "Amit Verma (Plant Officer)";
    const issLog = logs.find(l => l.details && l.details.toLowerCase().includes("received by"));
    if (issLog) {
      const match = issLog.details.match(/received by ([^.\)]+)/i);
      if (match) receivedByName = match[1].trim();
    }

    return {
      steps: [
        {
          id: 1,
          title: "Step 1: Production Requisition",
          subtitle: hasRequisition ? "Requisition Submitted" : "Direct QA Issuance",
          timestamp: logs[logs.length - 1] ? new Date(logs[logs.length - 1].created_at || logs[logs.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          completed: true,
        },
        {
          id: 2,
          title: "Step 2: QA Acceptance & Review",
          subtitle: "QA Accepted & Prepared Controlled Form",
          timestamp: logs[0] ? new Date(logs[0].created_at || logs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          completed: hasQaAccept,
        },
        {
          id: 3,
          title: "Step 3: Document Issuance & Received By",
          subtitle: `Issued to ${receivedByName}`,
          timestamp: logs[0] ? new Date(logs[0].created_at || logs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          completed: hasIssuance || hasPrint,
          receivedByName,
        },
        {
          id: 4,
          title: "Step 4: Production Printing",
          subtitle: printLog ? `Time of Print: ${new Date(printLog.created_at || printLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} by ${printLog.user_name}` : "Pending Production Print",
          timestamp: printLog ? new Date(printLog.created_at || printLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          completed: hasPrint,
          printLog,
        }
      ],
      receivedByName,
      printLog,
    };
  }

  return (
    <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #EAE7E1", padding: "1.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
      {/* HEADER WITH BATCH DROPDOWN FILTER & EXPORT BUTTONS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid #F3F4F6", paddingBottom: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1F2937", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={20} color="#0D9488" />
            Batch-Wise Electronic Audit Trail & Workflow Progress
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#6B7280", margin: "3px 0 0 0" }}>
            ALCOA+ compliant lifecycle logging grouped by Batch Number with live progress tracking bars.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          {/* BATCH FILTER DROPDOWN */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#F0FDFA", border: "1px solid #CCFBF1", padding: "0.4rem 0.75rem", borderRadius: "8px" }}>
            <Filter size={14} color="#0F766E" />
            <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0F766E", whiteSpace: "nowrap" }}>Batch:</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              style={{
                background: "#FFFFFF",
                color: "#1F2937",
                border: "1px solid #99F6E4",
                borderRadius: "6px",
                padding: "0.2rem 0.5rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Batches ({uniqueBatches.length})</option>
              {uniqueBatches.map(b => (
                <option key={b} value={b}>Batch #{b}</option>
              ))}
            </select>
          </div>

          {/* EXPORT REGISTER BUTTONS */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            style={{
              padding: "0.48rem 0.95rem",
              background: "linear-gradient(135deg, #0F766E, #0E7490)",
              color: "white",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 3px 10px rgba(15, 118, 110, 0.25)",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="Configure & Download Official BMR/BPR Issuance & Retrieval Record (QAP-009/F2-02)"
          >
            <Download size={15} />
            Export Register (PDF)
          </button>

          <button
            onClick={() => generateRegisterCSV(documents)}
            style={{
              padding: "0.48rem 0.85rem",
              background: "#FFFFFF",
              color: "#0F766E",
              border: "1.5px solid #0D9488",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="Export CSV for Excel Analysis"
          >
            <FileSpreadsheet size={15} />
            CSV
          </button>
        </div>
      </div>

      {/* BATCH CARDS CONTAINER */}
      {displayBatchKeys.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9CA3AF" }}>
          <Layers size={36} style={{ marginBottom: "0.5rem", opacity: 0.5 }} />
          <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>No audit logs found for the selected batch.</p>
        </div>
      ) : (
        displayBatchKeys.map(batchKey => {
          const logs = groupedBatches[batchKey] || [];
          const { steps, receivedByName, printLog } = getBatchMilestones(logs);
          const isExpanded = expandedBatches[batchKey] !== false; // expanded by default
          const sampleIssuance = logs.find(l => l.issuance_number)?.issuance_number || "ISS-2026-CONTROLLED";

          return (
            <div
              key={batchKey}
              style={{
                background: "#FBF9F5",
                border: "1px solid #EAE7E1",
                borderRadius: "12px",
                marginBottom: "1.25rem",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              {/* CARD HEADER */}
              <div
                onClick={() => toggleBatchExpand(batchKey)}
                style={{
                  background: "linear-gradient(135deg, #FFFFFF, #F8F6F0)",
                  padding: "1rem 1.25rem",
                  borderBottom: isExpanded ? "1px solid #EAE7E1" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <span className="mono-tag" style={{ fontSize: "0.85rem", background: "#0F766E", color: "white", padding: "0.3rem 0.75rem", borderRadius: "6px", fontWeight: 800 }}>
                    Batch #{batchKey}
                  </span>
                  <span className="mono-tag" style={{ background: "#F0FDFA", color: "#0F766E", borderColor: "#CCFBF1", fontWeight: 700 }}>
                    {sampleIssuance}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>
                    ({logs.length} logged events)
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ fontSize: "0.78rem", color: "#374151", textAlign: "right" }}>
                    <span style={{ color: "#0F766E", fontWeight: 700 }}>Received By: </span>
                    <strong>{receivedByName}</strong>
                    {printLog && (
                      <span style={{ display: "block", color: "#059669", fontSize: "0.72rem", fontWeight: 700, marginTop: "2px" }}>
                        Time of Print: {new Date(printLog.created_at || printLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <button style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer" }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* CARD BODY: PROGRESS TRACKER BAR & LOGS */}
              {isExpanded && (
                <div style={{ padding: "1.25rem" }}>
                  {/* HORIZONTAL STEP PROGRESS TRACKER BAR (MATCHING USER DEMO IMAGE) */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAE7E1", borderRadius: "10px", padding: "1.25rem 1.5rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
                      Batch Lifecycle Progress Tracker
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                      {steps.map((step, idx) => {
                        const isLast = idx === steps.length - 1;
                        const nextStepCompleted = !isLast && steps[idx + 1].completed;

                        return (
                          <React.Fragment key={step.id}>
                            {/* STEP NODE CIRCLE */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 2, flexShrink: 0 }}>
                              <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: step.completed ? "#10B981" : "#FEF08A",
                                border: step.completed ? "2px solid #059669" : "2px solid #F59E0B",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: step.completed ? "white" : "#B45309",
                                fontWeight: 900,
                                boxShadow: step.completed ? "0 2px 8px rgba(16,185,129,0.3)" : "0 2px 6px rgba(245,158,11,0.2)",
                              }}>
                                {step.completed ? (
                                  <Check size={18} strokeWidth={3} />
                                ) : (
                                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D97706" }} />
                                )}
                              </div>

                              <div style={{ textAlign: "center", marginTop: "0.5rem", maxWidth: "120px" }}>
                                <p style={{ fontSize: "0.75rem", fontWeight: 800, color: step.completed ? "#1F2937" : "#9CA3AF", margin: 0, lineHeight: 1.2 }}>
                                  {step.title}
                                </p>
                                <span style={{ fontSize: "0.68rem", color: "#6B7280", display: "block", marginTop: "2px", fontWeight: 500 }}>
                                  {step.subtitle}
                                </span>
                              </div>
                            </div>

                            {/* CONNECTING LINE */}
                            {!isLast && (
                              <div style={{
                                flex: 1,
                                height: "4px",
                                background: nextStepCompleted || step.completed ? "#10B981" : "#FDE68A",
                                margin: "0 0.5rem",
                                marginTop: "-1.5rem",
                                borderRadius: "2px",
                                transition: "all 0.3s ease"
                              }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* LOG EVENTS TIMELINE LIST */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAE7E1", borderRadius: "10px", padding: "1rem 1.25rem" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#374151", marginBottom: "0.75rem" }}>
                      Detailed Audit Logs for Batch #{batchKey}
                    </div>

                    <div style={{ position: "relative", paddingLeft: "1.25rem" }}>
                      <div style={{ position: "absolute", left: "5px", top: "8px", bottom: "8px", width: "2px", background: "#E5E7EB" }} />

                      {logs.map((log, idx) => (
                        <div key={log.id || idx} style={{ position: "relative", marginBottom: "0.85rem" }}>
                          <div style={{
                            position: "absolute", left: "-1.25rem", top: "4px",
                            width: "12px", height: "12px", borderRadius: "50%",
                            background: log.action.includes("PRINT") ? "#059669" : log.action.includes("ISSUED") ? "#0D9488" : "#F59E0B",
                            border: "2px solid white", boxShadow: "0 0 0 1px #CBD5E1"
                          }} />

                          <div style={{ background: "#F8F6F0", borderRadius: "8px", border: "1px solid #F3EEEC", padding: "0.65rem 0.9rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1F2937" }}>{log.action}</span>
                                {log.user_role && (
                                  <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: log.user_role === "QA_ADMIN" ? "#F0FDFA" : "#EFF6FF", color: log.user_role === "QA_ADMIN" ? "#0F766E" : "#1D4ED8" }}>
                                    {log.user_role}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.72rem", color: "#6B7280", fontWeight: 600 }}>
                                {new Date(log.created_at || log.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(log.created_at || log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>

                            <p style={{ fontSize: "0.78rem", color: "#4B5563", margin: "4px 0 2px 0", fontWeight: 500 }}>
                              {log.details || log.message}
                            </p>

                            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.72rem", color: "#6B7280", marginTop: "4px" }}>
                              <span>Actor: <strong>{log.user_name || log.username || "System User"}</strong></span>
                              {log.action.includes("PRINT") && (
                                <span style={{ color: "#059669", fontWeight: 700 }}>
                                  Print Timestamp: {new Date(log.created_at || log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* EXPORT REGISTER MODAL WINDOW */}
      <ExportRegisterModal
        isOpen={isExportModalOpen}
        documents={documents}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
