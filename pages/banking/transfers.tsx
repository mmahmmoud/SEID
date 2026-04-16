import { useState, useEffect } from "react";
import { FiPlus, FiArrowRight, FiArrowDownLeft, FiArrowUpRight, FiRefreshCw } from "react-icons/fi";

function fmt(n: number) { return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
  incoming: { label: "Incoming", color: "bg-green-100 text-green-700", icon: <FiArrowDownLeft size={12} /> },
  outgoing: { label: "Outgoing", color: "bg-red-100 text-red-700", icon: <FiArrowUpRight size={12} /> },
  internal: { label: "Internal", color: "bg-blue-100 text-blue-700", icon: <FiRefreshCw size={12} /> },
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "incoming", amount: "", date: new Date().toISOString().split("T")[0], description: "", fromBankAccountId: "", toBankAccountId: "" });

  const load = () => {
    Promise.all([
      fetch("/api/banking/transfers").then((r) => r.json()),
      fetch("/api/banking/accounts").then((r) => r.json()),
    ]).then(([t, a]) => {
      setTransfers(Array.isArray(t) ? t : []);
      setAccounts(Array.isArray(a) ? a : []);
    });
  };
  useEffect(load, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.amount || !form.date) return alert("Amount and date are required");
    if (form.type === "internal" && (!form.fromBankAccountId || !form.toBankAccountId)) return alert("Select both accounts for internal transfer");
    if (form.type === "incoming" && !form.toBankAccountId) return alert("Select destination account");
    if (form.type === "outgoing" && !form.fromBankAccountId) return alert("Select source account");

    setSaving(true);
    const res = await fetch("/api/banking/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setShowForm(false); load(); setForm({ type: "incoming", amount: "", date: new Date().toISOString().split("T")[0], description: "", fromBankAccountId: "", toBankAccountId: "" }); }
    else { const d = await res.json(); alert(d.message); }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Transfers</h1>
          <p className="text-gray-500 mt-1">{transfers.length} total transfers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
          <FiPlus size={14} /> New Transfer
        </button>
      </div>

      {/* New transfer modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-5">New Transfer</h2>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {(["incoming", "outgoing", "internal"] as const).map((t) => (
                <button key={t} onClick={() => set("type", t)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition capitalize ${form.type === t ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <span className="flex items-center justify-center gap-1.5">
                    {TYPE_META[t].icon} {t}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Amount (AED) *</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)}
                    placeholder="0.00" className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">Description</label>
                <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional description..."
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>

              {/* Internal: from + to */}
              {form.type === "internal" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                    <FiRefreshCw size={14} /> Bank-to-bank transfer
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">From Account *</label>
                    <select value={form.fromBankAccountId} onChange={(e) => set("fromBankAccountId", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
                      <option value="">Select source account</option>
                      {accounts.filter((a) => a.id !== form.toBankAccountId).map((a) => <option key={a.id} value={a.id}>{a.name} — {a.bankName} ({fmt(a.currentBalance)} {a.currency})</option>)}
                    </select>
                  </div>
                  <div className="flex justify-center"><FiArrowRight className="text-blue-400" size={18} /></div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">To Account *</label>
                    <select value={form.toBankAccountId} onChange={(e) => set("toBankAccountId", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
                      <option value="">Select destination account</option>
                      {accounts.filter((a) => a.id !== form.fromBankAccountId).map((a) => <option key={a.id} value={a.id}>{a.name} — {a.bankName}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.type === "incoming" && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Receiving Account *</label>
                  <select value={form.toBankAccountId} onChange={(e) => set("toBankAccountId", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Select account</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.bankName}</option>)}
                  </select>
                </div>
              )}

              {form.type === "outgoing" && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Source Account *</label>
                  <select value={form.fromBankAccountId} onChange={(e) => set("fromBankAccountId", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Select account</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.bankName} ({fmt(a.currentBalance)} {a.currency})</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="border border-gray-200 px-5 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Processing..." : "Create Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfers list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["Date", "Type", "Description", "From", "To", "Amount"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => {
              const meta = TYPE_META[t.type] || TYPE_META.incoming;
              return (
                <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium w-fit px-2 py-1 rounded-full ${meta.color}`}>
                      {meta.icon} {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{t.description || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.fromAccount?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.toAccount?.name || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(t.amount)} AED</td>
                </tr>
              );
            })}
            {transfers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No transfers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
