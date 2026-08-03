import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface StampMetadata {
  doi: string;
  title: string;
  authors: string;
  volume: string;
  issue: string;
  pages?: string;
  publicationDate: string;
}

const wrap = (
  text: string,
  font: any,
  size: number,
  maxWidth: number
): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const test = line + word + " ";
    if (font.widthOfTextAtSize(test, size) > maxWidth && line !== "") {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = test;
    }
  });
  if (line.trim()) lines.push(line.trim());
  return lines;
};

const formatLong = (d: string) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const buildCitation = (m: StampMetadata) => {
  const year = m.publicationDate ? new Date(m.publicationDate).getFullYear() : "";
  return `${m.authors} (${year}). ${m.title}. Marine Notes Journal, ${m.volume}(${m.issue})${
    m.pages ? `, ${m.pages}` : ""
  }. ${m.doi}`;
};

/**
 * Adds the journal banner to the first page and a licence/citation footer to
 * every page. Returns the modified PDF bytes.
 */
export async function stampPdf(
  pdfData: ArrayBuffer,
  bannerUrl: string | null,
  metadata: StampMetadata
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfData);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let bannerImage: any = null;
  if (bannerUrl) {
    try {
      const bytes = await fetch(bannerUrl).then((r) => r.arrayBuffer());
      bannerImage = bannerUrl.toLowerCase().includes(".jpg") || bannerUrl.toLowerCase().includes(".jpeg")
        ? await pdfDoc.embedJpg(bytes)
        : await pdfDoc.embedPng(bytes);
    } catch (e) {
      console.error("Banner embed failed", e);
    }
  }

  const pages = pdfDoc.getPages();
  const citation = buildCitation(metadata);

  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const margin = 40;
    const maxWidth = width - 2 * margin;

    if (bannerImage && index === 0) {
      const aspect = bannerImage.width / bannerImage.height;
      const h = Math.min(width / aspect, 80);
      page.drawImage(bannerImage, { x: 0, y: height - h, width, height: h });
    }

    const size = 8;
    const lh = 10;
    let y = 62;

    wrap(
      "This is an open-access article distributed under the terms of the Creative Commons Attribution License (CC BY 4.0).",
      helvetica,
      size,
      maxWidth
    ).forEach((l) => {
      page.drawText(l, { x: margin, y, size, font: helvetica, color: rgb(0.3, 0.3, 0.3) });
      y -= lh;
    });

    y -= 3;
    let info = "Marine Notes Journal";
    if (metadata.volume) info += `, Vol. ${metadata.volume}`;
    if (metadata.issue) info += `, Issue ${metadata.issue}`;
    if (metadata.pages) info += `, pp. ${metadata.pages}`;
    if (metadata.publicationDate) info += ` (${new Date(metadata.publicationDate).getFullYear()})`;
    page.drawText(info, { x: margin, y, size, font: bold, color: rgb(0, 0, 0) });
    y -= lh;

    if (metadata.doi) {
      page.drawText(`Article ID: ${metadata.doi}  |  ISSN 2979-8841`, {
        x: margin, y, size, font: helvetica, color: rgb(0.3, 0.3, 0.3),
      });
      y -= lh;
    }

    if (metadata.publicationDate) {
      page.drawText(`Published: ${formatLong(metadata.publicationDate)}`, {
        x: margin, y, size: size - 1, font: italic, color: rgb(0.4, 0.4, 0.4),
      });
      y -= lh;
    }

    if (index === 0) {
      y -= 2;
      wrap(`Cite as: ${citation}`, italic, size - 1, maxWidth).forEach((l) => {
        page.drawText(l, { x: margin, y, size: size - 1, font: italic, color: rgb(0.2, 0.2, 0.2) });
        y -= lh;
      });
    }

    page.drawText(String(index + 1), {
      x: width - margin, y: 30, size, font: helvetica, color: rgb(0.4, 0.4, 0.4),
    });
  });

  return await pdfDoc.save();
}
