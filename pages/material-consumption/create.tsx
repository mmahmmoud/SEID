import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FiPlus, FiTrash2, FiAlertTriangle, FiArrowLeft, FiCheckCircle,
} from "react-icons/fi";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stockQuantity: number;
  costPrice: number;
}

interface Client {
  id: string;
  name: string;
}

interface ConsumptionItem {
  productId: string;
  quantity: string;
}

export default function CreateMaterialConsumption() {
  const router  = useRouter();
  const { data: session } = useSession();

  // Form state
  const [referenceType, setReferenceType] = useState<"PROJECT" | "WORKSHOP">("PROJECT");
  const [referenceId, setReferenceId]     = useState("");
  const [notes, setNotes]                 = useState("");
  const [date, setDate]                   = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems]                 = useState<ConsumptionItem[]>([{ productId: "", quantity: "" }]);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([prods, cls]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setClients(Array.isArray(cls) ? cls : []);
    }).finally(() => setLoading(false));
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Item helpers ──────────────────────────────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, { productId: "", quantity: "" }]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof ConsumptionItem, value: string) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const getProduct = (id: string) => products.find((p) => p.id === id);

  const hasStockError = (item: ConsumptionItem) => {
    const p = getProduct(item.productId);
    if (!p || !item.quantity) return false;
    return Number(item.quantity) > p.stockQuantity;
  };

  const totalCost = items.reduce((sum, item) => {
    const p = getProduct(item.productId);
    if (!p || !item.quantity) return sum;
    return sum + p.costPrice * Number(item.quantity);
  }, 0);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (referenceType === "PROJECT" && !referenceId) {
      showToast("error", "Please select a project/client.");
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity);
    if (validItems.length === 0) {
      showToast("error", "Add at least one product with a quantity.");
      return;
    }

    for (const item of validItems) {
      if (hasStockError(item)) {
        const p = getProduct(item.productId)!;
        showToast("error", `Quantity for "${p.name}" exceeds available stock (${p.stockQuantity} ${p.unit}).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const createdBy = (session?.user as any)?.name || "Unknown";
      const res = await fetch("/api/material-consumption", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceType,
          referenceId: referenceType === "PROJECT" ? referenceId : undefined,
          notes,
          date,
          createdBy,
          items: validItems.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        showToast("error", d.message || "Something went wrong.");
        return;
      }

      showToast("success", "Materials consumed and stock updated successfully!");
      setTimeout(() => router.push("/material-consumption"), 1500);
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <FiCheckCircle size={18} /> : <FiAlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/material-consumption"
          className="text-gray-400 hover:text-gray-700 transition"
        >
          <FiArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Record Material Consumption</h1>
          <p className="text-gray-500 mt-1">Log materials used at a project site or workshop</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* ── General Info Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-700">General Information</h2>

          {/* Reference Type */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">Consumption Type *</label>
            <div className="flex gap-3">
              {(["PROJECT", "WORKSHOP"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setReferenceType(type); setReferenceId(""); }}
                  className={`px-5 py-2 rounded-xl border text-sm font-medium transition ${
                    referenceType === type
                      ? type === "PROJECT"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-purple-600 text-white border-purple-600"
                      : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                  }`}
                >
                  {type === "PROJECT" ? "🏗 Project Site" : "🔧 Workshop"}
                </button>
              ))}
            </div>
          </div>

          {/* Project selector — only shown for PROJECT */}
          {referenceType === "PROJECT" && (
            <div>
              <label className="text-sm text-gray-600 block mb-1">Client / Project *</label>
              <select
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                required
              >
                <option value="">Select client / project</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Date *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Recorded By</label>
              <input
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                value={(session?.user as any)?.name || ""}
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Materials used for master bedroom ceiling – Al Barsha Villa"
              rows={3}
            />
          </div>
        </div>

        {/* ── Products / Items Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-700">Materials Used</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <FiPlus size={16} /> Add Product
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 mb-2 px-1">
            <div className="col-span-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">In Stock</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty to Use</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Est. Cost</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const product = getProduct(item.productId);
              const stockErr = hasStockError(item);
              const estCost = product && item.quantity
                ? product.costPrice * Number(item.quantity)
                : null;

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-12 gap-3 items-center p-3 rounded-xl border transition ${
                    stockErr
                      ? "border-red-200 bg-red-50"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  {/* Product select */}
                  <div className="col-span-5">
                    <select
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                      value={item.productId}
                      onChange={(e) => updateItem(idx, "productId", e.target.value)}
                      required
                    >
                      <option value="">Select product</option>
                      {products
                        .filter((p) => p.stockQuantity > 0 || p.id === item.productId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Stock badge */}
                  <div className="col-span-2">
                    {product ? (
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-lg font-medium ${
                          product.stockQuantity <= 0
                            ? "bg-red-100 text-red-700"
                            : product.stockQuantity <= 5
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {product.stockQuantity} {product.unit}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </div>

                  {/* Quantity input */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={product?.stockQuantity}
                      placeholder="0"
                      className={`w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 ${
                        stockErr
                          ? "border-red-300 focus:ring-red-200"
                          : "border-gray-200 focus:ring-blue-200"
                      }`}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      required
                    />
                  </div>

                  {/* Estimated cost */}
                  <div className="col-span-2 text-sm text-gray-600">
                    {estCost !== null ? (
                      <span>{estCost.toFixed(2)} AED</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-20 transition"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>

                  {/* Stock error message */}
                  {stockErr && (
                    <div className="col-span-12 flex items-center gap-1.5 text-xs text-red-600 -mt-1">
                      <FiAlertTriangle size={12} />
                      Quantity exceeds available stock ({product?.stockQuantity} {product?.unit})
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals row */}
          {totalCost > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <div className="text-right">
                <p className="text-xs text-gray-500">Estimated Total Cost</p>
                <p className="text-xl font-bold text-gray-800">{totalCost.toFixed(2)} AED</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-200 px-6 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-8 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-60 ${
              referenceType === "PROJECT"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {submitting ? "Recording..." : "Record Consumption"}
          </button>
        </div>
      </form>
    </div>
  );
}
