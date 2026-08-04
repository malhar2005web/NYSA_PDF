import { PDFDocument } from "pdf-lib";
import fs from "fs";

async function inspect() {
  const bytes = fs.readFileSync("../bmr.pdf");
  const pdfDoc = await PDFDocument.load(bytes);
  console.log("Page count:", pdfDoc.getPageCount());

  const page0 = pdfDoc.getPage(0);
  const contents = page0.node.Contents();
  console.log("Contents type:", contents.constructor.name);
  if (Array.isArray(contents.array)) {
    console.log("Number of content streams on Page 0:", contents.array.length);
  }
}

inspect();
