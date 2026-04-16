import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

interface Invoice {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  client: { name: string };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const router = useRouter();
  const pageSize = 10;

  const fetchInvoices = async () => {
    const res = await fetch("/api/invoices");
    const data = await res.json();
    setInvoices(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const filtered = invoices.filter((inv) => {
    const matchSearch = inv.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" ? true : inv.status === filter;
    return matchSearch && matchFilter;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const statusColor = (status: string) => {
    switch (status) {
      case "PAID": return "bg-green-100 text-green-700 ring-1 ring-green-200";
      case "UNPAID": return "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200";
      case "CANCELLED": return "bg-red-100 text-red-700 ring-1 ring-red-200";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const markAsPaid = async (id: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    fetchInvoices();
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-xl md:text-3xl font-bold">Invoices</h1>
        <Link href="/invoices/create" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition">
          + Create Invoice
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Search client..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border p-2 rounded w-full md:w-64 focus:ring-2 focus:ring-purple-400 outline-none"
        />

        <div className="flex gap-2 flex-wrap">
          {["ALL", "PAID", "UNPAID", "CANCELLED"].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
                filter === f
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Invoice</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Client</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {paginated.length > 0 ? paginated.map((inv, idx) => (
              <tr
                key={inv.id}
                onClick={() => router.push(`/invoices/view/${inv.id}`)}
                className={`cursor-pointer hover:bg-gray-50 transition ${
                  idx % 2 === 0 ? "bg-gray-50/30" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span className="text-purple-600 hover:underline font-mono">
                    #{inv.id.slice(0, 8).toUpperCase()}
                  </span>
                </td>

                <td className="px-4 py-3">{inv.client?.name}</td>

                <td className="px-4 py-3 font-semibold">
                  {inv.total?.toFixed(2)} AED
                </td>

                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>
                    {inv.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </td>

                {/* Actions */}
                <td
                  className="px-4 py-3 flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* PDF */}
                  <a
                    href={`/api/invoices/${inv.id}/pdf`}
                    target="_blank"
                    className="text-xs px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-900 transition"
                  >
                    PDF
                  </a>

                  {/* Mark Paid */}
                  {inv.status !== "PAID" && (
                    <button
                      onClick={() => markAsPaid(inv.id)}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                      Paid
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => router.push(`/invoices/edit/${inv.id}`)}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400 italic">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 transition"
          >
            Prev
          </button>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page * pageSize >= filtered.length}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 transition"
          >
            Next
          </button>
        </div>

        <span className="text-sm text-gray-500">
          Page {page} of {Math.max(1, Math.ceil(filtered.length / pageSize))} ({filtered.length} total)
        </span>
      </div>
    </div>
  );
}