import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

async function inspectPDF() {
  const bmrPath = "d:/Desktop/bhusari sir bmr-bpr/bmr.pdf";
  if (fs.existsSync(bmrPath)) {
    const bytes = fs.readFileSync(bmrPath);
    const doc = await PDFDocument.load(bytes);
    console.log("BMR Total Pages:", doc.getPageCount());
    const page1 = doc.getPage(0);
    const { width, height } = page1.getSize();
    console.log("Page 1 dimensions:", width, "x", height);
  }
}

inspectPDF();
