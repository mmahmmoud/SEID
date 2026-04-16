import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiArrowLeft, FiPackage, FiTool, FiCalendar, FiUser } from "react-icons/fi";

const TYPE_COLORS: Record<string, string> = {
  PROJECT:  "bg-blue-100 text-blue-700",
  WORKSHOP: "bg-purple-100 text-purple-700",
};

export default function MaterialConsumptionDetail() {
  const router = useRouter();
  const { id }  = router.query as { id: string };

  const [record, setRecord]   = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/material-consumption/${id}`).then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([rec, cls]) => {
      setRecord(rec);
      setClients(Array.isArray(cls) ? cls : []);
    }).finally(() => setLoading(false));
  }, [id]);

  const getClientName = (id: string | null) =>
    id ? (clients.find((c) => c.id === id)?.name || id) : null;

  if (loading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }
  if (!record || record.message) {
    return (
      <div className="p-8">
        <p className="text-red-600">Record not found.</p>
        <Link href="/material-consumption" className="text-blue-600 text-sm mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  const totalCost  = record.items.reduce((s: number, i: any) => s + i.quantity * i.costSnapshot, 0);
  const totalUnits = record.items.reduce((s: number, i: any) => s + i.quantity, 0);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/material-consumption" className="text-gray-400 hover:text-gray-700 transition">
          <FiArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Consumption Detail</h1>
          <p className="text-gray-400 text-xs font-mono mt-0.5">{record.id}</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</p>
                <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium ${TYPE_COLORS[record.referenceType]}`}>
                  {record.referenceType === "PROJECT" ? <FiPackage size={13} /> : <FiTool size={13} />}
                  {record.referenceType === "PROJECT" ? "Project Site" : "Workshop"}
                </span>
              </div>

              {record.referenceType === "PROJECT" && record.referenceId && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Client / Project</p>
                  <p className="font-semibold text-gray-800">{getClientName(record.referenceId)}</p>
                </div>
              )}

              {record.notes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-gray-700 text-sm">{record.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</p>
                <div className="flex items-center gap-1.5 text-gray-700">
                  <FiCalendar size={14} className="opacity-50" />
                  {new Date(record.date).toLocaleDateString("en-AE", { dateStyle: "long" })}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Recorded By</p>
                <div className="flex items-center gap-1.5 text-gray-700">
                  <FiUser size={14} className="opacity-50" />
                  {record.createdBy}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created At</p>
                <p className="text-gray-500 text-sm">{new Date(record.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-base font-semibold text-gray-700">Materials Consumed</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {["Product", "SKU", "Unit", "Qty Used", "Cost at Time", "Line Total"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {record.items.map((item: any) => (
                <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{item.product.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.product.sku}</td>
                  <td className="px-4 py-3 text-gray-500">{item.product.unit}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">-{item.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{item.costSnapshot.toFixed(2)} AED</td>
                  <td className="px-4 py-3 font-semibold">{(item.quantity * item.costSnapshot).toFixed(2)} AED</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={3} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Totals</td>
                <td className="px-4 py-3 font-bold text-red-600">-{totalUnits.toFixed(2)}</td>
                <td />
                <td className="px-4 py-3 font-bold text-gray-800">{totalCost.toFixed(2)} AED</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Inventory log trace */}
        {record.inventoryLogs && record.inventoryLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="text-base font-semibold text-gray-700">Inventory Log Entries</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  {["Product", "Type", "Qty", "Cost", "Time"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {record.inventoryLogs.map((log: any) => (
                  <tr key={log.id} className="border-t border-gray-50">
                    <td className="px-4 py-3">{log.product?.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-600 font-semibold">-{log.quantity}</td>
                    <td className="px-4 py-3 text-gray-500">{log.costPrice?.toFixed(2)} AED</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
