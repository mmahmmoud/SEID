import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  licenseUrl?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [newLicense, setNewLicense] = useState<File | null>(null);
  const [search, setSearch] = useState("");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/clients");
      setClients(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    try {
      await axios.delete(`/api/clients/${id}`);
      fetchClients();
    } catch (error) {
      console.error(error);
      alert("Failed to delete client. They may have existing invoices.");
    }
  };

  const handleSave = async () => {
    if (!editingClient) return;
    const formData = new FormData();
    formData.append("name", editingClient.name);
    formData.append("email", editingClient.email || "");
    formData.append("phone", editingClient.phone || "");
    formData.append("address", editingClient.address || "");
    if (newLicense) formData.append("license", newLicense);

    try {
      if (editingClient.id && clients.find((c) => c.id === editingClient.id)) {
        // Update: use JSON for PUT (no file re-upload in edit modal)
        await axios.put(`/api/clients/${editingClient.id}`, {
          name: editingClient.name,
          email: editingClient.email,
          phone: editingClient.phone,
          address: editingClient.address,
        });
      } else {
        await axios.post("/api/clients", formData);
      }
      fetchClients();
      setEditingClient(null);
      setNewLicense(null);
    } catch (error) {
      console.error(error);
      alert("Failed to save client");
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold">Clients</h1>
        <div className="flex gap-3">
          <input
            type="text" placeholder="Search..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="border p-2 rounded text-sm focus:ring-2 focus:ring-purple-400 outline-none"
          />
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
            onClick={() => setEditingClient({ id: "", name: "", email: "", phone: "", address: "" })}
          >
            + Add Client
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Address</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">License</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.length > 0 ? filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium">{client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{client.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{client.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{client.address || "—"}</td>
                  <td className="px-4 py-3">
                    {client.licenseUrl ? (
                      <a href={client.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-sm">View</a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button className="px-3 py-1 bg-yellow-400 rounded hover:bg-yellow-500 text-sm" onClick={() => setEditingClient(client)}>Edit</button>
                    <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm" onClick={() => handleDelete(client.id)}>Delete</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 italic">No clients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
            <h2 className="text-xl font-bold mb-4">{editingClient.id ? "Edit" : "Add"} Client</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Name *" className="border p-2 rounded w-full" value={editingClient.name}
                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} />
              <input type="email" placeholder="Email" className="border p-2 rounded w-full" value={editingClient.email || ""}
                onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })} />
              <input type="tel" placeholder="Phone" className="border p-2 rounded w-full" value={editingClient.phone || ""}
                onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} />
              <input type="text" placeholder="Address" className="border p-2 rounded w-full" value={editingClient.address || ""}
                onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })} />
              {!editingClient.id && (
                <div>
                  <label className="text-sm text-gray-500 block mb-1">License (optional)</label>
                  <input type="file" onChange={(e) => setNewLicense(e.target.files?.[0] || null)} className="border p-2 rounded w-full" />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-4 py-2 border rounded hover:bg-gray-50" onClick={() => { setEditingClient(null); setNewLicense(null); }}>Cancel</button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" onClick={handleSave}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
