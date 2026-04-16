import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiPlus, FiEdit2, FiTrash2, FiTruck } from "react-icons/fi";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", taxNumber: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const fetchSuppliers = () => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then(setSuppliers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/suppliers/${editId}` : "/api/suppliers";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setEditId(null);
    setForm({ name: "", email: "", phone: "", address: "", taxNumber: "" });
    fetchSuppliers();
  };

  const handleEdit = (s: any) => {
    setForm({ name: s.name, email: s.email || "", phone: s.phone || "", address: s.address || "", taxNumber: s.taxNumber || "" });
    setEditId(s.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    fetchSuppliers();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-gray-500 mt-1">Manage your purchase suppliers</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setEditId(null); setForm({ name: "", email: "", phone: "", address: "", taxNumber: "" }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        >
          <FiPlus /> Add Supplier
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s: any) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <FiTruck size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.name}</h3>
                    {s.taxNumber && <p className="text-xs text-gray-400">TRN: {s.taxNumber}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(s)} className="p-1 text-gray-400 hover:text-blue-600"><FiEdit2 size={15} /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1 text-gray-400 hover:text-red-500"><FiTrash2 size={15} /></button>
                </div>
              </div>
              {s.email && <p className="text-sm text-gray-500 mt-3">✉️ {s.email}</p>}
              {s.phone && <p className="text-sm text-gray-500">📞 {s.phone}</p>}
              {s.address && <p className="text-sm text-gray-500">📍 {s.address}</p>}
              <div className="mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">{s._count?.purchases || 0} purchases</span>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <FiTruck size={40} className="mx-auto mb-3 opacity-30" />
              <p>No suppliers yet. Add your first supplier.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editId ? "Edit Supplier" : "New Supplier"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: "Name *", key: "name", required: true },
                { label: "Email", key: "email" },
                { label: "Phone", key: "phone" },
                { label: "Address", key: "address" },
                { label: "Tax / TRN Number", key: "taxNumber" },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="text-sm text-gray-600">{label}</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required={required}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition text-sm font-medium">
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
