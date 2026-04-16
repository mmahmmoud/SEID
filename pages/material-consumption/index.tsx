import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FiPlus, FiFilter, FiPackage, FiTool, FiCalendar, FiUser, FiEye,
} from "react-icons/fi";

interface ConsumptionRecord {
  id: string;
  date: string;
  referenceType: "PROJECT" | "WORKSHOP";
  referenceId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  items: { id: string; quantity: number; costSnapshot: number; product: { name: string; unit: string } }[];
}

interface Client {
  id: string;
  name: string;
}

const TYPE_COLORS = {
  PROJECT:  "bg-blue-100 text-blue-700",
  WORKSHOP: "bg-purple-100 text-purple-700",
};

export default function MaterialConsumptionPage() {
  const [records, setRecords]             = useState<ConsumptionRecord[]>([]);
  const [total, setTotal]                 = useState(0);
  const [clients, setClients]             = useState<Client[]>([]);
  const [loading, setLoading]             = useState(true);

  // Filters
  const [typeFilter, setTypeFilter]       = useState("");
  const [clientFilter, setClientFilter]   = useState("");
  const [fromDate, setFromDate]           = useState("");
  const [toDate, setToDate]               = useState("");
  const [showFilters, setShowFilters]     = useState(false);

  const fetchRecords = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter)   params.set("referenceType", typeFilter);
    if (clientFilter) params.set("referenceId",   clientFilter);
    if (fromDate)     params.set("from",           fromDate);
    if (toDate)       params.set("to",             toDate);

    fetch(`/api/material-consumption?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRecords(d.records || []);
        setTotal(d.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { fetchRecords(); }, [typeFilter, clientFilter, fromDate, toDate]);

  const getClientName = (id: string | null) => {
    if (!id) return null;
    return clients.find((c) => c.id === id)?.name || id;
  };

  const totalItemsFor = (r: ConsumptionRecord) => r.items.reduce((s, i) => s + i.quantity, 0);
  const totalCostFor  = (r: ConsumptionRecord) => r.items.reduce((s, i) => s + i.quantity * i.costSnapshot, 0);

  const grandTotalCost = records.reduce((s, r) => s + totalCostFor(r), 0);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Material Consumption</h1>
          <p className="text-gray-500 mt-1">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition ${
              showFilters ? "bg-gray-100 border-gray-300" : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <FiFilter size={15} /> Filters
          </button>
          <Link
            href="/material-consumption/create"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition text-sm font-medium"
          >
            <FiPlus /> Record Consumption
          </Link>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 grid grid-cols-4 gap-4">
          {/* Type filter */}
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Type</label>
            <select
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="PROJECT">Project Site</option>
              <option value="WORKSHOP">Workshop</option>
            </select>
          </div>

          {/* Client filter */}
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Client / Project</label>
            <select
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* From date */}
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">From Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* To date */}
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">To Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* Clear */}
          {(typeFilter || clientFilter || fromDate || toDate) && (
            <div className="col-span-4 flex justify-end">
              <button
                onClick={() => { setTypeFilter(""); setClientFilter(""); setFromDate(""); setToDate(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary strip */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Records",  value: String(records.length),        color: "text-gray-800" },
            { label: "Project Site",   value: String(records.filter((r) => r.referenceType === "PROJECT").length),  color: "text-blue-600" },
            { label: "Workshop",       value: String(records.filter((r) => r.referenceType === "WORKSHOP").length), color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {["Date", "Type", "Client / Location", "Products", "Total Units", "Est. Cost", "Recorded By", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <FiCalendar size={13} className="opacity-50" />
                      {new Date(r.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[r.referenceType]}`}>
                      {r.referenceType === "PROJECT" ? <FiPackage size={11} /> : <FiTool size={11} />}
                      {r.referenceType === "PROJECT" ? "Project Site" : "Workshop"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.referenceType === "PROJECT"
                      ? <span className="font-medium text-gray-800">{getClientName(r.referenceId) || "—"}</span>
                      : <span className="text-gray-400 italic">Internal</span>
                    }
                    {r.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{r.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.items.slice(0, 2).map((item) => (
                        <span key={item.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {item.product.name}
                        </span>
                      ))}
                      {r.items.length > 2 && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          +{r.items.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">
                    {totalItemsFor(r).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {totalCostFor(r).toFixed(2)} AED
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <FiUser size={13} className="opacity-50" />
                      <span className="text-xs">{r.createdBy}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/material-consumption/${r.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      <FiEye size={13} /> View
                    </Link>
                  </td>
                </tr>
              ))}

              {records.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <FiPackage size={36} className="mx-auto mb-3 opacity-20" />
                    <p>No consumption records yet.</p>
                    <Link
                      href="/material-consumption/create"
                      className="mt-3 inline-block text-blue-600 text-sm hover:underline"
                    >
                      Record your first consumption →
                    </Link>
                  </td>
                </tr>
              )}

              {/* Grand total row */}
              {records.length > 0 && (
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total Cost (filtered)
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">
                    {grandTotalCost.toFixed(2)} AED
                  </td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
