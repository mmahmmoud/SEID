import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiShield, FiUser, FiBarChart2 } from "react-icons/fi";

const ROLES = ["admin", "accountant", "salesperson"];

const roleColors: Record<string, string> = {
  admin:       "bg-purple-100 text-purple-700",
  accountant:  "bg-blue-100 text-blue-700",
  salesperson: "bg-green-100 text-green-700",
};

const roleIcons: Record<string, any> = {
  admin:       <FiShield size={14} />,
  accountant:  <FiBarChart2 size={14} />,
  salesperson: <FiUser size={14} />,
};

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "accountant" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Guard: only admin can access this page
  useEffect(() => {
    if (session && (session.user as any)?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [session]);

  const fetchUsers = () => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "accountant" });
    setError("");
    setShowModal(true);
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setShowModal(false);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: any) => {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.message);
      return;
    }
    fetchUsers();
  };

  if ((session?.user as any)?.role !== "admin") return null;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">User Management</h1>
          <p className="text-gray-500 mt-1">Manage team members and their access roles</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        >
          <FiPlus size={16} /> Add User
        </button>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { role: "admin", label: "Admin", desc: "Full access to all modules including user management" },
          { role: "accountant", label: "Accountant", desc: "Access to invoices, quotations, purchases and reports" },
          { role: "salesperson", label: "Sales Person", desc: "Access to clients, quotations and invoices only" },
        ].map(({ role, label, desc }) => (
          <div key={role} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${roleColors[role]}`}>
                {roleIcons[role]} {label}
              </span>
            </div>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {["User", "Email", "Role", "Joined", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium w-fit ${roleColors[u.role] || "bg-gray-100 text-gray-600"}`}>
                      {roleIcons[u.role]} {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      {u.id !== (session?.user as any)?.id && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                  <FiUsers size={32} className="mx-auto mb-2 opacity-30" />
                  No users found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-5">{editUser ? "Edit User" : "Add New User"}</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Full Name *</label>
                <input
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Password {editUser && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editUser}
                  placeholder={editUser ? "••••••••" : "Minimum 8 characters"}
                  minLength={editUser ? undefined : 8}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium transition ${
                        form.role === r
                          ? `${roleColors[r]} border-current`
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex flex-col items-center gap-1">
                        {roleIcons[r]}
                        <span className="capitalize">{r}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-60 transition"
                >
                  {saving ? "Saving..." : editUser ? "Update User" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
