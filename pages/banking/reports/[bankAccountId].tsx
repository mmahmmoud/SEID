import { GetServerSideProps } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FiArrowLeft, FiArrowDownLeft, FiArrowUpRight, FiCheckCircle, FiAlertCircle, FiClock } from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

function fmt(n: number, cur = "AED") { 
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + cur; 
}

export default function BankReport({ account, report }: { account: any; report: any }) {
  if (!account) return <div className="p-4 md:p-8 text-gray-400">Account not found.</div>;

  const pieData = [
    { name: "Matched", value: report.statusCount.matched, color: "#22c55e" },
    { name: "Partial", value: report.statusCount.partial, color: "#f59e0b" },
    { name: "Unmatched", value: report.statusCount.unmatched, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/banking" className="text-gray-400 hover:text-gray-600"><FiArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-xl md:text-3xl font-bold">{account.name}</h1>
          <p className="text-gray-500">{account.bankName} · ••••{account.accountNumber.slice(-4)} · {account.currency}</p>
        </div>
        <div className="ml-auto flex gap-3">
          <Link href={`/banking/transactions?bankAccountId=${account.id}`}
            className="border border-gray-200 bg-white px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            View Transactions
          </Link>
          <Link href={`/banking/reconciliation?bankAccountId=${account.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            Reconcile
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Current Balance", value: fmt(account.currentBalance, account.currency), icon: "🏦", highlight: true },
          { label: "Total Incoming", value: fmt(report.totalIncoming, account.currency), icon: "📥", green: true },
          { label: "Total Outgoing", value: fmt(report.totalOutgoing, account.currency), icon: "📤", red: true },
          { label: "Transactions", value: report.transactionCount, icon: "📋", isCount: true },
        ].map(({ label, value, icon, highlight, green, red, isCount }) => (
          <div key={label} className={`bg-white rounded-2xl border shadow-sm p-5 ${highlight ? "border-blue-200" : "border-gray-100"}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`font-bold ${isCount ? "text-2xl text-gray-900" : "text-lg"} ${green ? "text-green-600" : red ? "text-red-600" : highlight ? "text-blue-700" : "text-gray-900"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Reconciliation status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Matched", count: report.statusCount.matched, icon: <FiCheckCircle className="text-green-500" />, amount: report.totalMatched, color: "green" },
          { label: "Partial", count: report.statusCount.partial, icon: <FiClock className="text-yellow-500" />, amount: report.totalPartial, color: "yellow" },
          { label: "Unmatched", count: report.statusCount.unmatched, icon: <FiAlertCircle className="text-red-500" />, amount: report.totalUnmatched, color: "red" },
        ].map(({ label, count, icon, amount, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">{icon}<span className="font-semibold text-gray-700">{label}</span></div>
            <p className={`text-2xl font-bold ${color === "green" ? "text-green-600" : color === "yellow" ? "text-yellow-600" : "text-red-600"}`}>{count}</p>
            <p className="text-xs text-gray-400 mt-1">{fmt(amount, account.currency)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-5">Monthly Cash Flow</h2>
          {report.byMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.byMonth} barCategoryGap="30%">
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => fmt(Number(v ?? 0), account.currency)}
                  contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }}
                />
                <Bar dataKey="credit" name="Incoming" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="debit" name="Outgoing" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>}
        </div>

        {/* Reconciliation pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-5">Reconciliation Status</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                <Tooltip formatter={(v) => `${Number(v ?? 0)} txns`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No transactions yet</p>}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700">Recent Transactions</h2>
          <Link href={`/banking/transactions?bankAccountId=${account.id}`} className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-gray-400 text-xs uppercase">
            <tr>
              {["Date", "Description", "Reference", "Type", "Amount", "Status"].map((h) => (
                <th key={h} className="pb-2 text-left pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.recentTxs?.map((tx: any) => (
              <tr key={tx.id} className="border-t border-gray-50">
                <td className="py-2.5 pr-4 text-gray-500 text-xs">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="py-2.5 pr-4 max-w-[200px] truncate">{tx.description}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">{tx.reference || "—"}</td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs font-medium flex items-center gap-1 w-fit px-1.5 py-0.5 rounded-full ${tx.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {tx.type === "credit" ? <FiArrowDownLeft size={10} /> : <FiArrowUpRight size={10} />} {tx.type === "credit" ? "In" : "Out"}
                  </span>
                </td>
                <td className={`py-2.5 pr-4 font-semibold ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                  {tx.type === "credit" ? "+" : "−"}{fmt(tx.amount, account.currency)}
                </td>
                <td className="py-2.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tx.status === "matched" ? "bg-green-100 text-green-700" : tx.status === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = String(params?.bankAccountId);
  try {
    const account = await prisma.bankAccount.findUnique({ where: { id } });
    if (!account) return { notFound: true };

    const transactions = await prisma.bankTransaction.findMany({
      where: { bankAccountId: id },
      orderBy: { date: "desc" },
    });

    const totalIncoming = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const totalOutgoing = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    const totalMatched = transactions.filter((t) => t.status === "matched").reduce((s, t) => s + t.amount, 0);
    const totalUnmatched = transactions.filter((t) => t.status === "unmatched").reduce((s, t) => s + t.amount, 0);
    const totalPartial = transactions.filter((t) => t.status === "partial").reduce((s, t) => s + t.amount, 0);

    const monthMap: Record<string, any> = {};
    for (const t of transactions) {
      const key = new Date(t.date).toISOString().slice(0, 7);
      if (!monthMap[key]) monthMap[key] = { month: key, credit: 0, debit: 0, count: 0 };
      if (t.type === "credit") monthMap[key].credit += t.amount;
      else monthMap[key].debit += t.amount;
      monthMap[key].count++;
    }

    return {
      props: {
        account: JSON.parse(JSON.stringify(account)),
        report: {
          totalIncoming, totalOutgoing, totalMatched, totalUnmatched, totalPartial,
          transactionCount: transactions.length,
          statusCount: {
            matched: transactions.filter((t) => t.status === "matched").length,
            partial: transactions.filter((t) => t.status === "partial").length,
            unmatched: transactions.filter((t) => t.status === "unmatched").length,
          },
          byMonth: Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)),
          recentTxs: JSON.parse(JSON.stringify(transactions.slice(0, 10))),
        },
      },
    };
  } catch {
    return { notFound: true };
  }
};