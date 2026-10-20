import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { openPitchPdf, pdfCrop, pdfFontNames } from "./pdf";

/** Tiny generated fixture in memory, without network or a paid provider call. */
import { samplePdf } from "./test-fixtures";


test("PDF import validates page limits and renders real cropped artwork", async () => {
  const pdf = await openPitchPdf(samplePdf());
  try {
    assert.equal(pdf.numPages, 1);
    assert.ok((await pdfFontNames(pdf)).some((font) => /Helvetica/i.test(font)));
    const crop = await pdfCrop(pdf, { page: 1, x: 0.1, y: 0.1, width: 0.5, height: 0.5 });
    assert.equal(crop.width, 600); assert.equal(crop.height, 400);
    const meta = await sharp(crop.data).metadata(); assert.equal(meta.format, "png"); assert.equal(meta.width, 600);
  } finally { await pdf.destroy(); }
  await assert.rejects(openPitchPdf(Buffer.from("not a PDF")), /invalid_pdf/);
  await assert.rejects(openPitchPdf(samplePdf(21)), /pdf_page_limit/);
});
