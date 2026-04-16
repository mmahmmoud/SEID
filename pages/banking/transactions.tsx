import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiUpload, FiFilter, FiArrowUpRight, FiArrowDownLeft, FiCheckCircle, FiAlertCircle, FiClock } from "react-icons/fi";

function fmt(n: number) { return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const STATUS_COLORS: Record<string, string> = {
  matched: "bg-green-100 text-green-700",
  partial: "bg-yellow-100 text-yellow-700",
  unmatched: "bg-red-100 text-red-700",
};
const STATUS_ICONS: Record<string, any> = {
  matched: <FiCheckCircle size={12} />,
  partial: <FiClock size={12} />,
  unmatched: <FiAlertCircle size={12} />,
};

export default function TransactionsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const [filters, setFilters] = useState({
    bankAccountId: (router.query.bankAccountId as string) || "",
    type: "", status: "", dateFrom: "", dateTo: "", search: "",
    page: 1,
  });

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
    const [txRes, accRes] = await Promise.all([
      fetch(`/api/banking/transactions?${params}`).then((r) => r.json()),
      fetch("/api/banking/accounts").then((r) => r.json()),
    ]);
    setTransactions(txRes.transactions || []);
    setTotal(txRes.total || 0);
    setAccounts(Array.isArray(accRes) ? accRes : []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filters]);

  const setFilter = (k: string, v: any) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !filters.bankAccountId) { alert("Please select a bank account first"); return; }
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bankAccountId", filters.bankAccountId);
    const res = await fetch("/api/banking/import", { method: "POST", body: fd });
    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    if (res.ok) fetchData();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-gray-500 mt-1">{total} total records</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fileRef.current?.click()}
            disabled={importing || !filters.bankAccountId}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {importing ? <span className="animate-spin">⟳</span> : <FiUpload size={14} />}
            {importing ? "Importing..." : "Import Statement"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {importResult && (
        <div className={`mb-5 p-4 rounded-xl border text-sm ${importResult.imported > 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"}`}>
          {importResult.message ? `Error: ${importResult.message}` :
            `✅ Imported ${importResult.imported} transactions · ${importResult.duplicates} duplicates skipped · ${importResult.total} rows in file`}
          <button onClick={() => setImportResult(null)} className="ml-4 opacity-60 hover:opacity-100 font-bold">×</button>
        </div>
      )}

      {!filters.bankAccountId && (
        <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
          💡 Select a bank account below to import a statement. You can also view all transactions across accounts.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <select value={filters.bankAccountId} onChange={(e) => setFilter("bankAccountId", e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">All Accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.bankName}</option>)}
            </select>
          </div>
          <select value={filters.type} onChange={(e) => setFilter("type", e.target.value)}
            className="border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Types</option>
            <option value="credit">Credit (In)</option>
            <option value="debit">Debit (Out)</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}
            className="border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Statuses</option>
            <option value="unmatched">Unmatched</option>
            <option value="partial">Partial</option>
            <option value="matched">Matched</option>
          </select>
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)}
            className="border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="From" />
          <input type="date" value={filters.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)}
            className="border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="To" />
        </div>
        <div className="mt-3">
          <input value={filters.search} onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search description or reference..."
            className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
      </div>

      {/* Table */}
      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {["Date", "Account", "Description", "Reference", "Type", "Amount", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs text-gray-700">{tx.bankAccount?.name}</p>
                    <p className="text-xs text-gray-400">{tx.bankAccount?.bankName}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-gray-800">{tx.description}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{tx.reference || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium w-fit px-2 py-1 rounded-full ${tx.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {tx.type === "credit" ? <FiArrowDownLeft size={10} /> : <FiArrowUpRight size={10} />}
                      {tx.type === "credit" ? "In" : "Out"}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${tx.type === "credit" ? "text-green-700" : "text-red-600"}`}>
                    {tx.type === "credit" ? "+" : "−"}{fmt(tx.amount)} {tx.bankAccount?.currency}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium w-fit px-2 py-1 rounded-full ${STATUS_COLORS[tx.status]}`}>
                      {STATUS_ICONS[tx.status]} {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tx.status !== "matched" && (
                      <Link href={`/banking/reconciliation?txId=${tx.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Match →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
          {/* Pagination */}
          {total > 50 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-50 text-sm text-gray-500">
              <span>Page {filters.page} · {total} total</span>
              <div className="flex gap-2">
                <button disabled={filters.page <= 1} onClick={() => setFilter("page", filters.page - 1)}
                  className="px-3 py-1.5 border rounded-lg disabled:opacity-40">Prev</button>
                <button disabled={filters.page * 50 >= total} onClick={() => setFilter("page", filters.page + 1)}
                  className="px-3 py-1.5 border rounded-lg disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
