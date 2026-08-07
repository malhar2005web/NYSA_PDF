import React, { useState, useEffect } from "react";
import {
  X, Printer, RefreshCcw, Lock, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, ArrowLeft
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useAuth } from "../context/AuthContext";
import { PDFSejdaStage } from "./PDFSejdaStage";
import { getPresetFields } from "../utils/presetCoordinates";

export function DocumentViewerModal({ document: doc, isOpen, onClose, onRefresh, onRequestReprint }) {
  const { user } = useAuth();
  const [numPages, setNumPages] = useState(78);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.4);

  const [printing, setPrinting] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  const pdfUrl = doc?.original_file_path ? `/${doc.original_file_path}` : (doc?.stamped_file_path ? `/${doc.stamped_file_path}` : "/bmr.pdf");
  const isProduction = user?.role === "PRODUCTION";
  const printCount = doc?.print_count || 0;
  const allowedPrints = doc?.allowed_prints || 1;
  const canPrint = isProduction && printCount < allowedPrints;

  useEffect(() => {
    if (!isOpen || !doc) return;
    setCurrentPage(1);
  }, [isOpen, doc]);

  // Generate field array for View Mode using the EXACT SAME coordinate specification as Edit Mode
  const fields = [];
  const totalDocPages = numPages || doc?.total_pages || doc?.page_count || 78;
  const activeDocType = (doc?.document_type || "BMR").toUpperCase();
  const isBmrOrBpr = activeDocType === "BMR" || activeDocType === "BPR";
  const presets = getPresetFields(activeDocType);
  const batchPreset = presets.find(f => f.fieldName === "batch_number") || { x: 158, y: 134 };

  function getDocFieldValue(fName) {
    switch (fName) {
      case "batch_number": return doc?.batch_number;
      case "mfg_date": return doc?.mfg_date;
      case "expiry_date": return doc?.expiry_date;
      case "issued_by": return doc?.issued_by || "Dr. Rajesh Sharma";
      case "issued_date": return doc?.issued_date || doc?.created_at?.split("T")[0] || new Date().toISOString().split("T")[0];
      case "received_by": return doc?.received_by || "Amit Verma (Plant Officer)";
      default: return doc?.batch_number;
    }
  }

  if (isBmrOrBpr) {
    for (let p = 0; p < totalDocPages; p++) {
      if (p === 0) {
        fields.push(...presets.map(f => ({ ...f, value: getDocFieldValue(f.fieldName), fontSize: 11 })));
      } else {
        fields.push({
          id: `auto_batch_p${p}`,
          pageIndex: p,
          fieldName: "batch_number",
          label: "BATCH NO",
          value: doc?.batch_number,
          x: batchPreset.x,
          y: batchPreset.y,
          width: batchPreset.width || 130,
          height: batchPreset.height || 20,
          fontSize: 11,
          isBold: false,
          color: "#000000",
        });
      }
    }
  }

  // Include any custom fields saved with the document
  if (doc?.custom_fields && Array.isArray(doc.custom_fields)) {
    fields.push(...doc.custom_fields.map((cf, idx) => ({
      id: cf.id || `custom_doc_${idx}`,
      pageIndex: cf.pageIndex ?? 0,
      fieldName: cf.fieldName || `custom_${idx}`,
      label: cf.label || "Custom Field",
      value: cf.value || "",
      x: cf.x,
      y: cf.y,
      width: cf.width || 140,
      height: cf.height || 22,
      fontSize: cf.fontSize || 11,
      color: cf.color || "#000000",
      fontFamily: cf.fontFamily || "Helvetica, sans-serif",
      isBold: !!cf.isBold,
      isCustom: true,
    })));
  }

  /**
   * Same-Window Canvas-Based Pixel-Perfect Print Engine
   * Renders ALL pages using pdfjs into a hidden container in the SAME window,
   * injects @media print CSS to hide app and show only rendered pages,
   * calls window.print() directly — no new window, no redirect.
   */
  async function handlePrint() {
    if (isProduction && printCount >= allowedPrints) {
      setIsError(true);
      setMsg("Print limit reached! Original document can only be printed once. Request a reprint approval from QA.");
      return;
    }

    setPrinting(true);
    setMsg("Preparing all pages for print... please wait");
    setIsError(false);

    try {
      // 1. Load PDF via pdfjs — same pipeline as ViewModal
      let arrayBuffer = null;
      try {
        const res = await fetch(pdfUrl);
        if (res.ok) arrayBuffer = await res.arrayBuffer();
      } catch (e) { }
      if (!arrayBuffer) {
        const fallback = await fetch("/bmr.pdf");
        arrayBuffer = await fallback.arrayBuffer();
      }

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const printScale = 2.0; // High-res for crisp output

      // 2. Remove any previous print container & style
      const oldContainer = document.getElementById("__print_container__");
      if (oldContainer) oldContainer.remove();
      const oldStyle = document.getElementById("__print_style__");
      if (oldStyle) oldStyle.remove();

      // 3. Create hidden container in SAME document
      const printContainer = document.createElement("div");
      printContainer.id = "__print_container__";
      printContainer.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;z-index:-9999;";

      // 4. Render ALL pages to canvas → convert to <img> for reliable printing
      for (let i = 1; i <= totalPages; i++) {
        setMsg(`Rendering page ${i} of ${totalPages}...`);

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: printScale });

        // Create offscreen canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        // Render PDF page (pdfjs handles rotation correctly)
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Composite text overlays for this page (same fields as ViewModal)
        const pageFields = fields.filter(f => f.pageIndex === i - 1);
        for (const field of pageFields) {
          const val = field.value || "";
          if (!val || val.trim().length === 0) continue;
          ctx.save();
          ctx.font = `${field.isBold ? "bold " : ""}${(field.fontSize || 11) * printScale}px ${field.fontFamily || "Helvetica, Arial, sans-serif"}`;
          ctx.fillStyle = field.color || "#000000";
          ctx.textBaseline = "top";
          const fHeight = field.height || 20;
          const fSize = field.fontSize || 11;
          const vOffset = Math.max(0, (fHeight - fSize) / 2);
          ctx.fillText(val, field.x * printScale + 2, (field.y + vOffset) * printScale);
          ctx.restore();
        }

        // Composite header stamp box (top-right)
        const stampText = doc.issuance_number || "ISS-2026-000001";
        ctx.save();
        ctx.font = `${10 * printScale}px Helvetica, Arial, sans-serif`;
        const stampW = ctx.measureText(stampText).width + 24 * printScale;
        const stampH = 22 * printScale;
        const stampX = viewport.width - stampW - 20 * printScale;
        const stampY = 12 * printScale;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillRect(stampX, stampY, stampW, stampH);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(stampX, stampY, stampW, stampH);
        ctx.fillStyle = "#000000";
        ctx.textBaseline = "top";
        ctx.fillText(stampText, stampX + 12 * printScale, stampY + 4 * printScale);
        ctx.restore();

        // Composite COMPLETED green rubber stamp on Page 1
        if (i === 1) {
          try {
            const stampImg = new Image();
            stampImg.src = "/completed_stamp.jpg";
            await new Promise((resolve) => {
              stampImg.onload = resolve;
              stampImg.onerror = resolve;
            });
            if (stampImg.complete && stampImg.naturalWidth > 0) {
              ctx.save();
              ctx.globalCompositeOperation = "multiply";
              ctx.globalAlpha = 0.92;
              const imgW = 105 * printScale;
              const imgH = (stampImg.naturalHeight / stampImg.naturalWidth) * imgW;
              const imgX = viewport.width - imgW - 185 * printScale;
              const imgY = 10 * printScale;
              ctx.drawImage(stampImg, imgX, imgY, imgW, imgH);
              ctx.restore();
            }
          } catch (e) {
            console.error("Print canvas stamp error:", e);
          }
        }

        // Convert canvas to <img> (more reliable for print than raw canvas)
        const img = document.createElement("img");
        img.src = canvas.toDataURL("image/png");
        img.className = "__print_page__";

        const pageDiv = document.createElement("div");
        pageDiv.className = "__print_page_wrap__";
        pageDiv.appendChild(img);
        printContainer.appendChild(pageDiv);
      }

      document.body.appendChild(printContainer);

      // 5. Inject @media print stylesheet: hide app, show ONLY print pages
      const printStyle = document.createElement("style");
      printStyle.id = "__print_style__";
      printStyle.textContent = `
        @media print {
          @page {
            margin: 0;
            size: portrait;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide EVERYTHING in the app */
          body > *:not(#__print_container__) {
            display: none !important;
            visibility: hidden !important;
          }
          /* Show print container */
          #__print_container__ {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            z-index: 9999 !important;
            background: white !important;
          }
          .__print_page_wrap__ {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .__print_page_wrap__:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .__print_page__ {
            max-width: 100% !important;
            max-height: 99.5vh !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
            display: block !important;
          }
        }
      `;
      document.head.appendChild(printStyle);

      setMsg("All pages ready! Opening print dialog...");

      // 6. Trigger print dialog in SAME window (small delay for images to load)
      await new Promise(r => setTimeout(r, 500));
      window.print();

      // 7. Cleanup after print dialog closes
      printContainer.remove();
      printStyle.remove();

      // 8. Record print on backend
      try {
        const res = await fetch(`/api/v1/prints/${doc.id}/print`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.success) {
          setMsg(data.message || "Document printed successfully (1/1). Print button is now disabled until reprint authorization.");
          setIsError(false);
          if (onRefresh) onRefresh();
        } else {
          setMsg(data.message || "Failed to record print execution");
          setIsError(true);
        }
      } catch (e) {
        console.warn("Print record API error:", e);
      }

      setPrinting(false);
    } catch (err) {
      console.error("Canvas print error:", err);
      setMsg("Error executing print handler: " + err.message);
      setIsError(true);
      setPrinting(false);
      // Cleanup on error
      const c = document.getElementById("__print_container__");
      if (c) c.remove();
      const s = document.getElementById("__print_style__");
      if (s) s.remove();
    }
  }

  if (!isOpen || !doc) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#FBF9F5", display: "flex", flexDirection: "column" }}>
      {/* NYSA BIOMED TEAL GRADIENT HEADER TOOLBAR */}
      <div style={{ background: "linear-gradient(135deg, #0F766E, #0E7490)", borderBottom: "1px solid #0D9488", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.18)", color: "white", padding: "0.4rem 0.85rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", border: "1px solid rgba(255,255,255,0.25)" }}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#E0F2FE", fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace" }}>
                {doc.issuance_number}
              </span>
              <h3 style={{ color: "white", fontSize: "1.08rem", fontWeight: 800 }}>
                {doc.document_name}
              </h3>
              <span style={{
                background: "rgba(255,255,255,0.2)",
                color: "#99F6E4",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.72rem",
                fontWeight: 800,
              }}>
                {doc.status}
              </span>
            </div>
            <p style={{ fontSize: "0.76rem", color: "#CCFBF1", marginTop: "2px", fontWeight: 500 }}>
              Batch: <strong style={{ color: "#FFFFFF" }}>{doc.batch_number}</strong> | Mfg: {doc.mfg_date} | Exp: {doc.expiry_date} | Issued By: {doc.issued_by || "Dr. Rajesh Sharma (QA Lead)"}
            </p>
          </div>
        </div>

        {/* PAGE NAVIGATION & ZOOM CONTROLS */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(0,0,0,0.18)", padding: "0.35rem 0.85rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)" }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            style={{ color: "white", opacity: currentPage <= 1 ? 0.4 : 1, cursor: currentPage <= 1 ? "default" : "pointer" }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ color: "white", fontSize: "0.85rem", fontWeight: 800 }}>
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            style={{ color: "white", opacity: currentPage >= numPages ? 0.4 : 1, cursor: currentPage >= numPages ? "default" : "pointer" }}
          >
            <ChevronRight size={18} />
          </button>

          <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.3)", margin: "0 0.25rem" }} />

          <button onClick={() => setScale(s => Math.max(0.8, s - 0.15))} style={{ color: "white" }}>
            <ZoomOut size={16} />
          </button>
          <span style={{ color: "#99F6E4", fontSize: "0.82rem", fontWeight: 800 }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.15))} style={{ color: "white" }}>
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setScale(1.4)} style={{ color: "white", display: "flex", alignItems: "center", gap: "3px", fontSize: "0.75rem", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }} title="Fit Page Width">
            <Maximize size={12} /> Fit Width
          </button>
        </div>

        {/* PRINT / REPRINT / QA AUDIT ACTIONS */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isProduction ? (
            canPrint ? (
              <button
                onClick={handlePrint}
                disabled={printing}
                style={{
                  padding: "0.6rem 1.4rem",
                  background: "#10B981",
                  color: "white",
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <Printer size={17} />
                {printing ? "Printing..." : "Print Document"}
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#EF4444", background: "#FEE2E2", padding: "0.4rem 0.75rem", borderRadius: "8px", border: "1px solid #FCA5A5" }}>
                  <Lock size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  Print Locked (1/1 Used)
                </span>
                <button onClick={() => onRequestReprint(doc)} className="btn-tiffany">
                  <RefreshCcw size={16} />
                  Request Reprint
                </button>
              </div>
            )
          ) : (() => {
            const recipientName = doc?.received_by || "";
            const hasAssignedRecipient = recipientName.trim().length > 0 &&
              !recipientName.toLowerCase().includes("qa direct") &&
              !recipientName.toLowerCase().includes("self");

            if (hasAssignedRecipient) {
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#FEF08A", background: "rgba(245, 158, 11, 0.2)", padding: "0.45rem 0.85rem", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
                    <Send size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                    Sent to: {recipientName} (Print Active on Recipient Side Only)
                  </span>
                </div>
              );
            }

            return (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  onClick={handlePrint}
                  disabled={printing}
                  style={{
                    padding: "0.6rem 1.4rem",
                    background: "#10B981",
                    color: "white",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                >
                  <Printer size={17} />
                  {printing ? "Printing..." : "Print Document (QA Direct)"}
                </button>
                <span style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  color: "#99F6E4",
                  background: "rgba(255,255,255,0.18)",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  letterSpacing: "0.02em"
                }}>
                  QA Direct Print Mode
                </span>
              </div>
            );
          })()}

          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", padding: "0.45rem", borderRadius: "50%", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Notice/Alert Bar */}
      {msg && (
        <div style={{ background: isError ? "#FEE2E2" : "#D1FAE5", color: isError ? "#DC2626" : "#059669", padding: "0.6rem 1rem", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {msg}
        </div>
      )}

      {/* FULLSCREEN SEJDA STAGE (READ-ONLY) */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "1.5rem", background: "#FBF9F5" }}>
        <PDFSejdaStage
          pdfUrl={pdfUrl}
          currentPage={currentPage}
          scale={scale}
          issuanceNumber={doc.issuance_number}
          fields={fields}
          isReadOnly={true}
          onPageLoaded={(cnt) => setNumPages(cnt)}
        />
      </div>
    </div>
  );
}
