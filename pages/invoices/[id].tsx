import { prisma } from "@/lib/prisma";
import { useRouter } from "next/router";
import { useState } from "react";

export default function InvoicePage({ invoice }: any) {
  const router = useRouter();
  const [inv, setInv] = useState(invoice);

  const handleMarkPaid = async () => {
    const res = await fetch(`/api/invoices/${inv.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    if (res.ok) {
      const data = await res.json();
      setInv({ ...inv, status: data.status || "PAID" });
      alert("Invoice marked as PAID");
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => window.print()}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Print / PDF
        </button>
        <button onClick={() => router.back()} className="border px-4 py-2 rounded">
          Back
        </button>
        {inv.status !== "PAID" && (
          <button
            onClick={handleMarkPaid}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Mark as Paid
          </button>
        )}
      </div>

      {/* Invoice card */}
      <div className="relative bg-white shadow max-w-4xl mx-auto p-8 overflow-hidden">
        <img
          src="/letterhead.jpg"
          className="absolute top-0 left-0 w-full opacity-10 print:block hidden"
          alt="letterhead"
        />

        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-6">Invoice</h1>

          <div className="flex justify-between mb-6">
            <div>
              <p className="font-bold">{inv.client.name}</p>
              <p>{inv.client.email}</p>
              <p>{inv.client.phone}</p>
            </div>
            <div className="text-right">
              <p>#{inv.id.slice(0, 8).toUpperCase()}</p>
              <p>{new Date(inv.createdAt).toLocaleDateString()}</p>
              <p>
                Status:{" "}
                <span
                  className={`font-semibold ${
                    inv.status === "PAID" ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {inv.status}
                </span>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-3">Item</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Price</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item: any) => (
                <tr key={item.id} className="bg-gray-50 shadow-sm rounded">
                  <td className="p-3">{item.name}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{Number(item.price).toFixed(2)} AED</td>
                  <td className="p-3 font-semibold text-purple-600">
                    {(item.quantity * Number(item.price)).toFixed(2)} AED
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="text-right mt-6">
            <p>Subtotal: {Number(inv.subTotal).toFixed(2)} AED</p>
            <p>Tax: {Number(inv.tax).toFixed(2)} AED</p>
            <p className="text-xl font-bold">Total: {Number(inv.total).toFixed(2)} AED</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }: any) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { client: true, items: true },
  });

  if (!invoice) return { notFound: true };

  return {
    props: {
      invoice: JSON.parse(JSON.stringify(invoice)),
    },
  };
}
