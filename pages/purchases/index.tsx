import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiPlus, FiEye, FiCheck, FiShoppingCart } from "react-icons/fi";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  RECEIVED: "bg-green-100 text-green-700",
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchPurchases = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/purchases?${params}`)
      .then((r) => r.json())
      .then((d) => { setPurchases(d.purchases || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPurchases(); }, [statusFilter]);

  const markReceived = async (id: string) => {
    if (!confirm("Mark this purchase as RECEIVED? This will update inventory.")) return;
    await fetch(`/api/purchases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED" }),
    });
    fetchPurchases();
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Purchases</h1>
          <p className="text-gray-500 mt-1">{total} total records</p>
        </div>
        <Link
          href="/purchases/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        >
          <FiPlus /> New Purchase
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {["", "PENDING", "RECEIVED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {["Date", "Ref #", "Supplier", "Items", "Sub Total", "Tax", "Total", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.map((p: any) => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.referenceNo || "—"}</td>
                  <td className="px-4 py-3 font-medium">{p.supplier?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.items?.length || 0}</td>
                  <td className="px-4 py-3">{Number(p.subTotal).toFixed(2)} AED</td>
                  <td className="px-4 py-3">{Number(p.tax).toFixed(2)} AED</td>
                  <td className="px-4 py-3 font-semibold">{Number(p.total).toFixed(2)} AED</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <Link href={`/purchases/${p.id}`} className="text-gray-400 hover:text-blue-600">
                        <FiEye size={15} />
                      </Link>
                      {p.status === "PENDING" && (
                        <button
                          onClick={() => markReceived(p.id)}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 flex items-center gap-1"
                        >
                          <FiCheck size={12} /> Receive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <FiShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                  No purchases found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
