import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const CATEGORIES = ["Rent", "Utilities", "Salaries", "Marketing", "Office Supplies", "Travel", "Software", "Maintenance", "Other"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Credit Card", "Cheque", "Other"];

export default function EditExpense() {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState({
    title: "",
    category: "",
    amount: "",
    date: "",
    paymentMethod: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setForm({
          title: d.title || "",
          category: d.category || "",
          amount: String(d.amount || ""),
          date: d.date ? new Date(d.date).toISOString().split("T")[0] : "",
          paymentMethod: d.paymentMethod || "",
          notes: d.notes || "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.amount) return alert("Please fill required fields");
    setSubmitting(true);
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); alert(d.message); setSubmitting(false); return; }
    router.push("/expenses");
  };

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Edit Expense</h1>
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5 max-w-2xl">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Title *</label>
            <input
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Office Rent - April"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Category *</label>
              <select
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                required
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Amount (AED) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Date *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Payment Method</label>
              <select
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.paymentMethod}
                onChange={(e) => set("paymentMethod", e.target.value)}
              >
                <option value="">Select Method</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Update Expense"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
