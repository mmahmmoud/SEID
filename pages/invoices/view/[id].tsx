import { GetServerSideProps } from "next";
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FiArrowLeft, FiCheck, FiEdit2, FiDollarSign } from "react-icons/fi";
import jsPDF from "jspdf";

// ─── PDF constants ─────────────────────────────────────────────────────────────
const PAGE_W        = 210;
const PAGE_H        = 297;
const MARGIN        = 14;
const CONTENT_W     = PAGE_W - MARGIN * 2;
const CONTENT_START = 50.3;
const PAGE_BOTTOM   = PAGE_H - 16;

const YELLOW       = [255, 255, 0]   as [number, number, number];
const YELLOW_LIGHT = [255, 255, 153] as [number, number, number];
const DARK         = [20, 20, 20]    as [number, number, number];
const DARK2        = [50, 50, 50]    as [number, number, number];
const GRAY         = [100, 100, 100] as [number, number, number];
const LGRAY        = [240, 240, 235] as [number, number, number];
const WHITE        = [255, 255, 255] as [number, number, number];

const methodIcon: Record<string, string> = {
  Cash: "💵", Cheque: "📝", "Bank Transfer": "🏦", "": "💰",
};

const statusColors: Record<string, string> = {
  PAID:    "bg-green-100 text-green-700",
  UNPAID:  "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default function InvoiceView({ invoice: initInvoice }: { invoice: any }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initInvoice);

  const reload = async () => {
    const updated = await fetch(`/api/invoices/${invoice.id}`).then((r) => r.json());
    setInvoice(updated);
  };

  const markInstallmentPaid = async (id: string) => {
    await fetch(`/api/installments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    reload();
  };

  const markInvoicePaid = async () => {
    if (!confirm("Mark entire invoice as PAID?")) return;
    await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    reload();
  };

  const paidInst = (invoice.installments || []).filter((i: any) => i.status === "PAID");
  const totalPaid = (Number(invoice.deposit) || 0) + paidInst.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalRemaining = Number(invoice.total) - totalPaid;

  // ─── PDF Export ──────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const img = new Image();
    img.src = "/letterhead.jpg";
    img.onload = () => {
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const addBg = () => doc.addImage(img, "JPEG", 0, 0, PAGE_W, PAGE_H);

      let cursorY = CONTENT_START;
      const ensureSpace = (needed: number) => {
        if (cursorY + needed > PAGE_BOTTOM) {
          doc.addPage(); addBg(); cursorY = CONTENT_START;
        }
      };

      addBg();

      // ── Title bar ────────────────────────────────────────────────────────────
      doc.setFillColor(...DARK);
      doc.roundedRect(MARGIN, cursorY, CONTENT_W, 10, 2, 2, "F");
      doc.setFillColor(...YELLOW);
      doc.roundedRect(MARGIN, cursorY, 3, 10, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...WHITE);
      doc.text("INVOICE", PAGE_W / 2, cursorY + 6.8, { align: "center" });
      cursorY += 13;

      // ── Info row ─────────────────────────────────────────────────────────────
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK2);
      const refStr    = `Ref: INV-${invoice.id.slice(0, 8).toUpperCase()}`;
      const dateStr   = `Date: ${new Date(invoice.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
      const clientStr = `Client: ${invoice.client?.name || ""}`;
      doc.text(refStr,    MARGIN,          cursorY);
      doc.text(dateStr,   PAGE_W / 2,      cursorY, { align: "center" });
      doc.text(clientStr, PAGE_W - MARGIN, cursorY, { align: "right" });

      // Due date & status badge
      cursorY += 5;
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      if (invoice.dueDate) {
        doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`, MARGIN, cursorY);
      }

      // Status badge
      const statusBgMap: Record<string, [number, number, number]> = {
        PAID:    [34, 197, 94],
        UNPAID:  [202, 138, 4],
        OVERDUE: [220, 38, 38],
      };
      const badgeBg = statusBgMap[invoice.status] || [100, 100, 100];
      doc.setFillColor(...badgeBg);
      const statusText = invoice.status;
      doc.setFontSize(7);
      const statusW = doc.getTextWidth(statusText) + 6;
      doc.roundedRect(PAGE_W - MARGIN - statusW, cursorY - 4, statusW, 5.5, 1, 1, "F");
      doc.setTextColor(...WHITE);
      doc.text(statusText, PAGE_W - MARGIN - statusW / 2, cursorY - 0.3, { align: "center" });
      cursorY += 4;

      // ── YELLOW divider ───────────────────────────────────────────────────────
      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, cursorY + 3, PAGE_W - MARGIN, cursorY + 3);
      cursorY += 8;

      // ── Column positions ─────────────────────────────────────────────────────
      const col = {
        desc:  MARGIN + 2,
        qty:   MARGIN + 105,
        price: MARGIN + 130,
        tax:   MARGIN + 155,
        total: MARGIN + CONTENT_W - 2,
      };

      // ── Column headers ───────────────────────────────────────────────────────
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

      // ── Items ────────────────────────────────────────────────────────────────
      let rowShade = false;
      for (const item of invoice.items) {
        const itemTotal  = item.quantity * Number(item.price) * (1 + (item.tax || 0) / 100);
        const descLines  = doc.splitTextToSize(item.name, 97);
        const rowH       = Math.max(6.5, descLines.length * 4.5 + 2);
        ensureSpace(rowH + 2);

        if (rowShade) {
          doc.setFillColor(252, 250, 244);
          doc.rect(MARGIN, cursorY, CONTENT_W, rowH, "F");
        }
        rowShade = !rowShade;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...DARK2);
        doc.text(descLines,                              col.desc,  cursorY + 4.5);
        doc.text(String(item.quantity),                  col.qty,   cursorY + 4.5, { align: "center" });
        doc.text(Number(item.price).toFixed(2),          col.price, cursorY + 4.5, { align: "right" });
        doc.text(`${item.tax || 0}%`,                    col.tax,   cursorY + 4.5, { align: "right" });
        doc.text(itemTotal.toFixed(2),                   col.total, cursorY + 4.5, { align: "right" });
        cursorY += rowH;

        doc.setDrawColor(220, 210, 185);
        doc.setLineWidth(0.15);
        doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);
      }

      // ── Grand total box ──────────────────────────────────────────────────────
      ensureSpace(40);
      cursorY += 5;
      const grandSub   = Number(invoice.subTotal);
      const grandTax   = Number(invoice.tax);
      const grandTotal = Number(invoice.total);
      const totW = 85;
      const totX = PAGE_W - MARGIN - totW;

      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.5);
      doc.roundedRect(totX, cursorY, totW, 28, 2, 2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK2);
      doc.text("Subtotal",                    totX + 4,        cursorY + 8);
      doc.text(`${grandSub.toFixed(2)} AED`,  totX + totW - 4, cursorY + 8,  { align: "right" });
      doc.text("Tax",                         totX + 4,        cursorY + 16);
      doc.text(`${grandTax.toFixed(2)} AED`,  totX + totW - 4, cursorY + 16, { align: "right" });

      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(0.6);
      doc.line(totX + 3, cursorY + 19, totX + totW - 3, cursorY + 19);

      doc.setFillColor(...YELLOW);
      doc.roundedRect(totX, cursorY + 20, totW, 8, 0, 0, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text("TOTAL",                         totX + 4,        cursorY + 25.8);
      doc.text(`${grandTotal.toFixed(2)} AED`,  totX + totW - 4, cursorY + 25.8, { align: "right" });
      cursorY += 35;

      // ── Page footers ─────────────────────────────────────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text(`Page ${p} of ${totalPages}`, PAGE_W / 2, PAGE_H - 6, { align: "center" });
        doc.setTextColor(...YELLOW);
        doc.text(`INV-${invoice.id.slice(0, 8).toUpperCase()}`, MARGIN, PAGE_H - 6);
      }

      doc.save(`Invoice_INV-${invoice.id.slice(0, 8).toUpperCase()}.pdf`);
    };
    img.onerror = () => alert("Could not load letterhead. Make sure /public/letterhead.jpg exists.");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600">
          <FiArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Invoice</h1>
          <p className="text-gray-500 text-sm font-mono mt-0.5">#{invoice.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColors[invoice.status] || "bg-gray-100"}`}>
            {invoice.status}
          </span>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-xl hover:bg-gray-900 text-sm font-medium"
          >
            ↓ Export PDF
          </button>
          <button
            onClick={() => router.push(`/invoices/edit/${invoice.id}`)}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm"
          >
            <FiEdit2 size={14} /> Edit
          </button>
          {invoice.status !== "PAID" && (
            <button
              onClick={markInvoicePaid}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 text-sm"
            >
              <FiCheck size={14} /> Mark All Paid
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-xs font-semibold uppercase text-gray-400 mb-3">Bill To</h2>
          <p className="font-bold text-lg">{invoice.client?.name}</p>
          {invoice.client?.email   && <p className="text-sm text-gray-500 mt-1">✉️ {invoice.client.email}</p>}
          {invoice.client?.phone   && <p className="text-sm text-gray-500">📞 {invoice.client.phone}</p>}
          {invoice.client?.address && <p className="text-sm text-gray-500">📍 {invoice.client.address}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-xs font-semibold uppercase text-gray-400 mb-3">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Date</span><span>{new Date(invoice.createdAt).toLocaleDateString()}</span></div>
            {invoice.dueDate && <div className="flex justify-between text-gray-600"><span>Due</span><span>{new Date(invoice.dueDate).toLocaleDateString()}</span></div>}
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{Number(invoice.subTotal).toFixed(2)} AED</span></div>
            <div className="flex justify-between text-gray-600"><span>Tax</span><span>{Number(invoice.tax).toFixed(2)} AED</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{Number(invoice.total).toFixed(2)} AED</span></div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h2 className="font-semibold text-gray-700 mb-4">Line Items</h2>
        <table className="w-full text-sm">
          <thead className="text-gray-400 text-xs uppercase">
            <tr>
              <th className="pb-2 text-left">Item</th>
              <th className="pb-2 text-center">Qty</th>
              <th className="pb-2 text-right">Unit Price</th>
              <th className="pb-2 text-right">Tax</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any) => (
              <tr key={item.id} className="border-t border-gray-50">
                <td className="py-2.5 font-medium">{item.name}</td>
                <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                <td className="py-2.5 text-right text-gray-600">{Number(item.price).toFixed(2)} AED</td>
                <td className="py-2.5 text-right text-gray-400">{item.tax || 0}%</td>
                <td className="py-2.5 text-right font-semibold">
                  {(item.quantity * Number(item.price) * (1 + (item.tax || 0) / 100)).toFixed(2)} AED
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Job Profitability — internal only */}
      {Number(invoice.materialCost) > 0 && (() => {
        const revenue = Number(invoice.total);
        const cost    = Number(invoice.materialCost);
        const profit  = revenue - cost;
        const margin  = revenue > 0 ? (profit / revenue) * 100 : 0;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Internal</span>
              <h2 className="font-semibold text-gray-700">Job Profitability</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Revenue",       value: revenue.toFixed(2) + " AED", color: "text-gray-800" },
                { label: "Material Cost", value: cost.toFixed(2)    + " AED", color: "text-orange-600" },
                { label: "Gross Profit",  value: profit.toFixed(2)  + " AED", color: profit >= 0 ? "text-green-600" : "text-red-600" },
                { label: "Margin",        value: margin.toFixed(1)  + "%",    color: margin >= 30 ? "text-green-600" : margin >= 10 ? "text-yellow-600" : "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={"font-bold text-lg " + color}>{value}</p>
                </div>
              ))}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={"h-full rounded-full " + (margin >= 30 ? "bg-green-500" : margin >= 10 ? "bg-yellow-400" : "bg-red-500")}
                style={{ width: Math.min(100, Math.max(0, margin)) + "%" }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{margin.toFixed(1)}% gross margin</p>
            {invoice.linkedPurchaseIds?.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {invoice.linkedPurchaseIds.length} purchase order{invoice.linkedPurchaseIds.length > 1 ? "s" : ""} linked to this job
              </p>
            )}
          </div>
        );
      })()}

      {/* Payment Plan */}
      {(Number(invoice.deposit) > 0 || invoice.installments?.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FiDollarSign size={16} className="text-blue-600" /> Payment Plan
          </h2>

          <div className="mb-5">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="font-semibold">{totalPaid.toFixed(2)} / {Number(invoice.total).toFixed(2)} AED</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalPaid / Number(invoice.total)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-green-600">{((totalPaid / Number(invoice.total)) * 100).toFixed(0)}% paid</span>
              <span className={totalRemaining > 0.01 ? "text-red-500" : "text-green-600"}>
                {totalRemaining > 0.01 ? `${totalRemaining.toFixed(2)} AED remaining` : "Fully paid ✓"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {Number(invoice.deposit) > 0 && (
              <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-100 rounded-xl">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">D</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Deposit</p>
                  {invoice.depositMethod && (
                    <p className="text-xs text-gray-500">{methodIcon[invoice.depositMethod]} {invoice.depositMethod}</p>
                  )}
                </div>
                <p className="font-bold text-green-700">{Number(invoice.deposit).toFixed(2)} AED</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                  <FiCheck size={11} /> Paid
                </span>
              </div>
            )}

            {invoice.installments?.map((inst: any, idx: number) => {
              const overdue = inst.status === "PENDING" && new Date(inst.dueDate) < new Date();
              return (
                <div key={inst.id} className={`flex items-center gap-4 p-3 rounded-xl border ${
                  inst.status === "PAID" ? "bg-green-50 border-green-100"
                  : overdue              ? "bg-red-50 border-red-100"
                  :                        "bg-blue-50 border-blue-100"
                }`}>
                  <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    inst.status === "PAID" ? "bg-green-600" : overdue ? "bg-red-500" : "bg-blue-600"
                  }`}>{idx + 1}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">Installment {idx + 1}</p>
                    <div className="flex flex-wrap gap-3 mt-0.5">
                      <p className="text-xs text-gray-500">Due: {new Date(inst.dueDate).toLocaleDateString()}</p>
                      {inst.paymentMethod && (
                        <p className="text-xs text-gray-500">{methodIcon[inst.paymentMethod]} {inst.paymentMethod}</p>
                      )}
                      {inst.notes && <p className="text-xs text-gray-400 italic">{inst.notes}</p>}
                    </div>
                    {inst.paidAt && (
                      <p className="text-xs text-green-600 mt-0.5">Paid on {new Date(inst.paidAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <p className="font-bold text-gray-800">{Number(inst.amount).toFixed(2)} AED</p>
                  {inst.status === "PAID" ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                      <FiCheck size={11} /> Paid
                    </span>
                  ) : (
                    <button
                      onClick={() => markInstallmentPaid(inst.id)}
                      className="text-xs px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition font-medium flex items-center gap-1"
                    >
                      <FiCheck size={11} /> Mark Paid
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: String(params?.id) },
    include: { client: true, items: true, installments: { orderBy: { dueDate: "asc" } } },
  });
  if (!invoice) return { notFound: true };
  const raw = JSON.parse(JSON.stringify(invoice));
  return {
    props: {
      invoice: {
        ...raw,
        materialCost:      Number(raw.materialCost) || 0,
        linkedPurchaseIds: (raw.linkedPurchaseIds || "").split(",").filter(Boolean),
      },
    },
  };
};