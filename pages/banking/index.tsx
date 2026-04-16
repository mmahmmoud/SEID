import { useState, useEffect } from "react";
import Link from "next/link";
import { FiCreditCard, FiArrowUpRight, FiArrowDownLeft, FiRefreshCw, FiUpload, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function fmt(n: number, currency = "AED") {
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency;
}

export default function BankingDashboard() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/banking/accounts").then((r) => r.json()),
      fetch("/api/banking/report").then((r) => r.json()),
    ]).then(([accs, rep]) => {
      setAccounts(Array.isArray(accs) ? accs : []);
      setReport(rep);
    }).finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Banking</h1>
          <p className="text-gray-500 mt-1">{accounts.length} account{accounts.length !== 1 ? "s" : ""} · Total: {fmt(totalBalance)}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/banking/transfers" className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm font-medium transition">
            <FiRefreshCw size={14} /> New Transfer
          </Link>
          <Link href="/banking/accounts" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium transition">
            <FiCreditCard size={14} /> Manage Accounts
          </Link>
        </div>
      </div>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Balance", value: fmt(totalBalance), icon: <FiCreditCard size={20} />, color: "blue" },
              { label: "Total Incoming", value: fmt(report?.totalIncoming ?? 0), icon: <FiArrowDownLeft size={20} />, color: "green" },
              { label: "Total Outgoing", value: fmt(report?.totalOutgoing ?? 0), icon: <FiArrowUpRight size={20} />, color: "red" },
              { label: "Unmatched Txns", value: report?.statusCount?.unmatched ?? 0, icon: <FiAlertCircle size={20} />, color: "yellow", isCount: true },
            ].map(({ label, value, icon, color, isCount }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  color === "blue" ? "bg-blue-100 text-blue-600" :
                  color === "green" ? "bg-green-100 text-green-600" :
                  color === "red" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"
                }`}>{icon}</div>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`font-bold ${isCount ? "text-2xl" : "text-lg"} text-gray-900`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Accounts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {accounts.map((acc) => (
              <Link key={acc.id} href={`/banking/reports/${acc.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-gray-900">{acc.name}</p>
                    <p className="text-sm text-gray-500">{acc.bankName}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">••••{acc.accountNumber.slice(-4)}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{acc.currency}</span>
                </div>
                <div className="border-t border-gray-50 pt-3">
                  <p className="text-xs text-gray-400 mb-1">Current Balance</p>
                  <p className={`text-xl font-bold ${acc.currentBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
                    {fmt(acc.currentBalance, acc.currency)}
                  </p>
                </div>
                <div className="flex gap-3 mt-3 text-xs text-gray-400">
                  <span>{acc._count?.transactions ?? 0} transactions</span>
                </div>
              </Link>
            ))}
            <Link href="/banking/accounts"
              className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 flex items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition">
              <FiCreditCard size={18} /> Add Account
            </Link>
          </div>

          {/* Monthly chart */}
          {report?.byMonth?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="font-semibold text-gray-700 mb-5">Monthly Cash Flow (All Accounts)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={report.byMonth} barCategoryGap="30%">
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fmt(Number(v || 0))} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                  <Bar dataKey="credit" name="Incoming" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debit" name="Outgoing" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quick nav */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/banking/transactions", label: "Transactions", icon: "📋", desc: "View all bank transactions" },
              { href: "/banking/transfers", label: "Transfers", icon: "🔄", desc: "Manage transfers" },
              { href: "/banking/reconciliation", label: "Reconciliation", icon: "✅", desc: `${report?.statusCount?.unmatched ?? 0} unmatched` },
              { href: "/banking/accounts", label: "Accounts", icon: "🏦", desc: "Manage bank accounts" },
            ].map(({ href, label, icon, desc }) => (
              <Link key={href} href={href}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="font-semibold text-gray-800 text-sm">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
