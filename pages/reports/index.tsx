import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { FiDownload } from "react-icons/fi";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

type ReportType = "profit" | "vat" | "inventory";
type Period = "monthly" | "quarterly" | "yearly";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("profit");
  const [period, setPeriod] = useState<Period>("yearly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      type: reportType,
      period,
      year: String(year),
      month: String(month),
      quarter: String(quarter),
    });
    const res = await fetch(`/api/reports?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-gray-500 mt-1">Financial & inventory analytics</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Report Type */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-semibold block mb-1">Report Type</label>
            <div className="flex gap-1">
              {(["profit", "vat", "inventory"] as ReportType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${reportType === t ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-semibold block mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="text-xs text-gray-500 uppercase font-semibold block mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {period === "monthly" && (
            <div>
              <label className="text-xs text-gray-500 uppercase font-semibold block mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}

          {period === "quarterly" && (
            <div>
              <label className="text-xs text-gray-500 uppercase font-semibold block mb-1">Quarter</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {[1,2,3,4].map((q) => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </div>
          )}

          <button
            onClick={generateReport}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Results */}
      {data && (
        <div className="space-y-6">
          {/* Profit Report */}
          {reportType === "profit" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Sales", value: data.totalSales, color: "blue", icon: "💰" },
                  { label: "Material Cost", value: data.totalMaterialCost ?? data.totalPurchases, color: "yellow", icon: "🔧" },
                  { label: "Gross Profit", value: data.grossProfit, color: data.grossProfit >= 0 ? "green" : "red", icon: "📈" },
                  { label: "Profit Margin", value: `${data.profitMargin}%`, color: "purple", icon: "📊", raw: true },
                ].map(({ label, value, color, icon, raw }) => (
                  <StatCard key={label} label={label} value={raw ? value : `${Number(value).toFixed(2)} AED`} color={color} icon={icon} />
                ))}
              </div>

              {/* Expenses & Net Profit breakdown */}
              {data.totalExpenses !== undefined && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold mb-4 text-gray-700">Profit Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Revenue (paid invoices)", value: data.totalSales, color: "text-blue-600", sign: "" },
                      { label: "Material Cost (job costs)", value: data.totalMaterialCost, color: "text-orange-600", sign: "−" },
                      { label: "Gross Profit", value: data.grossProfit, color: data.grossProfit >= 0 ? "text-green-600" : "text-red-600", sign: "", border: true },
                      { label: "Sales Tax", value: data.salesTax, color: "text-gray-500", sign: "−" },
                      { label: "Expenses", value: data.totalExpenses, color: "text-red-500", sign: "−" },
                      { label: "Net Profit", value: data.netProfit, color: data.netProfit >= 0 ? "text-green-700" : "text-red-700", sign: "", border: true, bold: true },
                    ].map(({ label, value, color, sign, border, bold }) => (
                      <div key={label} className={`flex justify-between items-center text-sm py-1.5 ${border ? "border-t border-gray-100 mt-1 pt-2.5" : ""}`}>
                        <span className={bold ? "font-semibold text-gray-800" : "text-gray-600"}>{label}</span>
                        <span className={`font-${bold ? "bold" : "medium"} ${color}`}>
                          {sign} {Number(value).toFixed(2)} AED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold mb-4">Revenue vs Costs</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[
                    { name: "Revenue", amount: data.totalSales },
                    { name: "Material Cost", amount: data.totalMaterialCost ?? data.totalPurchases },
                    { name: "Expenses", amount: data.totalExpenses ?? 0 },
                    { name: "Net Profit", amount: data.netProfit },
                  ]}>
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => `${Number(v ?? 0).toFixed(2)} AED`} contentStyle={{ borderRadius: "10px", border: "none" }} />
                    <Bar dataKey="amount" radius={[6,6,0,0]}>
                      {["#6366f1","#f97316","#ef4444","#22c55e"].map((c, i) => <Cell key={i} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* VAT Report */}
          {reportType === "vat" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Output VAT (Sales)", value: data.outputVAT, color: "blue", icon: "📤" },
                  { label: "Input VAT (Purchases)", value: data.inputVAT, color: "yellow", icon: "📥" },
                  { label: "Net VAT", value: data.netVAT, color: data.netVAT >= 0 ? "red" : "green", icon: "⚖️" },
                  { label: data.vatPayable > 0 ? "VAT Payable" : "VAT Refund", value: data.vatPayable || data.vatRefund, color: data.vatPayable > 0 ? "red" : "green", icon: data.vatPayable > 0 ? "🧾" : "💚" },
                ].map(({ label, value, color, icon }) => (
                  <StatCard key={label} label={label} value={`${Number(value).toFixed(2)} AED`} color={color} icon={icon} />
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold mb-4">VAT Breakdown</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Output VAT", value: data.outputVAT },
                        { name: "Input VAT", value: data.inputVAT },
                      ]}
                      cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    >
                      {["#6366f1","#f59e0b"].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${Number(v ?? 0).toFixed(2)} AED`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Inventory Report */}
          {reportType === "inventory" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Total Inventory Value", value: `${Number(data.totalInventoryValue).toFixed(2)} AED`, color: "purple", icon: "📦" },
                  { label: "Total Products", value: data.totalProducts, color: "blue", icon: "🏷️" },
                  { label: "Low Stock Items", value: data.lowStockCount, color: data.lowStockCount > 0 ? "red" : "green", icon: "⚠️" },
                ].map(({ label, value, color, icon }) => (
                  <StatCard key={label} label={label} value={value} color={color} icon={icon} />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold mb-4">Top Selling Products</h3>
                  {data.topSelling.length === 0 ? (
                    <p className="text-gray-400 text-sm">No sales data for this period.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.topSelling.map((p: any, i: number) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{p.qtySold} units</p>
                            <p className="text-xs text-gray-500">{Number(p.revenue).toFixed(2)} AED</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold mb-4 text-red-600">⚠️ Low Stock Alerts</h3>
                  {data.lowStock.length === 0 ? (
                    <p className="text-green-600 text-sm">✅ All products are well-stocked!</p>
                  ) : (
                    <div className="space-y-2">
                      {data.lowStock.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.sku}</p>
                          </div>
                          <span className="text-red-700 font-bold text-sm">{p.stockQuantity} {p.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: any; color: string; icon?: string }) {
  const colors: Record<string, string> = {
    blue:   "from-blue-500/10 to-blue-100 text-blue-700",
    green:  "from-green-500/10 to-green-100 text-green-700",
    yellow: "from-yellow-500/10 to-yellow-100 text-yellow-700",
    purple: "from-purple-500/10 to-purple-100 text-purple-700",
    red:    "from-red-500/10 to-red-100 text-red-700",
  };
  return (
    <div className="relative p-5 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors[color] || colors.blue} opacity-20`} />
      <div className="relative flex items-center justify-between">
        <div>
          <h2 className="text-xs text-gray-500">{label}</h2>
          <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        {icon && <div className="p-3 bg-gray-100 rounded-xl text-lg">{icon}</div>}
      </div>
    </div>
  );
}