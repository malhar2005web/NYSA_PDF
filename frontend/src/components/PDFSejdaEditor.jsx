import React, { useState, useEffect, useRef } from "react";
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Sliders, Trash2,
  Save, ArrowLeft, Type, Edit3, Bold, Maximize, MousePointer, Plus
} from "lucide-react";
import { PDFSejdaStage } from "./PDFSejdaStage";
import { getPresetFields } from "../utils/presetCoordinates";

export function PDFSejdaEditor({
  pdfUrl,
  issuanceNumber: initialIssuanceNumber,
  initialData = {},
  productionUsers = [],
  onClose,
  onConfirmIssuance,
}) {
  const [numPages, setNumPages] = useState(78);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.4);

  // Editable Issuance Number State
  const [issuanceNumber, setIssuanceNumber] = useState(initialIssuanceNumber || "ISS-2026-0802-004");

  // Field Values state
  const [batchNumber, setBatchNumber] = useState(initialData.batch_number || "B-2005");
  const [mfgDate, setMfgDate] = useState(initialData.mfg_date || "");
  const [expiryDate, setExpiryDate] = useState(initialData.expiry_date || "");
  const [issuedBy, setIssuedBy] = useState(initialData.issued_by || "Dr. Rajesh Sharma (QA Lead)");
  const [issuedDate, setIssuedDate] = useState(initialData.issued_date || new Date().toISOString().split("T")[0]);
  const [receivedByUserId, setReceivedByUserId] = useState(initialData.assigned_to_user_id || "");
  const [receivedByCustom, setReceivedByCustom] = useState(initialData.received_by || "");

  // Mapped Overlay Fields across all pages
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [mappingMode, setMappingMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Fields State — admin can click anywhere on PDF to add text
  const [customFields, setCustomFields] = useState([]);
  const customFieldCounter = useRef(0);

  // Global Font Styling Defaults
  const [selectedFontFamily, setSelectedFontFamily] = useState("Helvetica, sans-serif");
  const [selectedFontSize, setSelectedFontSize] = useState(11);
  const [selectedFontColor, setSelectedFontColor] = useState("#000000");

  // Drag & Resize states
  const [draggingFieldId, setDraggingFieldId] = useState(null);
  const [resizingFieldId, setResizingFieldId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const multiPageFields = [];
    const pageCount = numPages || 78;
    const activeDocType = (initialData?.document_type || initialData?.docType || "BMR").toUpperCase();
    const isBmrOrBpr = activeDocType === "BMR" || activeDocType === "BPR";
    const presets = getPresetFields(activeDocType);
    const batchPreset = presets.find(f => f.fieldName === "batch_number") || { x: 158, y: 134 };

    if (isBmrOrBpr) {
      for (let p = 0; p < pageCount; p++) {
        if (p === 0) {
          multiPageFields.push(...presets.map(f => ({ ...f, fontSize: 11 })));
        } else {
          multiPageFields.push({
            id: `auto_batch_p${p}`,
            pageIndex: p,
            fieldName: "batch_number",
            label: "BATCH NO",
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

    setFields(multiPageFields);
  }, [numPages, initialData]);

  function getFieldValue(fieldName) {
    switch (fieldName) {
      case "batch_number": return batchNumber;
      case "mfg_date": return mfgDate;
      case "expiry_date": return expiryDate;
      case "issued_by": return issuedBy;
      case "issued_date": return issuedDate;
      case "received_by":
        if (receivedByCustom) return receivedByCustom;
        const u = productionUsers.find(x => x.id === parseInt(receivedByUserId, 10));
        return u ? u.full_name : "Amit Verma (Plant Officer)";
      default: return batchNumber;
    }
  }

  function setFieldValue(fieldName, newVal) {
    // Check if it's a custom field first
    if (fieldName.startsWith("custom_")) {
      setCustomFields(prev => prev.map(cf =>
        cf.fieldName === fieldName ? { ...cf, value: newVal } : cf
      ));
      return;
    }
    switch (fieldName) {
      case "batch_number": setBatchNumber(newVal); break;
      case "mfg_date": setMfgDate(newVal); break;
      case "expiry_date": setExpiryDate(newVal); break;
      case "issued_by": setIssuedBy(newVal); break;
      case "issued_date": setIssuedDate(newVal); break;
      case "received_by": setReceivedByCustom(newVal); break;
      default: setBatchNumber(newVal); break;
    }
  }

  // Click-to-Add Custom Field Handler
  function handleStageClick(x, y, pageIndex) {
    if (!mappingMode) return; // Only add fields when mapping mode is ON
    customFieldCounter.current += 1;
    const newId = `custom_field_${Date.now()}_${customFieldCounter.current}`;
    const newField = {
      id: newId,
      pageIndex,
      fieldName: `custom_${newId}`,
      label: `Custom Field ${customFieldCounter.current}`,
      value: "",
      x,
      y,
      width: 140,
      height: 22,
      fontSize: selectedFontSize,
      isBold: false,
      color: selectedFontColor,
      fontFamily: selectedFontFamily,
      isCustom: true,
    };
    setCustomFields(prev => [...prev, newField]);
    // Auto-select and edit the new field
    setSelectedFieldId(newId);
    setEditingFieldId(newId);
  }

  function handleDeleteField(id) {
    // Check if it's a custom field
    const isCustom = customFields.some(cf => cf.id === id);
    if (isCustom) {
      setCustomFields(prev => prev.filter(cf => cf.id !== id));
    } else {
      setFields(prev => prev.filter(f => f.id !== id));
    }
    setSelectedFieldId(null);
    setEditingFieldId(null);
  }

  // Populate dynamic values into field list for rendering stage
  // Merge predefined fields + custom fields
  const populatedFields = [
    ...fields.map(f => ({
      ...f,
      value: getFieldValue(f.fieldName),
    })),
    ...customFields,
  ];

  function handleMouseDown(e, id, fieldX, fieldY) {
    setSelectedFieldId(id);
    setDraggingFieldId(id);
    setDragOffset({
      x: e.clientX - fieldX * scale,
      y: e.clientY - fieldY * scale,
    });
  }

  function handleResizeStart(e, id, curW, curH) {
    setResizingFieldId(id);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: curW || 120,
      h: curH || 22,
    });
  }

  function handleMouseMove(e) {
    if (resizingFieldId) {
      const dw = Math.round((e.clientX - resizeStart.x) / scale);
      const dh = Math.round((e.clientY - resizeStart.y) / scale);
      const newW = Math.max(40, resizeStart.w + dw);
      const newH = Math.max(14, resizeStart.h + dh);

      setFields(prev => prev.map(f => f.id === resizingFieldId ? { ...f, width: newW, height: newH } : f));
      setCustomFields(prev => prev.map(cf => cf.id === resizingFieldId ? { ...cf, width: newW, height: newH } : cf));
      return;
    }

    if (draggingFieldId) {
      const newX = Math.round((e.clientX - dragOffset.x) / scale);
      const newY = Math.round((e.clientY - dragOffset.y) / scale);

      setFields(prev => prev.map(f => f.id === draggingFieldId ? { ...f, x: Math.max(0, newX), y: Math.max(0, newY) } : f));
      setCustomFields(prev => prev.map(cf => cf.id === draggingFieldId ? { ...cf, x: Math.max(0, newX), y: Math.max(0, newY) } : cf));
    }
  }

  function handleMouseUp() {
    setDraggingFieldId(null);
    setResizingFieldId(null);
  }

  // Note: handleDeleteField is now defined above with custom field support

  async function handleSaveDocument() {
    setIsSubmitting(true);
    try {
      const selectedProdUser = productionUsers.find(u => u.id === parseInt(receivedByUserId, 10));
      const payload = {
        issuance_number: issuanceNumber,
        document_type: initialData.document_type || "BMR",
        document_name: `${initialData.document_type || "BMR"} Batch ${batchNumber}`,
        batch_number: batchNumber,
        mfg_date: mfgDate,
        expiry_date: expiryDate,
        issued_by: issuedBy,
        issued_date: issuedDate,
        assigned_to_user_id: receivedByUserId,
        received_by: receivedByCustom || (selectedProdUser ? selectedProdUser.full_name : "Amit Verma (Plant Officer)"),
        file_mappings: fields.map(f => ({
          pageIndex: f.pageIndex,
          fieldName: f.fieldName,
          value: getFieldValue(f.fieldName),
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          fontSize: f.fontSize || selectedFontSize,
          color: f.color || selectedFontColor,
          isBold: !!f.isBold,
        })),
        // Custom fields added by admin via click-to-add
        custom_fields: customFields.map(cf => ({
          pageIndex: cf.pageIndex,
          fieldName: cf.fieldName,
          label: cf.label,
          value: cf.value || "",
          x: cf.x,
          y: cf.y,
          width: cf.width || 140,
          height: cf.height || 22,
          fontSize: cf.fontSize || selectedFontSize,
          color: cf.color || selectedFontColor,
          fontFamily: cf.fontFamily || selectedFontFamily,
          isBold: !!cf.isBold,
          isCustom: true,
        })),
      };

      await onConfirmIssuance(payload);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedField = fields.find(x => x.id === selectedFieldId);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "#FBF9F5", display: "flex", flexDirection: "column" }}
    >
      {/* NYSA BIOMED TEAL GRADIENT HEADER TOOLBAR */}
      <div style={{ background: "linear-gradient(135deg, #0F766E, #0E7490)", borderBottom: "1px solid #0D9488", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "0.4rem 0.85rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", border: "1px solid rgba(255,255,255,0.25)" }}>
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h3 style={{ color: "white", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.2px" }}>
              Nysa Biomed Pvt. Ltd. — Controlled BMR/BPR Document Editor
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "2px" }}>
              <span style={{ color: "#E0F2FE", fontSize: "0.75rem", fontWeight: 600 }}>Stamp Number:</span>
              <input
                type="text"
                value={issuanceNumber}
                onChange={(e) => setIssuanceNumber(e.target.value)}
                style={{ background: "rgba(255,255,255,0.2)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "4px", padding: "1px 8px", fontSize: "0.78rem", fontWeight: 800, fontFamily: "monospace", width: "170px" }}
              />
            </div>
          </div>
        </div>

        {/* FONT STYLE & SIZE CONTROLS */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(0,0,0,0.18)", padding: "0.35rem 0.85rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)" }}>
          <Type size={16} style={{ color: "#99F6E4" }} />
          <select
            value={selectedFontFamily}
            onChange={(e) => {
              setSelectedFontFamily(e.target.value);
              if (selectedFieldId) {
                setFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, fontFamily: e.target.value } : f));
              }
            }}
            style={{ background: "#0F766E", color: "white", border: "1px solid #14B8A6", borderRadius: "6px", padding: "0.25rem 0.5rem", fontSize: "0.8rem", fontWeight: 600 }}
          >
            <option value="Helvetica, sans-serif">Helvetica (Sans-Serif)</option>
            <option value="'Times New Roman', serif">Times New Roman (Serif)</option>
            <option value="'Courier New', monospace">Courier (Monospace)</option>
          </select>

          {/* Font Size Adjuster */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "#0F766E", borderRadius: "6px", border: "1px solid #14B8A6", padding: "2px 6px" }}>
            <button
              onClick={() => {
                const newSz = Math.max(8, (selectedField?.fontSize || selectedFontSize) - 1);
                setSelectedFontSize(newSz);
                if (selectedFieldId) {
                  setFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, fontSize: newSz } : f));
                }
              }}
              style={{ color: "white", padding: "0 4px", fontSize: "0.8rem", fontWeight: 700 }}
              title="Decrease Font Size (A-)"
            >
              A-
            </button>
            <span style={{ color: "#99F6E4", fontSize: "0.8rem", fontWeight: 800, padding: "0 4px" }}>
              {selectedField?.fontSize || selectedFontSize}px
            </span>
            <button
              onClick={() => {
                const newSz = Math.min(24, (selectedField?.fontSize || selectedFontSize) + 1);
                setSelectedFontSize(newSz);
                if (selectedFieldId) {
                  setFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, fontSize: newSz } : f));
                }
              }}
              style={{ color: "white", padding: "0 4px", fontSize: "0.8rem", fontWeight: 700 }}
              title="Increase Font Size (A+)"
            >
              A+
            </button>
          </div>

          {/* Bold Toggle */}
          <button
            onClick={() => {
              if (selectedFieldId) {
                setFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, isBold: !f.isBold } : f));
              }
            }}
            style={{
              background: selectedField?.isBold ? "#14B8A6" : "#0F766E",
              color: "white",
              border: "1px solid #14B8A6",
              borderRadius: "6px",
              padding: "0.25rem 0.6rem",
              fontSize: "0.78rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "3px"
            }}
            title="Toggle Bold Weight"
          >
            <Bold size={13} />
            Bold
          </button>
        </div>

        {/* Page Navigation & Large Fit View Zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(0,0,0,0.18)", padding: "0.35rem 0.85rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)" }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} style={{ color: "white", opacity: currentPage <= 1 ? 0.4 : 1 }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ color: "white", fontSize: "0.85rem", fontWeight: 800 }}>
            Page {currentPage} of {numPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} style={{ color: "white", opacity: currentPage >= numPages ? 0.4 : 1 }}>
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

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => setMappingMode(!mappingMode)}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 800,
              background: mappingMode ? "#F59E0B" : "rgba(255,255,255,0.18)",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              border: "1px solid rgba(255,255,255,0.25)"
            }}
          >
            <Sliders size={16} />
            {mappingMode ? "Exit Field Mapping" : "Manual Field Mapping Mode"}
          </button>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSaveDocument}
            disabled={isSubmitting}
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
            <Save size={16} />
            {isSubmitting ? "Saving Document..." : "Save Document"}
          </button>
        </div>
      </div>

      {/* QA METADATA SUBHEADER BAR */}
      {(() => {
        const activeDocType = (initialData?.document_type || "BMR").toUpperCase();
        const isBmrOrBpr = activeDocType === "BMR" || activeDocType === "BPR";

        if (isBmrOrBpr) {
          return (
            <div style={{ background: "#F0FDFA", borderBottom: "1px solid #CCFBF1", padding: "0.75rem 1.5rem", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.75rem" }}>
              <div>
                <label style={{ color: "#0F766E", fontSize: "0.74rem", fontWeight: 800, display: "block", marginBottom: "2px" }}>Batch Number *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem", background: "#FFFFFF", color: "#1F2937", borderColor: "#99F6E4", fontWeight: 700 }}
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                />
              </div>
              <div>
                <label style={{ color: "#0F766E", fontSize: "0.74rem", fontWeight: 800, display: "block", marginBottom: "2px" }}>Mfg Date *</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem", background: "#FFFFFF", color: "#1F2937", borderColor: "#99F6E4", fontWeight: 700 }}
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ color: "#0F766E", fontSize: "0.74rem", fontWeight: 800, display: "block", marginBottom: "2px" }}>Exp Date *</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem", background: "#FFFFFF", color: "#1F2937", borderColor: "#99F6E4", fontWeight: 700 }}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ color: "#0F766E", fontSize: "0.74rem", fontWeight: 800, display: "block", marginBottom: "2px" }}>Issued By</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem", background: "#FFFFFF", color: "#1F2937", borderColor: "#99F6E4", fontWeight: 700 }}
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                />
              </div>
              <div>
                <label style={{ color: "#0F766E", fontSize: "0.74rem", fontWeight: 800, display: "block", marginBottom: "2px" }}>Issued Date</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem", background: "#FFFFFF", color: "#1F2937", borderColor: "#99F6E4", fontWeight: 700 }}
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ color: "#0F766E", fontSize: "0.74rem", fontWeight: 800, display: "block", marginBottom: "2px" }}>Received By / Email *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem", background: "#FFFFFF", color: "#1F2937", borderColor: "#99F6E4", fontWeight: 700 }}
                  value={receivedByCustom}
                  onChange={(e) => setReceivedByCustom(e.target.value)}
                  placeholder="Recipient Name / Email..."
                />
              </div>
            </div>
          );
        }

        return (
          <div style={{ background: "#F0FDFA", borderBottom: "1px solid #CCFBF1", padding: "0.75rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", alignItems: "center" }}>
            <div>
              <span style={{ color: "#0F766E", fontSize: "0.74rem", fontWeight: 800, display: "block", marginBottom: "2px" }}>Document Category</span>
              <span style={{ background: "#0D9488", color: "white", padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 800, display: "inline-block" }}>
                {activeDocType}
              </span>
            </div>
            <div>
              <label style={{ color: "#0F766E", fontSize: "0.74rem", fontWeight: 800, display: "block", marginBottom: "2px" }}>Send To / Recipient Name or Email *</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem", background: "#FFFFFF", color: "#1F2937", borderColor: "#99F6E4", fontWeight: 700, width: "100%" }}
                value={receivedByCustom}
                onChange={(e) => setReceivedByCustom(e.target.value)}
                placeholder="e.g. operator@nysabiomed.com or Amit Verma (Plant Officer)"
              />
            </div>
          </div>
        );
      })()}

      {/* STAGE VIEWPORT (EDITABLE MODE) */}
      <div
        onClick={() => {
          setSelectedFieldId(null);
          setEditingFieldId(null);
        }}
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "1.5rem",
          background: "#FBF9F5",
        }}
      >
        <PDFSejdaStage
          pdfUrl={pdfUrl || "/bmr.pdf"}
          currentPage={currentPage}
          scale={scale}
          issuanceNumber={issuanceNumber}
          fields={populatedFields}
          isReadOnly={false}
          selectedFieldId={selectedFieldId}
          editingFieldId={editingFieldId}
          onSelectField={(id) => setSelectedFieldId(id)}
          onEditField={(id) => setEditingFieldId(id)}
          onFieldChange={(fieldName, val) => setFieldValue(fieldName, val)}
          onFieldDragStart={(e, id, fx, fy) => handleMouseDown(e, id, fx, fy)}
          onFieldResizeStart={(e, id, cw, ch) => handleResizeStart(e, id, cw, ch)}
          onDeleteField={(id) => handleDeleteField(id)}
          onStageClick={handleStageClick}
          onPageLoaded={(cnt) => setNumPages(cnt)}
        />
      </div>
    </div>
  );
}
