import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FiUsers, FiMapPin, FiClock, FiCalendar,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiEye,
  FiArrowLeft, FiRefreshCw,
} from "react-icons/fi";

const STATUS_COLORS: Record<string, string> = {
  PRESENT:  "bg-green-100 text-green-700 border-green-200",
  LATE:     "bg-orange-100 text-orange-700 border-orange-200",
  ABSENT:   "bg-red-100 text-red-700 border-red-200",
  HALF_DAY: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const STATUS_ICONS: Record<string, any> = {
  PRESENT:  <FiCheckCircle size={13} />,
  LATE:     <FiAlertCircle size={13} />,
  ABSENT:   <FiXCircle size={13} />,
  HALF_DAY: <FiAlertCircle size={13} />,
};

function duration(clockIn: string, clockOut?: string) {
  if (!clockOut) return null;
  const mins = Math.round((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function AdminAttendancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  const [tab, setTab]             = useState<"today" | "history" | "visits">("today");
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth]         = useState(new Date().toISOString().slice(0, 7));
  const [records, setRecords]     = useState<any[]>([]);
  const [visits, setVisits]       = useState<any[]>([]);
  const [users, setUsers]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedUser, setSUser]  = useState("");
  const [selectedVisit, setSelV]  = useState<any>(null);
  const [pings, setPings]         = useState<any[]>([]);
  const [selectedRec, setSelectedRec]  = useState<any>(null);

  useEffect(() => {
    if (session && role !== "admin") router.replace("/attendance");
  }, [session]);

  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "today" || tab === "history") fetchAttendance();
    if (tab === "visits") fetchVisits();
  }, [tab, date, month, selectedUser]);

  async function fetchAttendance() {
    setLoading(true);
    const d = tab === "today" ? date : undefined;
    const m = tab === "history" ? month : undefined;
    const u = selectedUser || undefined;
    const params = new URLSearchParams();
    if (d) params.set("date", d);
    if (m) params.set("month", m);
    if (u) params.set("userId", u);
    params.set("limit", "200");
    try {
      const r = await fetch(`/api/attendance?${params}`);
      const data = await r.json();
      setRecords(data.records ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVisits() {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedUser) params.set("userId", selectedUser);
    if (tab === "today") params.set("date", date);
    else params.set("month", month);
    params.set("limit", "200");
    try {
      const r = await fetch(`/api/field-visits?${params}`);
      const data = await r.json();
      setVisits(data.visits ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadPings(rec: any) {
    setSelectedRec(rec);
    const r = await fetch(`/api/attendance/gps-ping?attendanceId=${rec.id}`);
    const data = await r.json();
    setPings(data ?? []);
  }

  async function markStatus(id: string, status: string) {
    await fetch("/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchAttendance();
  }

  const presentCount = records.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
  const absentCount  = records.filter(r => r.status === "ABSENT").length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/attendance" className="text-gray-400 hover:text-gray-700">
          <FiArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance &amp; Field Tracking</h1>
          <p className="text-sm text-gray-400">Admin overview — all employees</p>
        </div>
        <button onClick={() => tab === "visits" ? fetchVisits() : fetchAttendance()}
          className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5">
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(["today", "history", "visits"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "today" ? "Today" : t === "history" ? "Monthly History" : "Field Visits"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {tab === "today" && (
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        )}
        {(tab === "history" || tab === "visits") && (
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        )}
        <select value={selectedUser} onChange={e => setSUser(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-[160px]">
          <option value="">All employees</option>
          {users.filter(u => u.role !== "admin").map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Today summary cards */}
      {tab === "today" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{records.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total logged</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{presentCount}</p>
            <p className="text-xs text-green-600 mt-0.5">Present</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{absentCount}</p>
            <p className="text-xs text-red-600 mt-0.5">Absent</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{visits.length}</p>
            <p className="text-xs text-blue-600 mt-0.5">Field visits</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (

        /* ── Attendance Table ── */
        (tab === "today" || tab === "history") && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Employee</th>
                  {tab === "history" && <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>}
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Clock In</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Clock Out</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Hours</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">GPS</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No records found</td></tr>
                ) : records.map(rec => (
                  <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{rec.user?.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{rec.user?.role}</div>
                    </td>
                    {tab === "history" && <td className="px-4 py-3 text-gray-600">{rec.date}</td>}
                    <td className="px-4 py-3 text-gray-700">
                      {rec.clockIn ? new Date(rec.clockIn).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" }) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" }) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {rec.clockIn ? (duration(rec.clockIn, rec.clockOut) ?? <span className="text-green-600 text-xs font-medium">Active</span>) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select value={rec.status}
                        onChange={e => markStatus(rec.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer ${STATUS_COLORS[rec.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        <option value="PRESENT">Present</option>
                        <option value="LATE">Late</option>
                        <option value="ABSENT">Absent</option>
                        <option value="HALF_DAY">Half Day</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {rec._count?.gpsPings > 0 ? (
                        <span className="flex items-center gap-1 text-blue-600 text-xs font-medium">
                          <FiMapPin size={11} /> {rec._count.gpsPings}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => loadPings(rec)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 px-2 py-1 rounded-lg transition">
                        <FiEye size={12} /> Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Field Visits Tab ── */}
      {!loading && tab === "visits" && (
        <div className="space-y-3">
          {visits.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No field visits found</div>
          ) : visits.map(v => (
            <div key={v.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-blue-200 transition cursor-pointer"
              onClick={() => setSelV(v)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">
                      {v.client?.name ?? v.clientName ?? "Unknown client"}
                    </span>
                    {v.client && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">In ERP</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><FiUsers size={11} />{v.user?.name}</span>
                    <span className="flex items-center gap-1"><FiClock size={11} />
                      {new Date(v.visitDate).toLocaleString("en-AE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-1"><FiMapPin size={11} />{v.lat.toFixed(4)}, {v.lng.toFixed(4)}</span>
                  </div>
                  {v.purpose && <p className="text-xs text-gray-500 mt-1">Purpose: {v.purpose}</p>}
                  {v.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{v.notes}</p>}
                </div>
                <FiEye size={16} className="text-gray-300 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GPS Track Modal */}
      {selectedRec && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setSelectedRec(null); setPings([]); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{selectedRec.user?.name} — GPS Track</h3>
              <p className="text-sm text-gray-400">{selectedRec.date} · {pings.length} location pings</p>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4">
              {pings.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No GPS pings recorded</p>
              ) : (
                <div className="space-y-2">
                  {/* Map link */}
                  {pings.length > 0 && (
                    <a href={`https://www.google.com/maps/dir/${pings.map(p => `${p.lat},${p.lng}`).join('/')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 font-medium mb-3 hover:underline">
                      <FiMapPin size={14} /> View route on Google Maps
                    </a>
                  )}
                  {pings.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 text-sm border border-gray-100 rounded-xl p-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <div className="flex-1">
                        <span className="text-gray-600 font-mono text-xs">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                        {p.accuracy && <span className="text-gray-400 ml-2 text-xs">±{Math.round(p.accuracy)}m</span>}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(p.recordedAt).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <a href={`https://maps.google.com/?q=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700">
                        <FiMapPin size={13} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => { setSelectedRec(null); setPings([]); }}
                className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit Detail Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelV(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">
                {selectedVisit.client?.name ?? selectedVisit.clientName ?? "Visit Details"}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                by {selectedVisit.user?.name} · {new Date(selectedVisit.visitDate).toLocaleString("en-AE")}
              </p>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto max-h-[60vh]">
              <Detail label="GPS Location"
                value={
                  <a href={`https://maps.google.com/?q=${selectedVisit.lat},${selectedVisit.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                    <FiMapPin size={12} /> {selectedVisit.lat.toFixed(5)}, {selectedVisit.lng.toFixed(5)} ↗
                  </a>
                } />
              {selectedVisit.address  && <Detail label="Address"  value={selectedVisit.address} />}
              {selectedVisit.purpose  && <Detail label="Purpose"  value={selectedVisit.purpose} />}
              {selectedVisit.duration && <Detail label="Duration" value={`${selectedVisit.duration} minutes`} />}
              {selectedVisit.notes    && <Detail label="Notes"    value={selectedVisit.notes} />}
              {selectedVisit.client   && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-medium mb-2">Client details</p>
                  {selectedVisit.client.phone && <Detail label="Phone"  value={selectedVisit.client.phone} />}
                  {selectedVisit.client.email && <Detail label="Email"  value={selectedVisit.client.email} />}
                </div>
              )}
              {selectedVisit.photoUrl && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">Photo</p>
                  <img src={selectedVisit.photoUrl} alt="Visit photo"
                    className="w-full rounded-xl border border-gray-100 object-cover max-h-48" />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setSelV(null)}
                className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  );
}
