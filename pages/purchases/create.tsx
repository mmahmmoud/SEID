import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FiPlus, FiTrash2 } from "react-icons/fi";

type Item = { productId: string; name: string; quantity: number; costPrice: number; tax: number; total: number };

export default function CreatePurchase() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [taxRate, setTaxRate] = useState(5);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryFeePaid, setDeliveryFeePaid] = useState(false);
  const [items, setItems] = useState<Item[]>([{ productId: "", name: "", quantity: 1, costPrice: 0, tax: 0, total: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
    fetch("/api/products").then((r) => r.json()).then(setProducts);
  }, []);

  const updateItem = (idx: number, field: string, value: any) => {
    const next = [...items];
    if (field === "productId") {
      const prod = products.find((p) => p.id === value);
      next[idx] = { ...next[idx], productId: value, name: prod?.name || "", costPrice: prod?.costPrice || 0 };
    } else {
      (next[idx] as any)[field] = field === "name" ? value : parseFloat(value) || 0;
    }
    next[idx].total = next[idx].quantity * next[idx].costPrice * (1 + next[idx].tax / 100);
    setItems(next);
  };

  const addItem = () => setItems([...items, { productId: "", name: "", quantity: 1, costPrice: 0, tax: 0, total: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subTotal = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const taxAmount = subTotal * (taxRate / 100);
  const deliveryFeeAmount = deliveryFeePaid ? deliveryFee : 0;
  const total = subTotal + taxAmount + deliveryFeeAmount;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!supplierId) return alert("Please select a supplier");
    if (items.some((i) => !i.productId)) return alert("All items must have a product selected");
    setSubmitting(true);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId, referenceNo, notes, status, tax: taxAmount, deliveryFee: deliveryFeeAmount, items }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.message); setSubmitting(false); return; }
    router.push("/purchases");
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">New Purchase Order</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Purchase Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm text-gray-600">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Reference No</label>
              <input
                className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="PO-001"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="PENDING">Pending</option>
                <option value="RECEIVED">Mark as Received</option>
              </select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Notes</label>
              <input
                className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          {/* Delivery Fee */}
          <div className="mt-4 border border-gray-100 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="deliveryFeePaid"
                checked={deliveryFeePaid}
                onChange={(e) => setDeliveryFeePaid(e.target.checked)}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="deliveryFeePaid" className="text-sm font-medium text-gray-700 cursor-pointer">
                I paid a delivery fee for this purchase
              </label>
            </div>
            {deliveryFeePaid && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 whitespace-nowrap">Delivery Fee (AED)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-40 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Items</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <FiPlus size={14} /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs uppercase">
                <tr>
                  {["Product", "Description", "Qty", "Cost Price (AED)", "Tax %", "Total (AED)", ""].map((h) => (
                    <th key={h} className="pb-2 text-left pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="space-y-2">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="pr-3 py-1">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(idx, "productId", e.target.value)}
                        className="border border-gray-200 rounded-lg p-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">Select</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </td>
                    <td className="pr-3 py-1">
                      <input
                        className="border border-gray-200 rounded-lg p-1.5 text-sm w-full focus:outline-none"
                        value={item.name}
                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                        placeholder="Description"
                      />
                    </td>
                    <td className="pr-3 py-1 w-20">
                      <input type="number" min="0" step="0.01" className="border border-gray-200 rounded-lg p-1.5 text-sm w-full focus:outline-none" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                    </td>
                    <td className="pr-3 py-1 w-32">
                      <input type="number" min="0" step="0.01" className="border border-gray-200 rounded-lg p-1.5 text-sm w-full focus:outline-none" value={item.costPrice} onChange={(e) => updateItem(idx, "costPrice", e.target.value)} />
                    </td>
                    <td className="pr-3 py-1 w-20">
                      <input type="number" min="0" max="100" step="0.01" className="border border-gray-200 rounded-lg p-1.5 text-sm w-full focus:outline-none" value={item.tax} onChange={(e) => updateItem(idx, "tax", e.target.value)} />
                    </td>
                    <td className="pr-3 py-1 w-28 text-gray-700 font-medium">{item.total.toFixed(2)}</td>
                    <td className="py-1">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500">
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Sub Total</span><span>{subTotal.toFixed(2)} AED</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax ({taxRate}%)</span><span>{taxAmount.toFixed(2)} AED</span></div>
              {deliveryFeePaid && deliveryFeeAmount > 0 && (
                <div className="flex justify-between text-gray-600"><span>Delivery Fee</span><span>{deliveryFeeAmount.toFixed(2)} AED</span></div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2">
                <span>Total</span><span>{total.toFixed(2)} AED</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6 gap-3">
            <button type="button" onClick={() => router.back()} className="border border-gray-200 px-6 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Purchase"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
