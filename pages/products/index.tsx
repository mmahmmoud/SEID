import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiAlertTriangle, FiSearch, FiBox, FiPackage, FiTrash2 } from "react-icons/fi";

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  sellingPrice: number;
  costPrice: number;
  stockQuantity: number;
  lowStockAlert: number;
  unit: string;
  isActive: boolean;
  isLowStock: boolean;
}

const emptyForm = {
  name: "", sku: "", description: "", sellingPrice: "", costPrice: "",
  stockQuantity: "", lowStockAlert: "10", unit: "pcs",
};

export default function ProductsPage() {
  const [products, setProducts]           = useState<Product[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");

  // Create / edit modal
  const [showModal, setShowModal]         = useState(false);
  const [editId, setEditId]               = useState<string | null>(null);
  const [form, setForm]                   = useState({ ...emptyForm });
  const [saving, setSaving]               = useState(false);

  // Stock adjust modal
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty]         = useState("");
  const [adjustNotes, setAdjustNotes]     = useState("");
  const [adjusting, setAdjusting]         = useState(false);

  // Delete confirm modal
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    fetch(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ""}`)
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [search]);

  // ── Create / Edit ──────────────────────────────────────────────────────────
  const openCreate = () => { setForm({ ...emptyForm }); setEditId(null); setShowModal(true); };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, sku: p.sku, description: p.description || "",
      sellingPrice: String(p.sellingPrice), costPrice: String(p.costPrice),
      stockQuantity: String(p.stockQuantity), lowStockAlert: String(p.lowStockAlert),
      unit: p.unit,
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = editId ? "PUT" : "POST";
    const url    = editId ? `/api/products/${editId}` : "/api/products";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); alert(d.message); return; }
    setShowModal(false);
    fetchProducts();
  };

  // ── Stock Adjust ───────────────────────────────────────────────────────────
  const openAdjust = (p: Product) => {
    setAdjustProduct(p);
    setAdjustQty("");
    setAdjustNotes("");
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty === 0) { alert("Enter a non-zero quantity."); return; }
    if (adjustProduct.stockQuantity + qty < 0) {
      alert(`Cannot go below 0. Current: ${adjustProduct.stockQuantity}, adjustment: ${qty}`);
      return;
    }
    setAdjusting(true);
    const res = await fetch(`/api/products/${adjustProduct.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty, notes: adjustNotes || "Manual stock adjustment" }),
    });
    setAdjusting(false);
    if (!res.ok) { const d = await res.json(); alert(d.message); return; }
    setAdjustProduct(null);
    fetchProducts();
  };

  const newStockPreview =
    adjustProduct && adjustQty !== ""
      ? adjustProduct.stockQuantity + Number(adjustQty)
      : null;

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleting(true);
    const res = await fetch(`/api/products/${deleteProduct.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const d = await res.json();
      alert(d.message || "Failed to delete product.");
      setDeleteProduct(null);
      return;
    }

    const result = await res.json();
    setDeleteProduct(null);

    if (result.deactivated) {
      alert(
        "This product has purchase or invoice history, so it was deactivated instead of permanently deleted.\n\nIt will no longer appear in product lists but its history is preserved."
      );
    }
    fetchProducts();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-500 mt-1">Inventory items & stock levels</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition text-sm font-medium"
        >
          <FiPlus /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-3 text-gray-400" size={15} />
        <input
          className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl w-full md:w-80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {["SKU", "Product", "Stock", "Cost Price", "Selling Price", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-400">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={p.isLowStock ? "text-red-600 font-bold" : "text-gray-700"}>
                        {p.stockQuantity} {p.unit}
                      </span>
                      {p.isLowStock && <FiAlertTriangle size={14} className="text-red-400" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{Number(p.costPrice).toFixed(2)} AED</td>
                  <td className="px-4 py-3 text-gray-600">{Number(p.sellingPrice).toFixed(2)} AED</td>
                  <td className="px-4 py-3">
                    {p.isLowStock
                      ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Low Stock</span>
                      : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">In Stock</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Edit details */}
                      <button
                        onClick={() => openEdit(p)}
                        className="text-gray-400 hover:text-blue-600 transition"
                        title="Edit product details"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      {/* Adjust stock */}
                      <button
                        onClick={() => openAdjust(p)}
                        className="text-gray-400 hover:text-green-600 transition"
                        title="Adjust stock quantity"
                      >
                        <FiPackage size={15} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setDeleteProduct(p)}
                        className="text-gray-400 hover:text-red-500 transition"
                        title="Delete product"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <FiBox size={32} className="mx-auto mb-2 opacity-30" />
                  No products found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editId ? "Edit Product" : "New Product"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm text-gray-600">Name *</label>
                  <input className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm text-gray-600">SKU *</label>
                  <input className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Unit</label>
                  <input className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Selling Price (AED)</label>
                  <input type="number" min="0" step="0.01"
                    className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Cost Price (AED)</label>
                  <input type="number" min="0" step="0.01"
                    className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                </div>

                {/* Opening stock — only on create */}
                {!editId && (
                  <div>
                    <label className="text-sm text-gray-600">Opening Stock</label>
                    <input type="number" min="0" step="0.01"
                      className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-600">Low Stock Alert</label>
                  <input type="number" min="0" step="0.01"
                    className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.lowStockAlert} onChange={(e) => setForm({ ...form, lowStockAlert: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-600">Description</label>
                  <input className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              {editId && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  💡 To change the stock quantity, close this and click the <strong>box icon</strong> next to the product.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-60">
                  {saving ? "Saving..." : editId ? "Update Product" : "Create Product"}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Stock Adjust Modal ── */}
      {adjustProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-1">Adjust Stock</h2>
            <p className="text-sm text-gray-500 mb-5">
              {adjustProduct.name} &mdash; current stock:{" "}
              <span className="font-semibold text-gray-800">
                {adjustProduct.stockQuantity} {adjustProduct.unit}
              </span>
            </p>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  Quantity change *
                  <span className="ml-1 text-gray-400 font-normal">(use negative to reduce, e.g. -5)</span>
                </label>
                <input
                  type="number" step="0.01" placeholder="e.g. 10 or -3" autoFocus
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  required
                />
                {adjustQty !== "" && newStockPreview !== null && (
                  <div className={`mt-2 text-sm px-3 py-2 rounded-lg font-medium ${
                    newStockPreview < 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                  }`}>
                    {newStockPreview < 0
                      ? "⚠️ Cannot go below 0"
                      : `New stock will be: ${newStockPreview} ${adjustProduct.unit}`}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Reason / Notes</label>
                <input
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Stock count correction, damaged goods..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit"
                  disabled={adjusting || (newStockPreview !== null && newStockPreview < 0)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 text-sm font-medium disabled:opacity-50">
                  {adjusting ? "Saving..." : "Apply Adjustment"}
                </button>
                <button type="button" onClick={() => setAdjustProduct(null)}
                  className="flex-1 border border-gray-200 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiTrash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete Product?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  You are about to delete{" "}
                  <span className="font-semibold text-gray-800">{deleteProduct.name}</span>{" "}
                  <span className="font-mono text-xs text-gray-400">({deleteProduct.sku})</span>.
                </p>
                <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
                  <p>• If this product has <strong>no history</strong> (no purchases, invoices, or stock movements), it will be <span className="text-red-600 font-medium">permanently deleted</span>.</p>
                  <p>• If it has history, it will be <span className="text-yellow-600 font-medium">deactivated</span> instead to protect your records.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl hover:bg-red-700 text-sm font-medium disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setDeleteProduct(null)}
                className="flex-1 border border-gray-200 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}