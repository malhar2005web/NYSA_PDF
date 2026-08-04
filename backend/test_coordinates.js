import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function testOverlay() {
  const bmrPath = "d:/Desktop/bhusari sir bmr-bpr/bmr.pdf";
  const outputPath = "d:/Desktop/bhusari sir bmr-bpr/backend/uploads/bmr/test_populated.pdf";

  const bytes = fs.readFileSync(bmrPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page1 = pdfDoc.getPage(0);
  const { width, height } = page1.getSize();
  console.log("Page 1 size:", width, "x", height);

  // Overlay text on Page 1 table cells:
  // Batch No. cell (Right of 'Batch No.' label in the table)
  page1.drawText("B-2005", {
    x: 235,
    y: 375,
    size: 11,
    font: font,
    color: rgb(0, 0.4, 0.8), // Dark Blue font for filled values
  });

  // Mfg. Date. cell (Right of 'Mfg. Date.' label in table)
  page1.drawText("02/08/2026", {
    x: 235,
    y: 242,
    size: 11,
    font: font,
    color: rgb(0, 0.4, 0.8),
  });

  // Exp. Date. cell (Right of 'Exp. Date.' label in table)
  page1.drawText("02/08/2028", {
    x: 415,
    y: 242,
    size: 11,
    font: font,
    color: rgb(0, 0.4, 0.8),
  });

  const saved = await pdfDoc.save();
  fs.writeFileSync(outputPath, saved);
  console.log("Test populated PDF saved to:", outputPath);
}

testOverlay();
