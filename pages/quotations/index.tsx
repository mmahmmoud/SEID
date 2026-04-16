import { useEffect, useState } from "react";
import Link from "next/link";

interface Quotation {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  client: { name: string; createdAt?: string };
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = 10;

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      setQuotations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchQuotations(); }, []);

  const filtered = quotations.filter((q) => {
    const matchSearch = q.client?.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" ? true : q.status === filter;
    return matchSearch && matchFilter;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const statusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-700";
      case "SENT": return "bg-blue-100 text-blue-700";
      case "ACCEPTED": return "bg-green-100 text-green-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-xl md:text-3xl font-bold">Quotations</h1>
        <Link href="/quotations/create" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition">
          + Create Quotation
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <input
          type="text" placeholder="Search client..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border p-2 rounded w-full md:w-64 focus:ring-2 focus:ring-purple-400 outline-none"
        />
        <div className="flex gap-2 flex-wrap">
          {["ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED"].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-1 rounded-full border text-sm font-medium transition ${filter === f ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Quotation</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Client</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : paginated.length > 0 ? paginated.map((q, idx) => (
              <tr key={q.id} className={`hover:bg-gray-50 transition ${idx % 2 === 0 ? "bg-gray-50/30" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/quotations/${q.id}`} className="text-purple-600 hover:underline font-mono">
                    #{q.id.slice(0, 8).toUpperCase()}
                  </Link>
                </td>
                <td className="px-4 py-3">{q.client?.name}</td>
                <td className="px-4 py-3 font-semibold">{q.total?.toFixed(2)} AED</td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(q.status)}`}>{q.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(q.createdAt).toLocaleDateString()}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400 italic">No quotations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50">Prev</button>
          <button onClick={() => setPage(page + 1)} disabled={page * pageSize >= filtered.length}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50">Next</button>
        </div>
        <span className="text-sm text-gray-500">
          Page {page} of {Math.max(1, Math.ceil(filtered.length / pageSize))} ({filtered.length} total)
        </span>
      </div>
    </div>
  );
}