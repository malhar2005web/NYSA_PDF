import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function detectPDFFields(pdfUrlOrBuffer) {
  try {
    const loadingTask = typeof pdfUrlOrBuffer === "string"
      ? pdfjsLib.getDocument(pdfUrlOrBuffer)
      : pdfjsLib.getDocument({ data: pdfUrlOrBuffer });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const detectedFields = [];

    const fieldPatterns = [
      { name: "batch_number", regex: /batch\s*no\.?|batch\s*number/i, offsetX: 75, offsetY: 0, width: 140, height: 22 },
      { name: "mfg_date", regex: /mfg\.?\s*date\.?/i, offsetX: 70, offsetY: 0, width: 110, height: 22 },
      { name: "expiry_date", regex: /exp\.?\s*date\.?/i, offsetX: 70, offsetY: 0, width: 110, height: 22 },
      { name: "issued_by", regex: /document\s*issued\s*by\s*qa|issued\s*by/i, offsetX: 140, offsetY: 0, width: 180, height: 22 },
      { name: "received_by", regex: /document\s*received\s*by\s*production|received\s*by/i, offsetX: 170, offsetY: 0, width: 180, height: 22 },
      { name: "issued_date", regex: /on\s*date:?/i, offsetX: 60, offsetY: 0, width: 100, height: 22 },
    ];

    for (let pageNum = 1; pageNum <= Math.min(numPages, 100); pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      const items = textContent.items;
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const str = item.str;

        for (const pattern of fieldPatterns) {
          if (pattern.regex.test(str)) {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

            const pdfX = tx[4];
            const pdfY = viewport.height - tx[5] - fontHeight;

            const valueX = Math.min(viewport.width - pattern.width - 20, pdfX + pattern.offsetX);
            const valueY = pdfY + pattern.offsetY;

            detectedFields.push({
              id: `field_${pageNum}_${pattern.name}_${idx}`,
              pageIndex: pageNum - 1,
              pageNum,
              fieldName: pattern.name,
              label: pattern.name.replace(/_/g, " ").toUpperCase(),
              x: Math.max(10, Math.round(valueX)),
              y: Math.max(10, Math.round(valueY)),
              width: pattern.width,
              height: pattern.height,
              fontSize: 12,
              pageWidth: viewport.width,
              pageHeight: viewport.height,
              autoDetected: true,
            });
          }
        }
      }
    }

    return {
      success: true,
      numPages,
      detectedFields,
    };
  } catch (error) {
    console.error("PDF Field Detection Error:", error);
    return { success: false, detectedFields: [], error: error.message };
  }
}
