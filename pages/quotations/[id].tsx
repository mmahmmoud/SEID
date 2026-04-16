// pages/quotations/[id].tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiEdit2, FiSave, FiX } from "react-icons/fi";

// ─── PDF constants ─────────────────────────────────────────────────────────────
const PAGE_W    = 210;   // A4 mm
const PAGE_H    = 297;
const MARGIN    = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
// 190px top padding: 190 / 96 * 25.4 = 50.27mm
const CONTENT_START = 50.3;  // mm from top where content begins (below letterhead logo)
const PAGE_BOTTOM   = PAGE_H - 16;

// Black & Light Yellow palette
// Black & Light Yellow Palette
const YELLOW        = [255, 255, 0]   as [number, number, number];   // Pure Yellow for main accents
const YELLOW_LIGHT  = [255, 255, 153] as [number, number, number];   // Light Yellow for highlights
const YELLOW_SOFT   = [255, 250, 205] as [number, number, number];   // Soft Lemon Chiffon for backgrounds

const DARK          = [20, 20, 20]    as [number, number, number];   // Dark background
const DARK2         = [50, 50, 50]    as [number, number, number];   // Slightly lighter dark for sections
const GRAY          = [100, 100, 100] as [number, number, number];   // Medium gray for text
const LGRAY         = [240, 240, 235] as [number, number, number];   // Light gray for subtle backgrounds
const WHITE         = [255, 255, 255] as [number, number, number];   // White for text and highlights

// ─── Helpers ────────────────────────────────────────────────────────────────────
function groupBySections(items: any[]) {
  const order: string[] = [];
  const map: Record<string, any[]> = {};
  for (const item of items) {
    const sec = item.section || "General";
    if (!map[sec]) { map[sec] = []; order.push(sec); }
    map[sec].push(item);
  }
  return order.map((title) => ({ title, items: map[title] }));
}

const secSubtotal = (items: any[]) => items.reduce((s, i) => s + i.quantity * i.price, 0);
const secTax      = (items: any[]) => items.reduce((s, i) => s + i.quantity * i.price * ((i.tax||0)/100), 0);
const secTotal    = (items: any[]) => secSubtotal(items) + secTax(items);

const emptyItem = (section = "General") => ({ description: "", quantity: 1, unitPrice: 0, tax: 0, section });

// ─── Default T&C text ──────────────────────────────────────────────────────────
const DEFAULT_TC_HEADER = `Date: 
Customer Name: 
Villa/Apartment: 
Building Name: 
Location: 
Reference QT: `;

const DEFAULT_TC_BODY = `The products and services provided by "SPACE EMBRACE INTERIOR DECORATION LLC" to the client is based on the following terms and conditions. The terms and condition is considered to be accepted by the client on placement of an order with "SPACE EMBRACE INTERIOR DECORATION LLC"

1. The estimate quoted for materials and services is based on the requirements and design opted by the client. If the client requires any change in the design or specification of materials will result in the change of estimation quoted earlier.

2. The registration fee paid at the time of application submission to the management will be adjusted in the final bill if the execution is conducted by "SPACE EMBRACE INTERIOR DECORATION LLC"

3. The estimate quoted includes all taxes based on the current tax provisions provided in the estimate. Any increase in the tax provision will be applied as per the laws at the time of the billing date.

4. All cheques/DDs or Online transfers are to be drawn in favour of "SPACE EMBRACE INTERIOR DECORATION LLC"

6. After scheduling of work date from "SPACE EMBRACE INTERIOR DECORATION LLC" if any change of date from the client or any issue at the site is not ready by the client will be charged as a penalty to change the date to reschedule the work date.

VALIDITY OF QUOTATION:
The estimate quoted for the client is valid for orders confirmed within Twenty days from the date of receipt of the quotation. Any additional requirements or customizations to be made after the final estimation will be billed additionally and the cost of any additional materials required by the client specification shall be billed separately. The estimation quoted includes all overheads and transportation to the site.

Payment Terms:
60% of the Total Amount will be an ADVANCE
30% of the Payment will be in Progress of 40%
10% of the Payment will be on Completion

IMPORTANT Terms:
1. The project will take 70 to 80 Working Days to complete. Any delays by the building management, Weekends, Holidays, or by the Client in choosing materials will not be Included.
2. The project is set to finish within 85 Working Days max estimated time.
3. 20% of the total agreement sum must be paid to the Co. as compensation if the agreement is canceled by the signee.
4. A 20% Balance of the total agreement sum is payable within 3 working days upon completion of the works including any additional work Invoice.
5. Any Work which is not mentioned in the Quotation will be CHARGED in Invoice Without Any QUOTATION.
6. The Client Should discuss the cost of Any Additional Work before Proceeding, if not it will be CHARGED as per Company standard Price in the Invoice.`;

