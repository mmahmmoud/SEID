import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FiPlus, FiTrash2, FiCalendar, FiDollarSign, FiLink, FiTrendingUp } from "react-icons/fi";

type Item = { description: string; quantity: number; unitPrice: number; costPrice: number; tax: number };
type Installment = { amount: string; dueDate: string; notes: string };

const emptyItem = (): Item => ({ description: "", quantity: 1, unitPrice: 0, costPrice: 0, tax: 0 });
const emptyInstallment = (): Installment => ({ amount: "", dueDate: "", notes: "" });

export default function CreateInvoice() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [invoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [deposit, setDeposit] = useState<string>("");
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [useInstallments, setUseInstallments] = useState(false);
  const [linkedPurchaseIds, setLinkedPurchaseIds] = useState<string[]>([]);
  const [showCostCols, setShowCostCols] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : []));
    fetch("/api/purchases?status=RECEIVED&limit=100").then((r) => r.json()).then((d) => setPurchases(d.purchases || []));
  }, []);

  const updateItem = (idx: number, field: keyof Item, value: any) => {
    const next = [...items];
    (next[idx] as any)[field] = field === "description" ? value : parseFloat(value) || 0;
    setItems(next);
  };
  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const addInstallment = () => setInstallments([...installments, emptyInstallment()]);
  const removeInstallment = (idx: number) => setInstallments(installments.filter((_, i) => i !== idx));
  const updateInstallment = (idx: number, field: keyof Installment, value: string) => {
    const next = [...installments];
    next[idx][field] = value;
    setInstallments(next);
  };

  const togglePurchase = (id: string) =>
    setLinkedPurchaseIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalTax = items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.tax / 100), 0);
  const grandTotal = subtotal + totalTax;
  const depositAmt = parseFloat(deposit) || 0;
  const installmentsTotal = installments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const remaining = grandTotal - depositAmt - installmentsTotal;

  const itemCost = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const poCost = purchases.filter((p) => linkedPurchaseIds.includes(p.id)).reduce((s, p) => s + Number(p.total), 0);
  const totalMaterialCost = itemCost + poCost;
  const grossProfit = grandTotal - totalMaterialCost;
  const margin = grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedClient) return alert("Please select a client");
    if (useInstallments && installments.length === 0) return alert("Add at least one installment or disable the installment plan");
    if (useInstallments && Math.abs(remaining) > 0.01)
      return alert("Installment amounts do not match. Difference: " + remaining.toFixed(2) + " AED");
    setSubmitting(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selectedClient, invoiceDate, dueDate, items, deposit: depositAmt, installments: useInstallments ? installments : [], linkedPurchaseIds }),
    });
    setSubmitting(false);
    if (res.ok) router.push("/invoices");
    else { const d = await res.json(); alert(d.message || "Failed to create invoice"); }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-xl md:text-3xl font-bold mb-6">Create Invoice</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Client *</label>
              <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="border border-gray-200 p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" required>
                <option value="">Select Client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? " (" + c.email + ")" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Invoice Date</label>
              <input type="date" value={invoiceDate} readOnly className="border border-gray-200 p-2.5 rounded-xl w-full text-sm bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border border-gray-200 p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
        </div>

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
                <tr className="text-gray-400 text-xs uppercase">
                  <th className="pb-2 text-left pr-3 font-semibold">Item</th>
                  <th className="pb-2 text-left pr-3 font-semibold w-16">Qty</th>
                  <th className="pb-2 text-left pr-3 font-semibold w-28">Sale Price</th>
                  {showCostCols && <th className="pb-2 text-left pr-3 font-semibold w-28 text-orange-400">Cost Price (internal)</th>}
                  <th className="pb-2 text-left pr-3 font-semibold w-16">Tax %</th>
                  <th className="pb-2 text-right font-semibold w-28">Amount</th>
                  {showCostCols && <th className="pb-2 text-right font-semibold w-20 text-green-500">Margin</th>}
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const amount = item.quantity * item.unitPrice * (1 + item.tax / 100);
                  const lineCost = item.quantity * item.costPrice;
                  const lineProfit = amount - lineCost;
                  const lineMargin = amount > 0 ? (lineProfit / amount) * 100 : 0;
                  return (
                    <tr key={idx} className="group">
                      <td className="pr-3 py-1.5"><input type="text" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Item description…" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" /></td>
                      <td className="pr-3 py-1.5"><input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" /></td>
                      <td className="pr-3 py-1.5"><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" /></td>
                      {showCostCols && <td className="pr-3 py-1.5"><input type="number" min="0" step="0.01" value={item.costPrice} onChange={(e) => updateItem(idx, "costPrice", e.target.value)} className="w-full border border-orange-200 bg-orange-50 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" /></td>}
                      <td className="pr-3 py-1.5"><input type="number" min="0" max="100" step="0.01" value={item.tax} onChange={(e) => updateItem(idx, "tax", e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" /></td>
                      <td className="py-1.5 text-right font-medium text-gray-700">{amount.toFixed(2)} AED</td>
                      {showCostCols && <td className="py-1.5 text-right"><span className={"text-xs font-semibold px-1.5 py-0.5 rounded-md " + (lineMargin >= 30 ? "bg-green-100 text-green-700" : lineMargin >= 10 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>{lineMargin.toFixed(0)}%</span></td>}
                      <td className="py-1.5 pl-2">{items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><FiTrash2 size={14} /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addItem} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"><FiPlus size={14} /> Add Item</button>
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <div className="w-72 text-sm space-y-1">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{subtotal.toFixed(2)} AED</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>{totalTax.toFixed(2)} AED</span></div>
              <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2"><span>Total</span><span>{grandTotal.toFixed(2)} AED</span></div>
            </div>
          </div>
        </div>

        {purchases.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-1 flex items-center gap-2"><FiLink size={15} className="text-blue-500" /> Link Purchase Orders <span className="text-xs font-normal text-gray-400">(internal — profit calculation only)</span></h2>
            <p className="text-xs text-gray-400 mb-4">Select the POs whose materials were used for this job. Their cost is included in your profit calculation but never shown to the client.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {purchases.map((p) => {
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
            {linkedPurchaseIds.length > 0 && <p className="text-xs text-blue-600 mt-3 font-medium">{linkedPurchaseIds.length} PO{linkedPurchaseIds.length > 1 ? "s" : ""} linked · Total cost: {poCost.toFixed(2)} AED</p>}
          </div>
        )}

        {totalMaterialCost > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><FiTrendingUp size={15} className="text-green-500" /> Job Profitability Preview <span className="text-xs font-normal text-gray-400">(internal)</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="font-semibold text-gray-700">Payment Plan</h2><p className="text-xs text-gray-400 mt-0.5">Set a deposit and schedule installment payments</p></div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setUseInstallments((v) => !v)} className={"w-11 h-6 rounded-full transition-colors " + (useInstallments ? "bg-blue-600" : "bg-gray-200")}>
                <div className={"w-5 h-5 bg-white rounded-full shadow m-0.5 transition-transform " + (useInstallments ? "translate-x-5" : "")} />
              </div>
              <span className="text-sm text-gray-600">Enable installments</span>
            </label>
          </div>
          <div className="mb-5">
            <label className="text-sm font-medium text-gray-700 block mb-1">Deposit / First Payment (AED)</label>
            <div className="relative w-56">
              <FiDollarSign className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0.00" className="pl-9 border border-gray-200 rounded-xl p-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
          {useInstallments && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><FiCalendar size={14} /> Installment Schedule</h3>
              <div className="space-y-3">
                {installments.map((inst, idx) => (
                  <div key={idx} className="flex gap-3 items-center bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <span className="w-7 h-7 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div><label className="text-xs text-gray-500 block mb-1">Amount (AED) *</label><input type="number" min="0" step="0.01" value={inst.amount} onChange={(e) => updateInstallment(idx, "amount", e.target.value)} required={useInstallments} placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" /></div>
                      <div><label className="text-xs text-gray-500 block mb-1">Due Date *</label><input type="date" value={inst.dueDate} onChange={(e) => updateInstallment(idx, "dueDate", e.target.value)} required={useInstallments} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" /></div>
                      <div><label className="text-xs text-gray-500 block mb-1">Notes</label><input type="text" value={inst.notes} onChange={(e) => updateInstallment(idx, "notes", e.target.value)} placeholder="e.g. After delivery" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" /></div>
                    </div>
                    <button type="button" onClick={() => removeInstallment(idx)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><FiTrash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addInstallment} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"><FiPlus size={14} /> Add Installment</button>
              <div className="mt-4 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                <div className="grid grid-cols-4 gap-3 text-sm text-center">
                  {[
                    { label: "Invoice Total", val: grandTotal.toFixed(2) + " AED", color: "text-gray-800" },
                    { label: "Deposit", val: "- " + depositAmt.toFixed(2) + " AED", color: "text-green-600" },
                    { label: "Installments", val: "- " + installmentsTotal.toFixed(2) + " AED", color: "text-blue-600" },
                    { label: "Remaining", val: remaining.toFixed(2) + " AED" + (Math.abs(remaining) < 0.01 ? " ✓" : ""), color: Math.abs(remaining) < 0.01 ? "text-green-600" : "text-red-600" },
                  ].map(({ label, val, color }) => (
                    <div key={label}><p className="text-xs text-gray-400 mb-1">{label}</p><p className={"font-bold " + color}>{val}</p></div>
                  ))}
                </div>
                {Math.abs(remaining) > 0.01 && <p className="text-xs text-red-500 text-center mt-2">Installment amounts must equal the invoice total minus deposit</p>}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.push("/invoices")} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-60">{submitting ? "Creating…" : "Create Invoice"}</button>
        </div>
      </form>
    </div>
  );
}
