import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import Link from "next/link";

function fmt(n: number) { return n.toLocaleString("en-AE", { minimumFractionDigits: 2 }); }

const BANKS = ["Abu Dhabi Islamic Bank", "Emirates NBD", "Abu Dhabi Commercial Bank", "Dubai Islamic Bank", "First Abu Dhabi Bank", "Mashreq Bank", "RAK Bank", "Sharjah Islamic Bank", "Other"];

type Account = { id: string; name: string; bankName: string; accountNumber: string; currency: string; openingBalance: number; currentBalance: number; _count?: { transactions: number } };
const emptyForm = () => ({ name: "", bankName: "", accountNumber: "", currency: "AED", openingBalance: "" });

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/banking/accounts").then((r) => r.json()).then((d) => setAccounts(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (acc: Account) => {
    setEditing(acc);
    setForm({ name: acc.name, bankName: acc.bankName, accountNumber: acc.accountNumber, currency: acc.currency, openingBalance: String(acc.openingBalance) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.bankName || !form.accountNumber) return alert("Please fill all required fields");
    setSaving(true);
    const url = editing ? `/api/banking/accounts/${editing.id}` : "/api/banking/accounts";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { setShowForm(false); load(); }
    else { const d = await res.json(); alert(d.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this account?")) return;
    await fetch(`/api/banking/accounts/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Bank Accounts</h1>
          <p className="text-gray-500 mt-1">{accounts.length} active accounts</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
          <FiPlus size={14} /> Add Account
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">{editing ? "Edit Account" : "New Bank Account"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Account Name *</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Main Operations Account"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Bank Name *</label>
                  <select value={form.bankName} onChange={(e) => set("bankName", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Select Bank</option>
                    {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Currency</label>
                  <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    {["AED", "USD", "EUR", "GBP", "SAR"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Account Number *</label>
                <input value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} placeholder="IBAN or account number"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              {!editing && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Opening Balance ({form.currency})</label>
                  <input type="number" step="0.01" value={form.openingBalance} onChange={(e) => set("openingBalance", e.target.value)} placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="border border-gray-200 px-5 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Saving..." : (editing ? "Save Changes" : "Create Account")}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{acc.name}</p>
                  <p className="text-sm text-gray-500">{acc.bankName}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{acc.accountNumber}</p>
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => openEdit(acc)} className="text-gray-400 hover:text-blue-600 p-1"><FiEdit2 size={15} /></button>
                  <button onClick={() => handleDelete(acc.id)} className="text-gray-400 hover:text-red-500 p-1"><FiTrash2 size={15} /></button>
                </div>
              </div>
              <div className="space-y-2 text-sm border-t border-gray-50 pt-3">
                <div className="flex justify-between text-gray-500"><span>Opening Balance</span><span>{fmt(acc.openingBalance)} {acc.currency}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-base"><span>Current Balance</span><span className={acc.currentBalance < 0 ? "text-red-600" : ""}>{fmt(acc.currentBalance)} {acc.currency}</span></div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                <Link href={`/banking/transactions?bankAccountId=${acc.id}`} className="flex-1 text-center text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  {acc._count?.transactions ?? 0} Transactions
                </Link>
                <Link href={`/banking/reports/${acc.id}`} className="flex-1 text-center text-xs py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">
                  View Report
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
