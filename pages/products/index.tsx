import { useState, useEffect } from "react";
import Link from "next/link";
import { FiPlus, FiEdit2, FiAlertTriangle, FiSearch, FiBox } from "react-icons/fi";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", sku: "", description: "", sellingPrice: "", costPrice: "",
    stockQuantity: "", lowStockAlert: "10", unit: "pcs",
  });

  const fetchProducts = () => {
    fetch(`/api/products${search ? `?search=${search}` : ""}`)
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [search]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/products/${editId}` : "/api/products";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); alert(d.message); return; }
    setShowModal(false);
    setEditId(null);
    resetForm();
    fetchProducts();
  };

  const resetForm = () => setForm({ name: "", sku: "", description: "", sellingPrice: "", costPrice: "", stockQuantity: "", lowStockAlert: "10", unit: "pcs" });

  const handleEdit = (p: any) => {
    setForm({ name: p.name, sku: p.sku, description: p.description || "", sellingPrice: p.sellingPrice, costPrice: p.costPrice, stockQuantity: p.stockQuantity, lowStockAlert: p.lowStockAlert, unit: p.unit });
    setEditId(p.id);
    setShowModal(true);
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Products</h1>
          <p className="text-gray-500 mt-1">Inventory items &amp; stock levels</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setEditId(null); resetForm(); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        >
          <FiPlus /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl w-full md:w-80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {["SKU", "Product", "Stock", "Cost Price", "Selling Price", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
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
                    {p.isLowStock ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Low Stock</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">In Stock</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-blue-600"><FiEdit2 size={15} /></button>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editId ? "Edit Product" : "New Product"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Name *", key: "name", required: true, col: 2 },
                  { label: "SKU *", key: "sku", required: true, col: 1 },
                  { label: "Unit", key: "unit", col: 1 },
                  { label: "Selling Price (AED)", key: "sellingPrice", type: "number", col: 1 },
                  { label: "Cost Price (AED)", key: "costPrice", type: "number", col: 1 },
                  { label: "Stock Quantity", key: "stockQuantity", type: "number", col: 1, disabled: !!editId },
                  { label: "Low Stock Alert", key: "lowStockAlert", type: "number", col: 1 },
                  { label: "Description", key: "description", col: 2 },
                ].map(({ label, key, required, col, type, disabled }) => (
                  <div key={key} className={col === 2 ? "col-span-2" : ""}>
                    <label className="text-sm text-gray-600">{label}</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50"
                      type={type || "text"}
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required={required}
                      disabled={disabled}
                      min={type === "number" ? "0" : undefined}
                      step={type === "number" ? "0.01" : undefined}
                    />
                  </div>
                ))}
              </div>
              {editId && <p className="text-xs text-gray-400">* Use Inventory Log to adjust stock quantities</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
                  {editId ? "Update" : "Create"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