const DEFAULT_PAYMENT_TERMS = `50% deposit required upon acceptance of quotation.
Remaining balance due upon project completion.
Prices are valid for 30 days from the date of this quotation.
All prices are inclusive of VAT unless stated otherwise.`;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function QuotationDetail({ quotation: initialQuotation }: any) {
  const router  = useRouter();
  const [quotation, setQuotation] = useState(initialQuotation);
  const [status, setStatus]       = useState(initialQuotation.status);
  const [saving, setSaving]       = useState(false);

  // ── Edit mode state ──────────────────────────────────────────────────────────
  const [editMode, setEditMode]   = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Build editable sections from saved items
  type EditItem = { description: string; quantity: number; unitPrice: number; tax: number };
  type EditSection = { id: string; title: string; items: EditItem[] };

  const buildEditSections = (items: any[]): EditSection[] => {
    const groups = groupBySections(items);
    return groups.map((g) => ({
      id: Math.random().toString(36).slice(2),
      title: g.title,
      items: g.items.map((i) => ({
        description: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        tax: i.tax || 0,
      })),
    }));
  };

  const [editSections, setEditSections] = useState<EditSection[]>([]);

  const enterEditMode = () => {
    setEditSections(buildEditSections(quotation.items));
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  // ── Edit section/item helpers ─────────────────────────────────────────────────
  const addSection = () =>
    setEditSections((p) => [...p, { id: Math.random().toString(36).slice(2), title: "", items: [emptyItem()] }]);

  const removeSection = (sid: string) =>
    setEditSections((p) => p.length > 1 ? p.filter((s) => s.id !== sid) : p);

  const updateSectionTitle = (sid: string, title: string) =>
    setEditSections((p) => p.map((s) => s.id === sid ? { ...s, title } : s));

  const addItem = (sid: string) =>
    setEditSections((p) => p.map((s) => s.id === sid ? { ...s, items: [...s.items, emptyItem()] } : s));

  const removeItem = (sid: string, idx: number) =>
    setEditSections((p) =>
      p.map((s) => s.id === sid ? { ...s, items: s.items.filter((_, i) => i !== idx) } : s)
    );

  const updateItem = (sid: string, idx: number, field: keyof EditItem, value: any) =>
    setEditSections((p) =>
      p.map((s) => {
        if (s.id !== sid) return s;
        const items = [...s.items];
        items[idx] = { ...items[idx], [field]: field === "description" ? value : parseFloat(value) || 0 };
        return { ...s, items };
      })
    );

  // ── Save edits ─────────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    setSaving(true);
    const flatItems: any[] = [];
    editSections.forEach((sec, sIdx) => {
      sec.items.forEach((item, iIdx) => {
        flatItems.push({
          name:      item.description || "Item",
          quantity:  item.quantity,
          price:     item.unitPrice,
          tax:       item.tax,
          section:   sec.title || `Section ${sIdx + 1}`,
          sortOrder: sIdx * 1000 + iIdx,
        });
      });
    });

    const res = await fetch(`/api/quotations/edit/${quotation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, items: flatItems }),
    });
    setSaving(false);

    if (res.ok) {
      // Recompute totals locally
      const subTotal = flatItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const tax      = flatItems.reduce((s, i) => s + i.price * i.quantity * ((i.tax||0)/100), 0);
      const total    = subTotal + tax;
      setQuotation({
        ...quotation,
        status,
        subTotal,
        tax,
        total,
        items: flatItems.map((i, idx) => ({ ...i, id: String(idx), price: i.price, quantity: i.quantity })),
      });
      setEditMode(false);
    } else {
      const d = await res.json();
      alert(d.message || "Failed to save");
    }
  };

  // ── Status-only update ─────────────────────────────────────────────────────────
  const handleStatusUpdate = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/quotations/edit/${quotation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    router.push("/quotations");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this quotation?")) return;
    await fetch(`/api/quotations/edit/${quotation.id}`, { method: "DELETE" });
    router.push("/quotations");
  };

  const handleConvertToInvoice = async () => {
    if (!confirm("Convert this quotation to an invoice?")) return;
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: quotation.clientId,
        items: quotation.items.map((i: any) => ({
          description: i.name, quantity: i.quantity, unitPrice: i.price, tax: i.tax || 0,
        })),
        dueDate: null,
      }),
    });
    if (res.ok) {
      await fetch(`/api/quotations/edit/${quotation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED" }),
      });
      router.push("/invoices");
    } else alert("Failed to convert to invoice");
  };

  // T&C state
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_PAYMENT_TERMS);
  const [tcHeader, setTcHeader]         = useState(DEFAULT_TC_HEADER);
  const [tcBody, setTcBody]             = useState(DEFAULT_TC_BODY);
  const [showTcEditor, setShowTcEditor] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF EXPORT — Black & YELLOW, 190px top padding
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const img = new Image();
    img.src = "/letterhead.jpg";
    img.onload = () => {
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      const addBg = () => doc.addImage(img, "JPEG", 0, 0, PAGE_W, PAGE_H);

      let cursorY = CONTENT_START;

      const ensureSpace = (needed: number) => {
        if (cursorY + needed > PAGE_BOTTOM) {
          doc.addPage();
          addBg();
          cursorY = CONTENT_START;
        }
      };

      // ═════════════════ QUOTATION PAGES ════════════════════════════════════
      addBg();

      // Title bar — YELLOW on dark
      doc.setFillColor(...DARK);
      doc.roundedRect(MARGIN, cursorY, CONTENT_W, 10, 2, 2, "F");
      // YELLOW left accent strip
      doc.setFillColor(...YELLOW);
      doc.roundedRect(MARGIN, cursorY, 3, 10, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...WHITE);
      doc.text("QUOTATION", PAGE_W / 2, cursorY + 6.8, { align: "center" });
      cursorY += 13;

      // Info row
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK2);
      const refStr    = `Ref: Q-${quotation.id.slice(0,8).toUpperCase()}`;
      const dateStr   = `Date: ${new Date(quotation.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`;
      const clientStr = `Client: ${quotation.client?.name || ""}`;
      doc.text(refStr,    MARGIN,           cursorY);
      doc.text(dateStr,   PAGE_W / 2,       cursorY, { align: "center" });
      doc.text(clientStr, PAGE_W - MARGIN,  cursorY, { align: "right" });

      // YELLOW divider
      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, cursorY + 3, PAGE_W - MARGIN, cursorY + 3);
      cursorY += 7;

      const col = {
        desc:  MARGIN + 2,
        qty:   MARGIN + 100,
        price: MARGIN + 122,
        tax:   MARGIN + 147,
        total: MARGIN + CONTENT_W - 2,
      };

      const viewSections = groupBySections(quotation.items || []);

      for (const section of viewSections) {
        ensureSpace(16);

        // Section heading — YELLOW background, dark text
        doc.setFillColor(...YELLOW);
        doc.roundedRect(MARGIN, cursorY, CONTENT_W, 7.5, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(section.title.toUpperCase(), MARGIN + 4, cursorY + 5.2);
        cursorY += 9;

        // Column headers
        ensureSpace(8);
        doc.setFillColor(...LGRAY);
        doc.rect(MARGIN, cursorY, CONTENT_W, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY);
        doc.text("DESCRIPTION",  col.desc,  cursorY + 4);
        doc.text("QTY",          col.qty,   cursorY + 4, { align: "center" });
        doc.text("UNIT PRICE",   col.price, cursorY + 4, { align: "right" });
        doc.text("TAX",          col.tax,   cursorY + 4, { align: "right" });
        doc.text("AMOUNT (AED)", col.total, cursorY + 4, { align: "right" });
        cursorY += 6;

        doc.setDrawColor(...YELLOW);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);

        let rowShade = false;
        for (const item of section.items) {
          const itemTotal = item.quantity * item.price * (1 + (item.tax||0)/100);
          const descLines = doc.splitTextToSize(item.name, 92);
          const rowH = Math.max(6.5, descLines.length * 4.5 + 2);
          ensureSpace(rowH + 2);

          if (rowShade) { doc.setFillColor(252, 250, 244); doc.rect(MARGIN, cursorY, CONTENT_W, rowH, "F"); }
          rowShade = !rowShade;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...DARK2);
          doc.text(descLines,                             col.desc,  cursorY + 4.5);
          doc.text(String(item.quantity),                 col.qty,   cursorY + 4.5, { align: "center" });
          doc.text(Number(item.price).toFixed(2),         col.price, cursorY + 4.5, { align: "right" });
          doc.text(`${item.tax||0}%`,                     col.tax,   cursorY + 4.5, { align: "right" });
          doc.text(itemTotal.toFixed(2),                  col.total, cursorY + 4.5, { align: "right" });
          cursorY += rowH;

          doc.setDrawColor(220, 210, 185);
          doc.setLineWidth(0.15);
          doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);
        }

        // Section subtotal — YELLOW pill
        ensureSpace(12);
        cursorY += 2;
        doc.setFillColor(...YELLOW_LIGHT);
        doc.setDrawColor(...YELLOW);
        doc.setLineWidth(0.3);
        doc.roundedRect(MARGIN + 75, cursorY, CONTENT_W - 75, 8, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.8);
        doc.setTextColor(...DARK);
        doc.text(
          `${section.title} Subtotal: ${secSubtotal(section.items).toFixed(2)} AED  ·  Tax: ${secTax(section.items).toFixed(2)} AED  ·  Total: ${secTotal(section.items).toFixed(2)} AED`,
          MARGIN + 77, cursorY + 5.3
        );
        cursorY += 12;
      }

      // Grand total box
      ensureSpace(40);
      cursorY += 5;
      const grandSub   = Number(quotation.subTotal);
      const grandTax   = Number(quotation.tax);
      const grandTotal = Number(quotation.total);
      const totW = 85;
      const totX = PAGE_W - MARGIN - totW;

      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.5);
      doc.roundedRect(totX, cursorY, totW, 28, 2, 2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK2);
      doc.text("Subtotal",                      totX + 4,        cursorY + 8);
      doc.text(`${grandSub.toFixed(2)} AED`,    totX + totW - 4, cursorY + 8,  { align: "right" });
      doc.text("Tax",                           totX + 4,        cursorY + 16);
      doc.text(`${grandTax.toFixed(2)} AED`,    totX + totW - 4, cursorY + 16, { align: "right" });

      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.6);
      doc.line(totX + 3, cursorY + 19, totX + totW - 3, cursorY + 19);

      // YELLOW total bar
      doc.setFillColor(...YELLOW);
      doc.roundedRect(totX, cursorY + 20, totW, 8, 0, 0, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text("TOTAL",                        totX + 4,        cursorY + 25.8);
      doc.text(`${grandTotal.toFixed(2)} AED`, totX + totW - 4, cursorY + 25.8, { align: "right" });
      cursorY += 35;

      // Payment Terms block
      if (paymentTerms.trim()) {
        ensureSpace(35);
        cursorY += 4;
        doc.setFillColor(250, 245, 225);
        doc.setDrawColor(...YELLOW);
        doc.setLineWidth(0.5);
        doc.roundedRect(MARGIN, cursorY, CONTENT_W, 6.5, 1.5, 1.5, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...DARK);
        doc.text("PAYMENT TERMS & CONDITIONS", MARGIN + 3, cursorY + 4.5);
        cursorY += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...DARK2);
        for (const line of paymentTerms.split("\n").filter(l => l.trim())) {
          ensureSpace(6);
          const wrapped = doc.splitTextToSize(`• ${line.replace(/^•\s*/,"")}`, CONTENT_W - 6);
          doc.text(wrapped, MARGIN + 3, cursorY + 4);
          cursorY += wrapped.length * 4.5 + 1;
        }
      }

      // ═════════════════ T&C PAGE ════════════════════════════════════════════
      doc.addPage();
      addBg();
      let tcY = CONTENT_START;

      // T&C title bar
      doc.setFillColor(...DARK);
      doc.roundedRect(MARGIN, tcY, CONTENT_W, 11, 2, 2, "F");
      doc.setFillColor(...YELLOW);
      doc.roundedRect(MARGIN, tcY, 3, 11, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...YELLOW);
      doc.text(
        "TERMS AND CONDITIONS FOR INTERIOR WORK AND TURNKEY SOLUTION",
        PAGE_W / 2, tcY + 7.2, { align: "center" }
      );
      tcY += 15;

      // Header info block
      if (tcHeader.trim()) {
        const headerLines = tcHeader.split("\n").filter(l => l.trim());
        const blockH = headerLines.length * 6.5 + 5;

        doc.setFillColor(252, 250, 244);
        doc.setDrawColor(...YELLOW);
        doc.setLineWidth(0.4);
        doc.roundedRect(MARGIN, tcY, CONTENT_W, blockH, 2, 2, "FD");
        // YELLOW left border
        doc.setFillColor(...YELLOW);
        doc.rect(MARGIN, tcY, 2.5, blockH, "F");

        doc.setFontSize(8.5);
        let lineY = tcY + 6.5;
        for (const line of headerLines) {
          const colonIdx = line.indexOf(":");
          if (colonIdx > -1) {
            const label = line.slice(0, colonIdx + 1);
            const value = line.slice(colonIdx + 1);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...DARK);
            doc.text(label, MARGIN + 5, lineY);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK2);
            doc.text(value, MARGIN + 5 + doc.getTextWidth(label) + 1, lineY);
          } else {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK2);
            doc.text(line, MARGIN + 5, lineY);
          }
          lineY += 6.5;
        }
        tcY = lineY + 5;
      }

      // T&C body
      const TC_PAGE_BOTTOM = PAGE_H - 48; // reserve space for signature
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...DARK2);

      const isHeadingLine = (line: string) =>
        /^(VALIDITY|Payment Terms|IMPORTANT Terms|IMPORTANT TERMS)/i.test(line.trim()) ||
        /^[A-Z][A-Z ]{3,}:/.test(line.trim());

      for (const rawLine of tcBody.split("\n")) {
        const line = rawLine.trimEnd();

        if (tcY > TC_PAGE_BOTTOM) {
          doc.addPage(); addBg(); tcY = CONTENT_START;
        }

        if (!line) { tcY += 2.5; continue; }

        if (isHeadingLine(line)) {
          tcY += 1.5;
          if (tcY + 8 > TC_PAGE_BOTTOM) { doc.addPage(); addBg(); tcY = CONTENT_START; }

          // YELLOW heading bar
          doc.setFillColor(...YELLOW_LIGHT);
          doc.setDrawColor(...YELLOW);
          doc.setLineWidth(0.3);
          doc.roundedRect(MARGIN, tcY - 1, CONTENT_W, 7.5, 1, 1, "FD");
          doc.setFillColor(...YELLOW);
          doc.rect(MARGIN, tcY - 1, 2.5, 7.5, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(...DARK);
          const wrapped = doc.splitTextToSize(line, CONTENT_W - 8);
          doc.text(wrapped, MARGIN + 5, tcY + 4.3);
          tcY += 10;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...DARK2);
          continue;
        }

        const wrapped = doc.splitTextToSize(line, CONTENT_W - 4);
        if (tcY + wrapped.length * 4.5 > TC_PAGE_BOTTOM) { doc.addPage(); addBg(); tcY = CONTENT_START; }
        doc.text(wrapped, MARGIN + 2, tcY);
        tcY += wrapped.length * 4.5 + 1;
      }

      // Signature block
      const sigH = 36;
      let sigY = tcY + 8;
      if (sigY + sigH > PAGE_H - 10) { doc.addPage(); addBg(); sigY = CONTENT_START + 10; }

      // YELLOW divider
      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, sigY, PAGE_W - MARGIN, sigY);

      const colW = CONTENT_W / 2 - 5;

      // Company stamp box
      doc.setFillColor(252, 250, 244);
      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, sigY + 4, colW, 26, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK);
      doc.text("SPACE EMBRACE INTERIOR DECORATION LLC", MARGIN + colW/2, sigY + 11, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text("Authorised Stamp & Signature", MARGIN + colW/2, sigY + 16, { align: "center" });
      

      // Client signature box
      const rightX = MARGIN + colW + 10;
      doc.setFillColor(252, 250, 244);
      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.3);
      doc.roundedRect(rightX, sigY + 4, colW, 26, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK);
      doc.text("CLIENT", rightX + colW/2, sigY + 11, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text("Client's Signature & Date", rightX + colW/2, sigY + 16, { align: "center" });
      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.4);
      doc.line(rightX + 8, sigY + 27, rightX + colW - 8, sigY + 27);

      // ── Page footers ─────────────────────────────────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text(`Page ${p} of ${totalPages}`, PAGE_W / 2, PAGE_H - 6, { align: "center" });
        doc.setTextColor(...YELLOW);
        doc.text(`Q-${quotation.id.slice(0,8).toUpperCase()}`, MARGIN, PAGE_H - 6);
      }

      doc.save(`Quotation_Q-${quotation.id.slice(0,8).toUpperCase()}.pdf`);
    };
    img.onerror = () => alert("Could not load letterhead. Make sure /public/letterhead.jpg exists.");
  };

  // ── Status badge ──────────────────────────────────────────────────────────────
  const statusColor = (s: string) => ({
    DRAFT: "bg-gray-100 text-gray-700", SENT: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700",
  }[s] || "bg-gray-100 text-gray-600");

  const viewSections = groupBySections(quotation.items || []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/quotations" className="text-gray-400 hover:text-gray-600">← Back</Link>
        <h1 className="text-xl md:text-3xl font-bold">
          Quotation <span className="text-gray-400 text-2xl font-mono">Q-{quotation.id.slice(0,8).toUpperCase()}</span>
        </h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(quotation.status)}`}>
          {quotation.status}
        </span>
      </div>

      {/* Controls row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Details */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-3">Details</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-medium text-gray-800">Client:</span> {quotation.client?.name}</p>
            <p><span className="font-medium text-gray-800">Created:</span> {new Date(quotation.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
            {viewSections.map((sec, i) => (
              <div key={i} className="flex justify-between text-gray-400">
                <span>{sec.title}</span><span>{secTotal(sec.items).toFixed(2)} AED</span>
              </div>
            ))}
            <div className="flex justify-between text-gray-500 pt-1 border-t"><span>Subtotal</span><span>{Number(quotation.subTotal).toFixed(2)} AED</span></div>
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>{Number(quotation.tax).toFixed(2)} AED</span></div>
            <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-1.5"><span>Total</span><span>{Number(quotation.total).toFixed(2)} AED</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-3">Actions</h2>
          <form onSubmit={handleStatusUpdate} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <button type="submit" disabled={saving}
                className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
                Update Status
              </button>
              <button type="button" onClick={enterEditMode}
                className="w-full py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 flex items-center justify-center gap-2">
                <FiEdit2 size={13} /> Edit Items & Sections
              </button>
              <button type="button" onClick={handleConvertToInvoice}
                className="w-full py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700">
                → Convert to Invoice
              </button>
              <button type="button" onClick={handleExportPDF}
                className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-900 font-medium">
                ↓ Export PDF
              </button>
              <button type="button" onClick={handleDelete}
                className="w-full py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50">
                Delete
              </button>
            </div>
          </form>
        </div>

        {/* Payment Terms */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100">
          <h2 className="font-semibold text-gray-700 mb-1">Payment Terms Note</h2>
          <p className="text-xs text-gray-400 mb-2">Appears on the quotation pages in PDF</p>
          <textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} rows={5}
            className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none leading-relaxed" />
        </div>
      </div>

      {/* T&C editor toggle */}
      <div className="mb-5">
        <button onClick={() => setShowTcEditor(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 bg-white px-4 py-2.5 rounded-xl hover:bg-gray-50 shadow-sm">
          📄 {showTcEditor ? "Hide" : "Edit"} Terms &amp; Conditions Page
        </button>
      </div>

      {showTcEditor && (
        <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Terms &amp; Conditions — Last Page of PDF</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">Header Info (Customer, Date, etc.)</label>
              <textarea value={tcHeader} onChange={(e) => setTcHeader(e.target.value)} rows={9}
                className="w-full text-xs border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-200 resize-y font-mono leading-relaxed" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">Terms &amp; Conditions Body</label>
              <textarea value={tcBody} onChange={(e) => setTcBody(e.target.value)} rows={9}
                className="w-full text-xs border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-200 resize-y leading-relaxed" />
            </div>
          </div>
          <p className="text-xs text-gray-400">💡 Lines starting with ALL CAPS (e.g. "VALIDITY OF QUOTATION:" or "IMPORTANT Terms:") become YELLOW section headings in the PDF.</p>
        </div>
      )}

      {/* ─── EDIT MODE OVERLAY ──────────────────────────────────────────────── */}
      {editMode && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen p-6">
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Edit header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
                <h2 className="text-lg font-bold">Edit Quotation Sections &amp; Items</h2>
                <div className="flex gap-3">
                  <button onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-600 rounded-lg text-sm text-gray-300 hover:bg-gray-800">
                    <FiX size={14} /> Cancel
                  </button>
                  <button onClick={handleSaveEdit} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-yellow-500 text-gray-900 rounded-lg text-sm font-semibold hover:bg-yellow-400 disabled:opacity-60">
                    <FiSave size={14} /> {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {editSections.map((section, sIdx) => (
                  <div key={section.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Section header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-yellow-50 to-white border-b border-gray-100">
                      <span className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {sIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        placeholder="Section name (e.g. Bathroom, Bedroom…)"
                        className="flex-1 text-base font-semibold text-gray-800 bg-transparent border-0 border-b-2 border-dashed border-yellow-300 focus:outline-none focus:border-yellow-500 pb-0.5 placeholder:font-normal placeholder:text-sm placeholder:text-gray-400"
                      />
                      <button onClick={() => setCollapsed(c => ({...c, [section.id]: !c[section.id]}))}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        {collapsed[section.id] ? <FiChevronDown size={16}/> : <FiChevronUp size={16}/>}
                      </button>
                      {editSections.length > 1 && (
                        <button onClick={() => removeSection(section.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                          <FiTrash2 size={15}/>
                        </button>
                      )}
                    </div>

                    {!collapsed[section.id] && (
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400 text-xs uppercase">
                              <th className="pb-2 text-left pr-3 font-semibold">Description</th>
                              <th className="pb-2 text-left pr-3 w-20 font-semibold">Qty</th>
                              <th className="pb-2 text-left pr-3 w-32 font-semibold">Unit Price</th>
                              <th className="pb-2 text-left pr-3 w-20 font-semibold">Tax %</th>
                              <th className="pb-2 text-right w-28 font-semibold">Amount</th>
                              <th className="pb-2 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.items.map((item, iIdx) => {
                              const amt = item.quantity * item.unitPrice * (1 + item.tax/100);
                              return (
                                <tr key={iIdx} className="group">
                                  <td className="pr-3 py-1.5">
                                    <input type="text" value={item.description}
                                      onChange={(e) => updateItem(section.id, iIdx, "description", e.target.value)}
                                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"/>
                                  </td>
                                  <td className="pr-3 py-1.5">
                                    <input type="number" min="0.01" step="0.01" value={item.quantity}
                                      onChange={(e) => updateItem(section.id, iIdx, "quantity", e.target.value)}
                                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"/>
                                  </td>
                                  <td className="pr-3 py-1.5">
                                    <input type="number" min="0" step="0.01" value={item.unitPrice}
                                      onChange={(e) => updateItem(section.id, iIdx, "unitPrice", e.target.value)}
                                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"/>
                                  </td>
                                  <td className="pr-3 py-1.5">
                                    <input type="number" min="0" max="100" step="0.01" value={item.tax}
                                      onChange={(e) => updateItem(section.id, iIdx, "tax", e.target.value)}
                                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"/>
                                  </td>
                                  <td className="py-1.5 text-right font-semibold text-gray-700">{amt.toFixed(2)} AED</td>
                                  <td className="py-1.5 pl-2">
                                    {section.items.length > 1 && (
                                      <button onClick={() => removeItem(section.id, iIdx)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition">
                                        <FiTrash2 size={14}/>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-gray-100">
                          <button onClick={() => addItem(section.id)}
                            className="flex items-center gap-1.5 text-sm text-yellow-700 hover:text-yellow-900 font-medium">
                            <FiPlus size={14}/> Add Item
                          </button>
                          <div className="text-right text-sm space-y-0.5">
                            <div className="flex gap-6 text-gray-500">
                              <span>Section Subtotal:</span>
                              <span className="font-medium">{section.items.reduce((s,i)=>s+i.quantity*i.unitPrice,0).toFixed(2)} AED</span>
                            </div>
                            <div className="flex gap-6 font-bold text-yellow-800 text-base">
                              <span>Section Total:</span>
                              <span>{section.items.reduce((s,i)=>s+i.quantity*i.unitPrice*(1+i.tax/100),0).toFixed(2)} AED</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button onClick={addSection}
                  className="w-full py-3 border-2 border-dashed border-yellow-300 rounded-2xl text-yellow-700 hover:border-yellow-500 hover:bg-yellow-50 transition text-sm font-medium flex items-center justify-center gap-2">
                  <FiPlus size={16}/> Add New Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW: Sectioned items ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {viewSections.map((section, sIdx) => (
          <div key={sIdx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-yellow-50 to-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-bold flex items-center justify-center">{sIdx + 1}</span>
                <h3 className="font-semibold text-gray-800">{section.title}</h3>
              </div>
              <span className="text-sm font-bold text-yellow-800">{secTotal(section.items).toFixed(2)} AED</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs uppercase text-gray-400 font-semibold">
                  <th className="px-5 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Tax</th>
                  <th className="px-5 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {section.items.map((item: any, iIdx: number) => (
                  <tr key={item.id || iIdx} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-2.5 font-medium text-gray-800">{item.name}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{Number(item.price).toFixed(2)} AED</td>
                    <td className="px-3 py-2.5 text-right text-gray-400">{item.tax || 0}%</td>
                    <td className="px-5 py-2.5 text-right font-semibold">
                      {(item.quantity * item.price * (1+(item.tax||0)/100)).toFixed(2)} AED
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end px-5 py-3 bg-yellow-50 border-t border-yellow-100 gap-6 text-sm">
              <span className="text-gray-500">Subtotal: <span className="font-medium">{secSubtotal(section.items).toFixed(2)} AED</span></span>
              {secTax(section.items) > 0 && <span className="text-gray-500">Tax: <span className="font-medium">{secTax(section.items).toFixed(2)} AED</span></span>}
              <span className="text-yellow-800 font-bold">Section Total: {secTotal(section.items).toFixed(2)} AED</span>
            </div>
          </div>
        ))}

        {/* Grand Total */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              {viewSections.map((sec, i) => (
                <div key={i} className="flex justify-between text-gray-400">
                  <span>{sec.title}</span><span>{secTotal(sec.items).toFixed(2)} AED</span>
                </div>
              ))}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{Number(quotation.subTotal).toFixed(2)} AED</span></div>
                <div className="flex justify-between text-gray-500"><span>Tax</span><span>{Number(quotation.tax).toFixed(2)} AED</span></div>
                <div className="flex justify-between font-bold text-xl border-t pt-2" style={{color:"#B08836"}}>
                  <span>TOTAL</span><span>{Number(quotation.total).toFixed(2)} AED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id: String(params?.id) },
    include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quotation) return { notFound: true };

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return {
    props: {
      quotation: {
        ...quotation,
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString(),
        subTotal: Number(quotation.subTotal),
        tax:      Number(quotation.tax),
        total:    Number(quotation.total),
        client: quotation.client ? {
          ...quotation.client,
          createdAt: quotation.client.createdAt.toISOString(),
          updatedAt: quotation.client.updatedAt.toISOString(),
        } : null,
        items: quotation.items.map((i) => ({
          ...i, price: Number(i.price), quantity: Number(i.quantity),
          tax: Number(i.tax ?? 0), section: i.section || "General",
        })),
      },
      clients: clients.map((c) => ({
        ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      })),
    },
  };
};
