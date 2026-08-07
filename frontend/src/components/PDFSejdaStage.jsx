import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Unified PDF Canvas & Overlay Stage Component
 * Used identically by both Edit Mode (PDFSejdaEditor) and View Mode (DocumentViewerModal).
 * Zero difference in rendering pipeline, positioning, or font styling.
 */
export function PDFSejdaStage({
  pdfUrl = "/bmr.pdf",
  currentPage = 1,
  scale = 1.4,
  issuanceNumber = "ISS-2026-0802-001",
  fields = [],
  isReadOnly = false,
  selectedFieldId = null,
  editingFieldId = null,
  onSelectField = () => { },
  onEditField = () => { },
  onFieldChange = () => { },
  onFieldDragStart = () => { },
  onFieldResizeStart = () => { },
  onDeleteField = () => { },
  onStageClick = null,
  onPageLoaded = () => { },
}) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfPageSize, setPdfPageSize] = useState({ width: 595, height: 842 });
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!pdfUrl) return;
    loadPDF();
  }, [pdfUrl]);

  async function loadPDF() {
    setLoading(true);
    try {
      let arrayBuffer = null;
      try {
        const res = await fetch(pdfUrl);
        if (res.ok) arrayBuffer = await res.arrayBuffer();
      } catch (e) { }

      if (!arrayBuffer) {
        const fallbackRes = await fetch("/bmr.pdf");
        arrayBuffer = await fallbackRes.arrayBuffer();
      }

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      onPageLoaded(doc.numPages);

      const page1 = await doc.getPage(1);
      const vp = page1.getViewport({ scale: 1.0 });
      setPdfPageSize({ width: vp.width, height: vp.height });
    } catch (e) {
      console.error("PDF Stage Load Error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    renderPage(currentPage);
  }, [pdfDoc, currentPage, scale]);

  async function renderPage(pageNum) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (e) {
      console.error("Render Error in PDF Stage:", e);
    }
  }

  const stageWidth = pdfPageSize.width * scale;
  const stageHeight = pdfPageSize.height * scale;

  if (loading) {
    return (
      <div style={{ color: "white", textAlign: "center", padding: "4rem" }}>
        <p>Loading document canvas...</p>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        if (onStageClick && !isReadOnly) {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = Math.round((e.clientX - rect.left) / scale);
          const clickY = Math.round((e.clientY - rect.top) / scale);
          onStageClick(clickX, clickY, currentPage - 1);
        }
      }}
      style={{
        position: "relative",
        width: `${stageWidth}px`,
        height: `${stageHeight}px`,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
        borderRadius: "4px",
        background: "white",
        cursor: onStageClick && !isReadOnly ? "crosshair" : "default",
      }}
    >
      {/* LAYER 1: CLEAN PDF.JS CANVAS */}
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {/* LAYER 2: TOP-RIGHT HEADER MARGIN STAMP */}
      <div style={{
        position: "absolute",
        top: `${12 * scale}px`,
        right: `${15 * scale}px`,
        background: "rgba(255,255,255,0.95)",
        border: "1.5px solid #000000",
        padding: `${3 * scale}px ${10 * scale}px`,
        borderRadius: "4px",
        fontSize: `${10 * scale}px`,
        fontWeight: 500,
        color: "#000000",
        pointerEvents: "none",
        zIndex: 15,
      }}>
        {issuanceNumber}
      </div>

      {/* LAYER 2B: PAGE 1 COMPLETED GREEN RUBBER STAMP */}
      {currentPage === 1 && (
        <img
          src="/completed_stamp.jpg"
          alt="Completed Stamp"
          style={{
            position: "absolute",
            top: `${10 * scale}px`,
            right: `${185 * scale}px`,
            width: `${105 * scale}px`,
            height: "auto",
            objectFit: "contain",
            pointerEvents: "none",
            zIndex: 14,
            opacity: 0.92,
            mixBlendMode: "multiply",
          }}
        />
      )}

      {/* LAYER 3: UNIFIED OVERLAY TEXT FIELDS */}
      {fields
        .filter(f => f.pageIndex === currentPage - 1)
        .map(field => {
          const isSelected = !isReadOnly && selectedFieldId === field.id;
          const isEditing = !isReadOnly && editingFieldId === field.id;
          const value = field.value || "";

          return (
            <div
              key={field.id}
              onMouseDown={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  onFieldDragStart(e, field.id, field.x, field.y);
                }
              }}
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  onEditField(field.id);
                }
              }}
              onClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  onSelectField(field.id);
                }
              }}
              style={{
                position: "absolute",
                left: `${field.x * scale}px`,
                top: `${field.y * scale}px`,
                width: `${(field.width || 120) * scale}px`,
                height: `${(field.height || 20) * scale}px`,
                background: isEditing ? "#FFFFFF" : "transparent",
                border: isEditing ? "2px solid #0D9488" : isSelected ? "2px dashed #F59E0B" : "1px dashed transparent",
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                padding: "0 2px",
                cursor: isReadOnly ? "default" : "move",
                zIndex: 20,
                boxShadow: isEditing ? "0 2px 8px rgba(13,148,136,0.3)" : "none",
                pointerEvents: isReadOnly ? "none" : "auto",
              }}
            >
              {/* FLOATING HEADER BADGE & DELETE BUTTON ABOVE FIELD BOX */}
              {(isSelected || isEditing) && !isReadOnly && (
                <div
                  style={{
                    position: "absolute",
                    top: `-22px`,
                    left: 0,
                    height: "20px",
                    background: isEditing ? "#0F766E" : "#F59E0B",
                    color: "white",
                    padding: "0 6px",
                    borderRadius: "4px 4px 0 0",
                    fontSize: "10px",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 -2px 6px rgba(0,0,0,0.15)",
                    zIndex: 40,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  <span>{field.label || field.fieldName}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteField(field.id);
                    }}
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "none",
                      color: "white",
                      borderRadius: "50%",
                      width: "14px",
                      height: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 900,
                      cursor: "pointer",
                      lineHeight: 1,
                      padding: 0,
                    }}
                    title="Delete Field"
                  >
                    ✕
                  </button>
                </div>
              )}

              {isEditing ? (
                <input
                  type="text"
                  autoFocus
                  value={value}
                  onChange={(e) => onFieldChange(field.fieldName, e.target.value)}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    background: "transparent",
                    fontSize: `${(field.fontSize || 11) * scale}px`,
                    fontWeight: field.isBold ? 700 : 400,
                    color: field.color || "#000000",
                    fontFamily: field.fontFamily || "Helvetica, sans-serif",
                    outline: "none",
                  }}
                />
              ) : (
                <span style={{
                  fontSize: `${(field.fontSize || 11) * scale}px`,
                  fontWeight: field.isBold ? 700 : 400,
                  color: field.color || "#000000",
                  fontFamily: field.fontFamily || "Helvetica, sans-serif",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                }}>
                  {value || field.label}
                </span>
              )}

              {/* CORNER RESIZE HANDLE FOR EDIT MODE ONLY */}
              {isSelected && !isReadOnly && (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onFieldResizeStart(e, field.id, field.width || 120, field.height || 20);
                  }}
                  style={{
                    position: "absolute",
                    right: "-5px",
                    bottom: "-5px",
                    width: "10px",
                    height: "10px",
                    background: "#F59E0B",
                    border: "1px solid white",
                    borderRadius: "2px",
                    cursor: "nwse-resize",
                    zIndex: 35,
                  }}
                  title="Drag to resize field box"
                />
              )}
            </div>
          );
        })}
    </div>
  );
}
