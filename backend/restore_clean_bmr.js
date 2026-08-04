import { PDFDocument } from "pdf-lib";
import fs from "fs";

async function restoreCleanPDF(inputPath, outputPath) {
  const bytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();

  let cleanedPages = 0;
  for (const page of pages) {
    const contents = page.node.Contents();
    if (contents && Array.isArray(contents.array) && contents.array.length > 1) {
      // Keep ONLY stream 0 (the original scanned image stream)
      contents.array = [contents.array[0]];
      cleanedPages++;
    }
  }

  console.log(`Cleaned ${cleanedPages} pages from legacy appended text streams.`);
  const cleanBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, cleanBytes);
  console.log(`Successfully saved clean PDF to ${outputPath}`);
}

restoreCleanPDF("../bmr.pdf", "../bmr.pdf");
if (fs.existsSync("../bpr.pdf")) {
  restoreCleanPDF("../bpr.pdf", "../bpr.pdf");
}
