import { prisma } from "@/lib/prisma";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

// نحدد النوع يدوياً
interface EditClientProps {
  client: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    [key: string]: any; // لو فيه خصائص إضافية
  };
}

export default function EditClient({ client }: EditClientProps) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [company, setCompany] = useState(client.company || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, company }),
    });
    router.push("/clients");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Edit Client</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="border p-2 rounded" />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="border p-2 rounded" />
        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="border p-2 rounded" />
        <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company" className="border p-2 rounded" />
        <button type="submit" className="bg-blue-600 text-white py-2 rounded">Save</button>
      </form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = String(params?.id);
  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) return { notFound: true };

  return { props: { client: JSON.parse(JSON.stringify(client)) } };
};