import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PAGE_H = 842;

function fieldCoords(x0, top, x1, bottom, fs = 8) {
  return { x: x0 + 2, y: PAGE_H - bottom + 1, w: x1 - x0 - 4, h: bottom - top, fs };
}

const FIELDS = {
  date:           fieldCoords(28,  111, 120, 125, 8),
  ownerName:      fieldCoords(88,  170, 460, 184, 8),
  lessorName:     fieldCoords(88,  192, 460, 207, 8),
  lessorEID:      fieldCoords(88,  215, 460, 229, 8),
  licenseNo:      fieldCoords(88,  237, 220, 261, 7),
  licensingAuth:  fieldCoords(375, 237, 460, 261, 7),
  lessorEmail:    fieldCoords(88,  262, 460, 276, 8),
  lessorPhone:    fieldCoords(88,  284, 460, 298, 8),
  tenantName:     fieldCoords(88,  340, 460, 354, 8),
  tenantEID:      fieldCoords(88,  362, 460, 376, 8),
  tenantEmail:    fieldCoords(88,  410, 460, 424, 8),
  tenantPhone:    fieldCoords(88,  432, 460, 446, 8),
  plotNo:         fieldCoords(63,  512, 220, 526, 8),
  makaniNo:       fieldCoords(345, 512, 460, 526, 8),
  buildingName:   fieldCoords(88,  535, 220, 549, 8),
  propertyNo:     fieldCoords(345, 535, 460, 549, 8),
  propertyType:   fieldCoords(88,  558, 220, 572, 8),
  propertyArea:   fieldCoords(345, 558, 460, 572, 8),
  location:       fieldCoords(88,  581, 220, 595, 8),
  dewaPremises:   fieldCoords(345, 581, 460, 595, 8),
  contractFrom:   fieldCoords(145, 648, 205, 663, 8),
  contractTo:     fieldCoords(215, 648, 295, 663, 8),
  contractValue:  fieldCoords(345, 638, 460, 663, 8),
  annualRent:     fieldCoords(88,  663, 220, 677, 8),
  securityDeposit:fieldCoords(345, 663, 460, 677, 8),
  modeOfPayment:  fieldCoords(88,  685, 460, 699, 8),
};

const USAGE_POSITIONS = {
  residential: { x: 432, y: PAGE_H - 499 },
  commercial:  { x: 318, y: PAGE_H - 499 },
  industrial:  { x: 207, y: PAGE_H - 499 },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    const templatePath = path.join(process.cwd(), 'ejari_template.pdf');
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];

    const drawText = (text, field) => {
      if (!text) return;
      const { x, y, w, h, fs } = field;
      let t = String(text);
      while (t.length > 1 && font.widthOfTextAtSize(t, fs) > w) t = t.slice(0, -1);
      page.drawText(t, { x, y: y + 2, size: fs, font, color: rgb(0, 0, 0), maxWidth: w });
    };

    Object.entries(FIELDS).forEach(([key, field]) => {
      if (data[key]) drawText(data[key], field);
    });

    if (data.propertyUsage) {
      const pos = USAGE_POSITIONS[data.propertyUsage.toLowerCase()];
      if (pos) page.drawText('✓', { x: pos.x - 4, y: pos.y - 4, size: 10, font, color: rgb(0, 0, 0.8) });
    }

    const filled = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ejari_contract.pdf"');
    res.send(Buffer.from(filled));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
