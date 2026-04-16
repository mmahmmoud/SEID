import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function CreateClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
   const formData = new FormData(e.currentTarget);
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("address", address);
    if (license) formData.append("license", license);

    const res = await fetch("/api/clients", { method: "POST", body: formData });
    setLoading(false);
    if (res.ok) router.push("/clients");
    else alert("Failed to create client");
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-xl md:text-3xl font-bold">Create Client</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <input type="text" placeholder="Name *" value={name} onChange={e => setName(e.target.value)} className="border p-2 w-full rounded" required />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border p-2 w-full rounded" />
        <input type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="border p-2 w-full rounded" />
        <input type="text" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} className="border p-2 w-full rounded" />
        <div>
          <label className="text-sm text-gray-600 block mb-1">License (optional)</label>
          <input type="file" onChange={e => setLicense(e.target.files?.[0] || null)} className="border p-2 w-full rounded" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50">
            {loading ? "Creating..." : "Create"}
          </button>
          <button type="button" onClick={() => router.push("/clients")} className="border px-4 py-2 rounded">Cancel</button>
        </div>
      </form>
    </div>
  );
}
