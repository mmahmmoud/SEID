import { useState, useEffect } from "react";
import { FiFilter, FiClipboard, FiAlertTriangle } from "react-icons/fi";

const typeColors: Record<string, string> = {
  IN:          "bg-green-100 text-green-700",
  OUT:         "bg-red-100 text-red-700",
  ADJUSTMENT:  "bg-blue-100 text-blue-700",
  CONSUMPTION: "bg-orange-100 text-orange-700",
};

export default function InventoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"log" | "alerts">("log");

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/products?lowStock=true").then((r) => r.json()),
    ]).then(([logsData, lowData]) => {
      setLogs(Array.isArray(logsData) ? logsData : []);
      setLowStock(Array.isArray(lowData) ? lowData : []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Inventory</h1>
          <p className="text-gray-500 mt-1">Stock movements &amp; alerts</p>
        </div>
        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm">
            <FiAlertTriangle size={16} />
            {lowStock.length} low stock {lowStock.length === 1 ? "alert" : "alerts"}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(["log", "alerts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t === "log" ? "Movement Log" : `Low Stock Alerts ${lowStock.length > 0 ? `(${lowStock.length})` : ""}`}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <>
          {tab === "log" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    {["Date", "Product", "Type", "Qty", "Cost", "Reference", "Notes"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">{log.product?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[log.type] || "bg-gray-100 text-gray-600"}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${log.type === "OUT" ? "text-red-600" : log.type === "IN" ? "text-green-600" : "text-blue-600"}`}>
                        {log.type === "OUT" ? "-" : "+"}{Math.abs(log.quantity)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{log.costPrice ? `${Number(log.costPrice).toFixed(2)} AED` : "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.reference || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{log.notes || "—"}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                      <FiClipboard size={32} className="mx-auto mb-2 opacity-30" />
                      No inventory movements yet.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "alerts" && (
            <div className="space-y-3">
              {lowStock.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                  <p className="text-2xl mb-2">✅</p>
                  <p>All products are well-stocked!</p>
                </div>
              ) : lowStock.map((p: any) => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-bold text-lg">{p.stockQuantity} {p.unit}</p>
                    <p className="text-xs text-gray-400">Alert threshold: {p.lowStockAlert}</p>
                  </div>
                  <div className="ml-6">
                    <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                      <FiAlertTriangle size={12} /> Low Stock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
