/**
 * generate.js — fetches the official Ejari PDF template from GitHub at runtime,
 * fills page 1 with form data, returns all 3 pages intact with logos.
 */
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const PAGE_H = 842;
const TEMPLATE_URL = 'https://raw.githubusercontent.com/hamedtaheridlaviz-stack/ejari-app/main/ejari-app/ejari_template.pdf';

const F = {
  date: 725.8, ownerName: 667.7, lessorName: 645.0, lessorEID: 621.4,
  licenseNo: 591.1, licensingAuth: 591.1, lessorEmail: 574.2, lessorPhone: 553.2,
  tenantName: 497.6, tenantEID: 474.0, tenantEmail: 426.9, tenantPhone: 405.0,
  plotNo: 325.0, makaniNo: 323.3, buildingName: 302.3, propertyNo: 300.6,
  propertyType: 277.9, propertyArea: 277.0, location: 256.8, dewaPremises: 255.1,
  contractFrom: 187.8, contractTo: 187.8, contractValue: 196.2,
  annualRent: 186.9, securityDeposit: 174.3, modeOfPayment: 152.4,
};

const X = {
  lessorEID_start: 110, lessorEID_mid: 298,
  tenantEID_start: 110, tenantEID_mid: 298,
  ownerName_x: 110, ownerName2_x: 300,
  propertyNo_x: 350, propertyArea_x: 350, dewaPremises_x: 350,
};

const USAGE = {
  industrial:  [152.2, 347.5],
  commercial:  [258.8, 347.5],
  residential: [371.8, 347.5],
};

