import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FiArrowLeft, FiMapPin, FiClock } from "react-icons/fi";

const STATUS_COLORS: Record<string, string> = {
  PRESENT:  "bg-green-100 text-green-700",
  LATE:     "bg-orange-100 text-orange-700",
  ABSENT:   "bg-red-100 text-red-700",
  HALF_DAY: "bg-yellow-100 text-yellow-700",
};

function duration(clockIn: string, clockOut?: string) {
  if (!clockOut) return "—";
  const mins = Math.round((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function MyHistoryPage() {
  const { data: session } = useSession();
  const [records, setRecords]   = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [month, setMonth]       = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading]   = useState(true);

  useEffect(() => { fetchRecords(); }, [month]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const r = await fetch(`/api/attendance?month=${month}&limit=100`);
      const d = await r.json();
      setRecords(d.records ?? []);
      setTotal(d.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  const present  = records.filter(r => r.status === "PRESENT").length;
  const late     = records.filter(r => r.status === "LATE").length;
  const absent   = records.filter(r => r.status === "ABSENT").length;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/attendance" className="text-gray-400 hover:text-gray-700">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">My Attendance History</h1>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-3 mb-5">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{present}</p>
          <p className="text-xs text-green-600 mt-0.5">Present</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{late}</p>
          <p className="text-xs text-orange-600 mt-0.5">Late</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{absent}</p>
          <p className="text-xs text-red-600 mt-0.5">Absent</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500" />
        </div>
      ) : records.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No records for this month.</p>
      ) : (
        <div className="space-y-3">
          {records.map(rec => (
            <div key={rec.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-800">{rec.date}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[rec.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {rec.status}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FiClock size={12} />
                  {rec.clockIn ? new Date(rec.clockIn).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  {" → "}
                  {rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
                <span>{duration(rec.clockIn, rec.clockOut)}</span>
                {(rec.clockInLat) && (
                  <span className="flex items-center gap-1 text-blue-500">
                    <FiMapPin size={11} /> GPS
                  </span>
                )}
              </div>
              {rec.notes && <p className="text-xs text-gray-400 mt-1">{rec.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
