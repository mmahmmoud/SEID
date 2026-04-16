import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { prisma } from "@/lib/prisma";
import { FiPlus, FiTrash2, FiArrowLeft, FiSave, FiCreditCard, FiLink, FiTrendingUp } from "react-icons/fi";

const PAYMENT_METHODS = ["Cash", "Cheque", "Bank Transfer"];

type Item        = { id?: string; name: string; quantity: number; price: number; costPrice: number; tax: number };
type Installment = { id?: string; amount: string; dueDate: string; notes: string; paymentMethod: string; status: string };

export default function EditInvoice({ invoice }: any) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [linkedPurchaseIds, setLinkedPurchaseIds] = useState<string[]>(
    Array.isArray(invoice.linkedPurchaseIds) ? invoice.linkedPurchaseIds : []
  );
  const [showCostCols, setShowCostCols] = useState(true);

  // Items
  const [items, setItems] = useState<Item[]>(
    (invoice.items || []).map((i: any) => ({
      id: i.id, name: i.name,
      quantity: Number(i.quantity), price: Number(i.price), costPrice: Number(i.costPrice) || 0, tax: Number(i.tax) || 0,
    }))
  );

  // Payment plan
  const [deposit,       setDeposit]       = useState<string>(String(invoice.deposit || ""));
  const [depositMethod, setDepositMethod] = useState<string>(invoice.depositMethod || "");
  const [useInstallments, setUseInstallments] = useState(
    Array.isArray(invoice.installments) && invoice.installments.length > 0
  );
  const [installments, setInstallments] = useState<Installment[]>(
    Array.isArray(invoice.installments) && invoice.installments.length > 0
      ? invoice.installments.map((i: any) => ({
          id: i.id,
          amount: String(i.amount),
          dueDate: i.dueDate ? i.dueDate.split("T")[0] : "",
          notes: i.notes || "",
          paymentMethod: i.paymentMethod || "",
          status: i.status || "PENDING",
        }))
      : []
  );

  const [dueDate, setDueDate] = useState(
    invoice.dueDate ? invoice.dueDate.split("T")[0] : ""
  );
  const [status, setStatus] = useState(invoice.status || "UNPAID");

  // ── Computed totals ──────────────────────────────────────────────────────
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxTotal  = items.reduce((s, i) => s + i.price * i.quantity * (i.tax / 100), 0);
  const grandTotal = subtotal + taxTotal;
  const depositAmt = parseFloat(deposit) || 0;
  const instTotal  = installments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const remaining  = grandTotal - depositAmt - instTotal;

  // ── Profit calculations (internal) ───────────────────────────────────────
  const itemCost = items.reduce((s, i) => s + i.price * 0 + i.costPrice * i.quantity, 0);
  const poCost = purchases.filter((p: any) => linkedPurchaseIds.includes(p.id)).reduce((s: number, p: any) => s + Number(p.total), 0);
  const totalMaterialCost = itemCost + poCost;
  const grossProfit = grandTotal - totalMaterialCost;
  const margin = grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0;

  useEffect(() => {
    fetch("/api/purchases?status=RECEIVED&limit=100").then((r) => r.json()).then((d) => setPurchases(d.purchases || []));
  }, []);

  const togglePurchase = (id: string) =>
    setLinkedPurchaseIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // ── Item helpers ─────────────────────────────────────────────────────────
  const addItem    = () => setItems([...items, { name: "", quantity: 1, price: 0, costPrice: 0, tax: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof Item, value: any) => {
    const next = [...items];
    (next[idx] as any)[field] = ["quantity","price","costPrice","tax"].includes(field) ? parseFloat(value)||0 : value;
    setItems(next);
  };

  // ── Installment helpers ──────────────────────────────────────────────────
  const addInstallment    = () => setInstallments([...installments, { amount:"", dueDate:"", notes:"", paymentMethod:"", status:"PENDING" }]);
  const removeInstallment = (idx: number) => setInstallments(installments.filter((_,i) => i !== idx));
  const updateInstallment = (idx: number, field: keyof Installment, value: string) => {
    const next = [...installments];
    next[idx][field] = value;
    setInstallments(next);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError("");
    if (items.length === 0) return setError("Add at least one item");
    if (useInstallments && Math.abs(remaining) > 0.01)
      return setError(`Amounts don't balance — difference: ${remaining.toFixed(2)} AED`);

    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          deposit: depositAmt,
          depositMethod,
          installments: useInstallments ? installments : [],
          status,
          dueDate,
          linkedPurchaseIds,
        }),
      });
      if (res.ok) {
        router.push(`/invoices/view/${invoice.id}`);
      } else {
        const d = await res.json();
        setError(d.message || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Edit Invoice</h1>
          <p className="text-gray-400 text-sm font-mono mt-0.5">#{invoice.id.slice(0,8).toUpperCase()}</p>
        </div>
        <div className="ml-auto flex gap-3">
          <button onClick={() => router.back()} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <FiSave size={15} /> {saving ? "Saving…" : "Save Invoice"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Meta */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Client</label>
              <div className="border border-gray-200 rounded-xl p-2.5 bg-gray-50 text-sm text-gray-700">
                {invoice.client?.name}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="UNPAID">UNPAID</option>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Line Items</h2>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500">
              <input type="checkbox" checked={showCostCols} onChange={(e) => setShowCostCols(e.target.checked)} className="accent-blue-600" />
              Show cost columns
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 font-semibold">
                  <th className="pb-2 text-left pr-3">Description</th>
                  <th className="pb-2 text-left pr-3 w-16">Qty</th>
                  <th className="pb-2 text-left pr-3 w-28">Sale Price</th>
                  {showCostCols && <th className="pb-2 text-left pr-3 w-28 text-orange-400">Cost Price (internal)</th>}
                  <th className="pb-2 text-left pr-3 w-16">Tax %</th>
                  <th className="pb-2 text-right w-28">Amount</th>
                  {showCostCols && <th className="pb-2 text-right w-20 text-green-500">Margin</th>}
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const amt = item.quantity * item.price * (1 + item.tax / 100);
                  const lineCost = item.quantity * item.costPrice;
                  const lineMargin = amt > 0 ? ((amt - lineCost) / amt) * 100 : 0;
                  return (
                    <tr key={idx} className="group">
                      <td className="pr-3 py-1.5">
                        <input type="text" value={item.name} onChange={(e) => updateItem(idx,"name",e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      </td>
                      <td className="pr-3 py-1.5">
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx,"quantity",e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      </td>
                      <td className="pr-3 py-1.5">
                        <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(idx,"price",e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      </td>
                      {showCostCols && (
                        <td className="pr-3 py-1.5">
                          <input type="number" min="0" step="0.01" value={item.costPrice} onChange={(e) => updateItem(idx,"costPrice",e.target.value)}
                            className="w-full border border-orange-200 bg-orange-50 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
                        </td>
                      )}
                      <td className="pr-3 py-1.5">
                        <input type="number" min="0" max="100" step="0.01" value={item.tax} onChange={(e) => updateItem(idx,"tax",e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      </td>
                      <td className="py-1.5 text-right font-medium text-gray-700">{amt.toFixed(2)} AED</td>
                      {showCostCols && (
                        <td className="py-1.5 text-right">
                          <span className={"text-xs font-semibold px-1.5 py-0.5 rounded-md " + (lineMargin >= 30 ? "bg-green-100 text-green-700" : lineMargin >= 10 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                            {lineMargin.toFixed(0)}%
                          </span>
                        </td>
                      )}
                      <td className="py-1.5 pl-2">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition">
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addItem}
            className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <FiPlus size={14} /> Add Item
          </button>

          <div className="flex justify-end mt-5 pt-4 border-t border-gray-100">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{subtotal.toFixed(2)} AED</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>{taxTotal.toFixed(2)} AED</span></div>
              <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2"><span>Total</span><span>{grandTotal.toFixed(2)} AED</span></div>
            </div>
          </div>
        </div>

        {/* Link Purchase Orders */}
        {purchases.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <FiLink size={15} className="text-blue-500" /> Link Purchase Orders
              <span className="text-xs font-normal text-gray-400">(internal — profit calculation only)</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4">Select the POs whose materials were used for this job. Never shown to the client.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {purchases.map((p: any) => {
                const linked = linkedPurchaseIds.includes(p.id);
                return (
                  <label key={p.id} className={"flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition " + (linked ? "border-blue-300 bg-blue-50" : "border-gray-100 hover:bg-gray-50")}>
                    <input type="checkbox" checked={linked} onChange={() => togglePurchase(p.id)} className="accent-blue-600 w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.supplier?.name}</p>
                      <p className="text-xs text-gray-400">{p.referenceNo || "No ref"} · {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{Number(p.total).toFixed(2)} AED</span>
                  </label>
                );
              })}
            </div>
            {linkedPurchaseIds.length > 0 && (
              <p className="text-xs text-blue-600 mt-3 font-medium">
                {linkedPurchaseIds.length} PO{linkedPurchaseIds.length > 1 ? "s" : ""} linked · Cost: {poCost.toFixed(2)} AED
              </p>
            )}
          </div>
        )}

        {/* Job Profitability Preview */}
        {totalMaterialCost > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FiTrendingUp size={15} className="text-green-500" /> Job Profitability
              <span className="text-xs font-normal bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Internal</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              {[
                { label: "Revenue", value: grandTotal.toFixed(2) + " AED", color: "text-gray-800" },
                { label: "Material Cost", value: totalMaterialCost.toFixed(2) + " AED", color: "text-orange-600" },
                { label: "Gross Profit", value: grossProfit.toFixed(2) + " AED", color: grossProfit >= 0 ? "text-green-600" : "text-red-600" },
                { label: "Margin", value: margin.toFixed(1) + "%", color: margin >= 30 ? "text-green-600" : margin >= 10 ? "text-yellow-600" : "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={"font-bold text-base " + color}>{value}</p>
                </div>
              ))}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={"h-full rounded-full " + (margin >= 30 ? "bg-green-500" : margin >= 10 ? "bg-yellow-400" : "bg-red-500")}
                style={{ width: Math.min(100, Math.max(0, margin)) + "%" }} />
            </div>
          </div>
        )}

        {/* Payment Plan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <FiCreditCard size={16} className="text-blue-600" /> Payment Plan
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Deposit and installment schedule</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setUseInstallments(v => !v)}
                className={`w-11 h-6 rounded-full transition-colors ${useInstallments ? "bg-blue-600" : "bg-gray-200"}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow m-0.5 transition-transform ${useInstallments ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm text-gray-600">Enable installments</span>
            </label>
          </div>

          {/* Deposit row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Deposit Amount (AED)</label>
              <input type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Deposit Payment Method</label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => setDepositMethod(m)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${
                      depositMethod === m
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Installments */}
          {useInstallments && (
            <>
              <div className="space-y-3 mb-3">
                {installments.map((inst, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${inst.status === "PAID" ? "bg-green-50 border-green-100" : "bg-blue-50 border-blue-100"}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${inst.status === "PAID" ? "bg-green-600" : "bg-blue-600"}`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">Installment {idx + 1}</span>
                      {inst.status === "PAID" && (
                        <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Paid</span>
                      )}
                      <button type="button" onClick={() => removeInstallment(idx)}
                        className="ml-auto text-gray-300 hover:text-red-500">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Amount (AED) *</label>
                        <input type="number" min="0" step="0.01" value={inst.amount}
                          onChange={(e) => updateInstallment(idx,"amount",e.target.value)}
                          disabled={inst.status === "PAID"}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white disabled:bg-gray-100" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Due Date *</label>
                        <input type="date" value={inst.dueDate}
                          onChange={(e) => updateInstallment(idx,"dueDate",e.target.value)}
                          disabled={inst.status === "PAID"}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white disabled:bg-gray-100" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Payment Method</label>
                        <select value={inst.paymentMethod}
                          onChange={(e) => updateInstallment(idx,"paymentMethod",e.target.value)}
                          disabled={inst.status === "PAID"}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white disabled:bg-gray-100">
                          <option value="">Select…</option>
                          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Notes</label>
                        <input type="text" value={inst.notes}
                          onChange={(e) => updateInstallment(idx,"notes",e.target.value)}
                          placeholder="e.g. After delivery"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addInstallment}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium mb-4">
                <FiPlus size={14} /> Add Installment
              </button>

              {/* Balance checker */}
              <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                <div className="grid grid-cols-4 gap-3 text-sm text-center">
                  {[
                    { label: "Invoice Total", val: `${grandTotal.toFixed(2)} AED`, color: "text-gray-800" },
                    { label: "Deposit",       val: `− ${depositAmt.toFixed(2)} AED`, color: "text-green-600" },
                    { label: "Installments",  val: `− ${instTotal.toFixed(2)} AED`,  color: "text-blue-600" },
                    {
                      label: "Remaining",
                      val: `${remaining.toFixed(2)} AED${Math.abs(remaining) < 0.01 ? " ✓" : ""}`,
                      color: Math.abs(remaining) < 0.01 ? "text-green-600" : "text-red-600",
                    },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className={`font-bold ${color}`}>{val}</p>
                    </div>
                  ))}
                </div>
                {Math.abs(remaining) > 0.01 && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    ⚠️ Installment amounts must equal the invoice total minus the deposit
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }: any) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      items: true,
      installments: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!invoice) return { notFound: true };
  const raw = JSON.parse(JSON.stringify(invoice));
  return {
    props: {
      invoice: {
        ...raw,
        materialCost: Number(raw.materialCost) || 0,
        linkedPurchaseIds: (raw.linkedPurchaseIds || "").split(",").filter(Boolean),
      },
    },
  };
}
