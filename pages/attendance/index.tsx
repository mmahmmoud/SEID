import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FiMapPin, FiClock, FiLogIn, FiLogOut, FiPlus,
  FiCamera, FiUser, FiCheck, FiList,
} from "react-icons/fi";

interface TodayStatus {
  today: string;
  attendance: any;
  isClockedIn: boolean;
  isClockedOut: boolean;
  todayVisits: number;
}

interface Client { id: string; name: string; }

export default function AttendancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  const [status, setStatus]         = useState<TodayStatus | null>(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setAL]      = useState(false);
  const [gpsError, setGpsError]     = useState("");
  const [msg, setMsg]               = useState("");
  const [clients, setClients]       = useState<Client[]>([]);
  const [pingInterval, setPingInt]  = useState<any>(null);

  // Visit form
  const [showVisitForm, setShowVisit] = useState(false);
  const [visitForm, setVF]            = useState({
    clientId: "", clientName: "", purpose: "", notes: "", address: "",
  });
  const [visitLat, setVLat]  = useState<number | null>(null);
  const [visitLng, setVLng]  = useState<number | null>(null);
  const [visitSaving, setVS] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStatus();
    fetch("/api/clients").then(r => r.json()).then(setClients).catch(() => {});
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const r = await fetch("/api/attendance/today");
      setStatus(await r.json());
    } finally {
      setLoading(false);
    }
  }

  function getGPS(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS not supported"));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000,
      });
    });
  }

  async function clockIn() {
    setAL(true); setGpsError(""); setMsg("");
    try {
      const pos = await getGPS();
      const { latitude: lat, longitude: lng } = pos.coords;
      const r = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock-in", lat, lng }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      setMsg("✅ Clocked in successfully!");
      await fetchStatus();
      startPinging();
    } catch (e: any) {
      setGpsError(e.message.includes("denied")
        ? "Please allow location access to clock in."
        : e.message);
    } finally {
      setAL(false);
    }
  }

  async function clockOut() {
    setAL(true); setGpsError(""); setMsg("");
    try {
      const pos = await getGPS();
      const { latitude: lat, longitude: lng } = pos.coords;
      const r = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock-out", lat, lng }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      setMsg("✅ Clocked out. Have a great day!");
      stopPinging();
      await fetchStatus();
    } catch (e: any) {
      setGpsError(e.message);
    } finally {
      setAL(false);
    }
  }

  function startPinging() {
    const id = setInterval(async () => {
      try {
        const pos = await getGPS();
        await fetch("/api/attendance/gps-ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        });
      } catch {}
    }, 5 * 60 * 1000); // every 5 minutes
    setPingInt(id);
  }

  function stopPinging() {
    if (pingInterval) clearInterval(pingInterval);
    setPingInt(null);
  }

  async function openVisitForm() {
    setVF({ clientId: "", clientName: "", purpose: "", notes: "", address: "" });
    setVLat(null); setVLng(null);
    setShowVisit(true);
    try {
      const pos = await getGPS();
      setVLat(pos.coords.latitude);
      setVLng(pos.coords.longitude);
    } catch {}
  }

  async function submitVisit() {
    if (!visitLat || !visitLng) {
      setGpsError("GPS location is required for a field visit.");
      return;
    }
    setVS(true);
    try {
      const fd = new FormData();
      fd.append("lat",        String(visitLat));
      fd.append("lng",        String(visitLng));
      fd.append("clientId",   visitForm.clientId);
      fd.append("clientName", visitForm.clientName);
      fd.append("purpose",    visitForm.purpose);
      fd.append("notes",      visitForm.notes);
      fd.append("address",    visitForm.address);

      const photo = photoRef.current?.files?.[0];
      if (photo) fd.append("photo", photo);

      const r = await fetch("/api/field-visits", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json()).message);

      setMsg("✅ Visit logged successfully!");
      setShowVisit(false);
      await fetchStatus();
    } catch (e: any) {
      setGpsError(e.message);
    } finally {
      setVS(false);
    }
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-AE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="p-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateStr}</p>
        </div>
        {role === "admin" && (
          <Link href="/attendance/admin"
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition">
            Admin View
          </Link>
        )}
      </div>

      {/* Time display */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <FiClock size={18} />
          <span className="text-sm opacity-80">Current time</span>
        </div>
        <p className="text-5xl font-bold tracking-tight">{timeStr}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="opacity-70 text-xs mb-0.5">Clock In</p>
            <p className="font-semibold">
              {status?.attendance?.clockIn
                ? new Date(status.attendance.clockIn).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="opacity-70 text-xs mb-0.5">Clock Out</p>
            <p className="font-semibold">
              {status?.attendance?.clockOut
                ? new Date(status.attendance.clockOut).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-5">
        {status?.isClockedIn && (
          <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Working
          </span>
        )}
        {status?.isClockedOut && (
          <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1.5 rounded-full">
            <FiCheck size={14} /> Day Complete
          </span>
        )}
        {!status?.attendance && (
          <span className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-sm font-medium px-3 py-1.5 rounded-full">
            Not clocked in
          </span>
        )}
        {status?.attendance?.status === "LATE" && (
          <span className="bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1.5 rounded-full">
            Late arrival
          </span>
        )}
        <span className="ml-auto text-sm text-gray-400">
          {status?.todayVisits ?? 0} visit{status?.todayVisits !== 1 ? "s" : ""} today
        </span>
      </div>

      {/* Alerts */}
      {(gpsError || msg) && (
        <div className={`rounded-xl p-3 text-sm mb-4 ${gpsError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {gpsError || msg}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {!status?.attendance?.clockIn && (
          <button onClick={clockIn} disabled={actionLoading}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-2xl text-lg transition disabled:opacity-50 shadow">
            <FiLogIn size={22} />
            {actionLoading ? "Getting location…" : "Clock In"}
          </button>
        )}
        {status?.isClockedIn && (
          <button onClick={clockOut} disabled={actionLoading}
            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-2xl text-lg transition disabled:opacity-50 shadow">
            <FiLogOut size={22} />
            {actionLoading ? "Getting location…" : "Clock Out"}
          </button>
        )}
        {(status?.isClockedIn) && (
          <button onClick={openVisitForm}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-2xl transition shadow">
            <FiPlus size={20} /> Log Field Visit
          </button>
        )}
        <Link href="/attendance/my-history"
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-2xl hover:bg-gray-50 transition">
          <FiList size={18} /> My History
        </Link>
      </div>

      {/* Visit Form Modal */}
      {showVisitForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowVisit(false)}>
          <div className="bg-white rounded-t-3xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Log Field Visit</h2>

            <div className="mb-3">
              <div className={`flex items-center gap-2 text-sm rounded-xl p-3 ${visitLat ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                <FiMapPin size={14} />
                {visitLat
                  ? `Location captured: ${visitLat.toFixed(5)}, ${visitLng?.toFixed(5)}`
                  : "Capturing your GPS location…"}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Client (optional)</label>
                <select
                  value={visitForm.clientId}
                  onChange={e => setVF(v => ({ ...v, clientId: e.target.value, clientName: "" }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                  <option value="">— Select client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {!visitForm.clientId && (
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Client name (if not in system)</label>
                  <input value={visitForm.clientName}
                    onChange={e => setVF(v => ({ ...v, clientName: e.target.value }))}
                    placeholder="e.g. Al Futtaim Group"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Address / Location</label>
                <input value={visitForm.address}
                  onChange={e => setVF(v => ({ ...v, address: e.target.value }))}
                  placeholder="e.g. Dubai Mall, Ground Floor"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Purpose</label>
                <input value={visitForm.purpose}
                  onChange={e => setVF(v => ({ ...v, purpose: e.target.value }))}
                  placeholder="e.g. Product demo, Follow-up, Contract signing"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Visit notes / outcome</label>
                <textarea value={visitForm.notes}
                  onChange={e => setVF(v => ({ ...v, notes: e.target.value }))}
                  rows={3} placeholder="What was discussed, next steps…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Photo (optional)</label>
                <input ref={photoRef} type="file" accept="image/*" capture="environment"
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-100 file:text-gray-700" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowVisit(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium">
                Cancel
              </button>
              <button onClick={submitVisit} disabled={visitSaving}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                {visitSaving ? "Saving…" : "Save Visit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
