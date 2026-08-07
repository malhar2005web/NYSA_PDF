import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate Native Vector PDF for BMR/BPR ISSUANCE AND RETRIEVAL RECORD
 * Form Code: (QAP-009/F2-02)
 * Matches official Nysa Biomed Pvt. Ltd. Satara regulatory register template 1:1.
 */
export function generateRegisterPDF(documents = [], filterMeta = {}) {
  // Create A4 Landscape PDF (297mm x 210mm)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const totalPagesExp = "{total_pages_count_string}";

  // Prepare table data rows from issued document records
  const tableRows = (documents && documents.length > 0 ? documents : []).map((d, index) => {
    const srNo = String(index + 1).padStart(2, '0');
    const createdDate = d.created_at ? d.created_at.split("T")[0] : (d.issued_date || new Date().toISOString().split("T")[0]);
    const productName = d.document_name || d.product_name || `${d.document_type || 'BMR'} ${d.batch_number || ''}`;
    const batchNo = d.batch_number || "N/A";
    const batchSize = d.batch_size || "Standard";
    const mfgExp = `${d.mfg_date || 'N/A'}\n${d.expiry_date || 'N/A'}`;
    const issuedOnByQA = `${createdDate}\n${d.issued_by || 'Dr. Rajesh Sharma'}`;
    const receivedOnByProd = d.received_by ? `${createdDate}\n${d.received_by}` : "Pending";
    const reviewedOnByQA = d.status === "APPROVED" || d.status === "FULFILLED" ? `${createdDate}\nQA Lead` : "--";
    const approvedOnByQA = d.status === "APPROVED" || d.status === "FULFILLED" ? `${createdDate}\nQA Lead` : "--";
    const archivedOnByQA = "--";
    const destructionOnByQA = "--";
    const remark = d.remarks || d.document_type || "Issued";

    return [
      srNo,
      createdDate,
      productName,
      batchNo,
      batchSize,
      mfgExp,
      issuedOnByQA,
      receivedOnByProd,
      reviewedOnByQA,
      approvedOnByQA,
      archivedOnByQA,
      destructionOnByQA,
      remark,
    ];
  });

  // If empty, supply 8 blank placeholder rows matching the paper register
  if (tableRows.length === 0) {
    for (let i = 1; i <= 8; i++) {
      tableRows.push([
        String(i).padStart(2, '0'), "", "", "", "", "\n", "\n", "\n", "\n", "\n", "\n", "\n", ""
      ]);
    }
  }

  // Draw Table using jspdf-autotable safely
  const renderTable = typeof autoTable === "function" ? autoTable : (typeof doc.autoTable === "function" ? doc.autoTable.bind(doc) : null);
  if (!renderTable) {
    console.error("jspdf-autotable is not loaded properly.");
    return;
  }

  renderTable(doc, {
    startY: 28,
    margin: { left: 10, right: 10, top: 28, bottom: 18 },
    head: [[
      "Sr.No.",
      "Date",
      "Name of Product",
      "Batch No.",
      "Batch Size",
      "Mfg. Date\nExp. Date",
      "Issued On\nBy Q.A.",
      "Received On\nBy Prod.",
      "Reviewed On\nBy Q.A.",
      "Approved On\nBy Q.A.",
      "Archived On\nBy Q.A.",
      "Destruction On\nBy Q.A.",
      "Remark"
    ]],
    body: tableRows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      valign: "middle",
      halign: "center",
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7.5,
      lineWidth: 0.35,
      lineColor: [0, 0, 0],
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 12 }, // Sr.No.
      1: { cellWidth: 18 }, // Date
      2: { cellWidth: 42, halign: "left" }, // Product Name
      3: { cellWidth: 22 }, // Batch No.
      4: { cellWidth: 20 }, // Batch Size
      5: { cellWidth: 22 }, // Mfg/Exp Date
      6: { cellWidth: 22 }, // Issued On
      7: { cellWidth: 22 }, // Received On
      8: { cellWidth: 20 }, // Reviewed On
      9: { cellWidth: 20 }, // Approved On
      10: { cellWidth: 18 }, // Archived On
      11: { cellWidth: 20 }, // Destruction On
      12: { cellWidth: 19 }, // Remark
    },

    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // ----------------------------------------------------
      // HEADER SECTION
      // ----------------------------------------------------
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      // Top Left: Company Name
      doc.text("Nysa Biomed Pvt.Ltd. Satara.", 10, 10);

      // Top Center: Document Title
      doc.setFontSize(13);
      doc.text("BMR/BPR ISSUANCE AND RETRIEVAL RECORD", 10, 18);

      // Top Right: Page Number & Logo Badge
      doc.setFontSize(9);
      const pageNumStr = String(data.pageNumber).padStart(3, '0');
      doc.text(pageNumStr, pageWidth - 35, 10);

      // Simple Nysa logo box graphic
      doc.setLineWidth(0.4);
      doc.rect(pageWidth - 25, 6, 15, 12);
      doc.setFontSize(6.5);
      doc.text("NYSA", pageWidth - 21.5, 11);
      doc.text("BIOMED", pageWidth - 23, 15);

      // Divider line above table
      doc.setLineWidth(0.4);
      doc.line(10, 22, pageWidth - 10, 22);

      // ----------------------------------------------------
      // FOOTER SECTION
      // ----------------------------------------------------
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);

      // Form Code at bottom right
      doc.text("(QAP-009/F2-02)", pageWidth - 42, pageHeight - 8);
    },
  });

  // Calculate total pages for jspdf
  if (typeof doc.putTotalPages === "function") {
    doc.putTotalPages(totalPagesExp);
  }

  // Save PDF
  const filename = `BMR_BPR_Issuance_Retrieval_Record_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

/**
 * Generate CSV for Excel / Data Analysis
 */
export function generateRegisterCSV(documents = []) {
  const headers = [
    "Sr.No.",
    "Date",
    "Product Name",
    "Document Type",
    "Batch Number",
    "Batch Size",
    "Mfg Date",
    "Expiry Date",
    "Issued By QA",
    "Received By Prod",
    "Status",
    "Issuance Number",
    "Remarks"
  ];

  const rows = (documents || []).map((d, index) => [
    index + 1,
    d.created_at ? d.created_at.split("T")[0] : (d.issued_date || ""),
    `"${(d.document_name || d.product_name || '').replace(/"/g, '""')}"`,
    d.document_type || "BMR",
    `"${(d.batch_number || '').replace(/"/g, '""')}"`,
    `"${(d.batch_size || '').replace(/"/g, '""')}"`,
    d.mfg_date || "",
    d.expiry_date || "",
    `"${(d.issued_by || '').replace(/"/g, '""')}"`,
    `"${(d.received_by || '').replace(/"/g, '""')}"`,
    d.status || "ISSUED",
    d.issuance_number || "",
    `"${(d.remarks || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `BMR_BPR_Issuance_Record_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