const TERM_YS = [526.2, 494.3, 462.3, 430.3, 398.3];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;

    // Fetch the official template from GitHub (public raw URL)
    const templateRes = await fetch(TEMPLATE_URL);
    if (!templateRes.ok) {
      return res.status(500).json({ error: `Could not fetch template: ${templateRes.status} ${TEMPLATE_URL}` });
    }
    const templateBytes = Buffer.from(await templateRes.arrayBuffer());
    const pdfDoc = await PDFDocument.load(templateBytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    function drawText(text, x, rlY, { maxw = 380, size = 8, bold = false } = {}) {
      if (!text) return;
      let t = String(text).trim();
      const f = bold ? fontBold : font;
      while (t.length > 1 && f.widthOfTextAtSize(t, size) > maxw) t = t.slice(0, -1);
      page.drawText(t, { x, y: rlY, size, font: f, color: rgb(0, 0, 0) });
    }

    function d(key, x, val, opts = {}) {
      if (F[key] !== undefined) drawText(val, x, F[key], opts);
    }

    // Date
    d('date', 30, data.date);

    // Landlords
    const landlords = (data.landlords && data.landlords.length) ? data.landlords : [{}];
    const ll = landlords[0];
    const owner1 = ll.name || '';
    if (landlords.length >= 2) {
      const owner2 = landlords[1].name || '';
      drawText(owner1, X.ownerName_x,  F.ownerName,  { maxw: 175 });
      drawText(owner2, X.ownerName2_x, F.ownerName,  { maxw: 175 });
      drawText(owner1, X.ownerName_x,  F.lessorName, { maxw: 175 });
      drawText(owner2, X.ownerName2_x, F.lessorName, { maxw: 175 });
    } else {
      d('ownerName',  X.ownerName_x, owner1, { maxw: 360 });
      d('lessorName', X.ownerName_x, ll.lessorName || owner1, { maxw: 360 });
    }
    if (ll.emiratesId) drawText(ll.emiratesId, X.lessorEID_start, F.lessorEID, { maxw: 175 });
    if (landlords.length >= 2 && landlords[1].emiratesId)
      drawText(landlords[1].emiratesId, X.lessorEID_mid, F.lessorEID, { maxw: 175 });
    d('licenseNo',     90,  ll.licenseNo     || '', { maxw: 155 });
    d('licensingAuth', 376, ll.licensingAuth || '', { maxw: 84  });
    d('lessorEmail',   90,  ll.email         || '', { maxw: 370 });
    d('lessorPhone',   90,  ll.phone         || '', { maxw: 370 });
    if (landlords.length > 2) {
      let ny = F.lessorPhone - 11;
      for (let i = 2; i < landlords.length; i++) {
        const ex = landlords[i];
        page.drawText(`+ Landlord ${i+1}: ${ex.name||''}  ID: ${ex.emiratesId||''}  ${ex.phone||''}`,
          { x: 90, y: ny-(i-2)*9, size: 6.5, font, color: rgb(0.1,0.2,0.6) });
      }
    }

    // Tenants
    const tenants = (data.tenants && data.tenants.length) ? data.tenants : [{}];
    const tt = tenants[0];
    d('tenantName', 90, tt.name || '', { maxw: 370 });
    if (tt.emiratesId) drawText(tt.emiratesId, X.tenantEID_start, F.tenantEID, { maxw: 175 });
    if (tenants.length >= 2 && tenants[1].emiratesId)
      drawText(tenants[1].emiratesId, X.tenantEID_mid, F.tenantEID, { maxw: 175 });
    d('tenantEmail', 90, tt.email || '', { maxw: 370 });
    d('tenantPhone', 90, tt.phone || '', { maxw: 370 });
    if (tenants.length > 1) {
      let ny = F.tenantPhone - 11;
      for (let i = 1; i < tenants.length; i++) {
        const ex = tenants[i];
        page.drawText(`+ Tenant ${i+1}: ${ex.name||''}  ID: ${ex.emiratesId||''}  ${ex.phone||''}`,
          { x: 90, y: ny-(i-1)*9, size: 6.5, font, color: rgb(0.1,0.2,0.6) });
      }
    }

    // Usage circle
    const usage = (data.propertyUsage || 'residential').toLowerCase();
    if (USAGE[usage]) {
      const [ux, uy] = USAGE[usage];
      page.drawText('X', { x: ux-3, y: uy-3, size: 7, font: fontBold, color: rgb(0,0,0) });
    }

    // Property
    d('plotNo',       65,  data.plotNo       || '', { maxw: 155 });
    d('makaniNo',     347, data.makaniNo     || '', { maxw: 113 });
    d('buildingName',  90, data.buildingName || '', { maxw: 155 });
    drawText(data.propertyNo   || '', X.propertyNo_x,   F.propertyNo,   { maxw: 155 });
    d('propertyType',  90, data.propertyType || '', { maxw: 155 });
    drawText(data.propertyArea || '', X.propertyArea_x, F.propertyArea, { maxw: 125 });
    d('location',      90, data.location    || '', { maxw: 155 });
    drawText(data.dewaPremises || '', X.dewaPremises_x, F.dewaPremises, { maxw: 110 });

    // Contract
    d('contractFrom',    147, data.contractFrom    || '', { maxw: 58  });
    d('contractTo',      217, data.contractTo      || '', { maxw: 78  });
    d('contractValue',   347, data.contractValue   || '', { maxw: 113 });
    d('annualRent',       90, data.annualRent      || '', { maxw: 155 });
    d('securityDeposit', 347, data.securityDeposit || '', { maxw: 113 });
    d('modeOfPayment',    90, data.modeOfPayment   || '', { maxw: 370 });

    // Additional terms on page 3
    if (data.additionalTerms && Array.isArray(data.additionalTerms)) {
      const page3 = pages[2];
      data.additionalTerms.slice(0, 5).forEach((term, i) => {
        if (!term || !term.trim()) return;
        page3.drawText(term.trim(), { x: 58, y: TERM_YS[i], size: 7.5, font, color: rgb(0,0,0), maxWidth: 490 });
      });
    }

    const pdfBytes = await pdfDoc.save();
    const tname = (tt.name || 'contract').replace(/\s+/g, '_');
    const dstr  = (data.date || 'undated').replace(/\//g, '-');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ejari_${tname}_${dstr}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.status(200).send(Buffer.from(pdfBytes));

  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack?.slice(0, 400) });
  }
}
