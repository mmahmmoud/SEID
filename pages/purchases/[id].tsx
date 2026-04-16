import { GetServerSideProps } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { useRouter } from "next/router";
import { FiArrowLeft, FiCheck } from "react-icons/fi";

export default function PurchaseDetail({ purchase }: { purchase: any }) {
  const router = useRouter();

  const markReceived = async () => {
    if (!confirm("Mark as RECEIVED? Inventory will be updated.")) return;
    await fetch(`/api/purchases/${purchase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED" }),
    });
    router.replace(router.asPath);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/purchases" className="text-gray-400 hover:text-gray-600"><FiArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-3xl font-bold">Purchase Order</h1>
          {purchase.referenceNo && <p className="text-gray-500">Ref: {purchase.referenceNo}</p>}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${purchase.status === "RECEIVED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
            {purchase.status}
          </span>
          {purchase.status === "PENDING" && (
            <button onClick={markReceived} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 text-sm">
              <FiCheck size={14} /> Mark Received
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Supplier</h2>
          <p className="font-bold text-lg">{purchase.supplier.name}</p>
          {purchase.supplier.email && <p className="text-sm text-gray-500 mt-1">✉️ {purchase.supplier.email}</p>}
          {purchase.supplier.phone && <p className="text-sm text-gray-500">📞 {purchase.supplier.phone}</p>}
          {purchase.supplier.taxNumber && <p className="text-sm text-gray-500">TRN: {purchase.supplier.taxNumber}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Date</span><span>{new Date(purchase.createdAt).toLocaleDateString()}</span></div>
            <div className="flex justify-between text-gray-600"><span>Sub Total</span><span>{Number(purchase.subTotal).toFixed(2)} AED</span></div>
            <div className="flex justify-between text-gray-600"><span>Tax</span><span>{Number(purchase.tax).toFixed(2)} AED</span></div>
            {Number(purchase.deliveryFee) > 0 && (
              <div className="flex justify-between text-gray-600"><span>Delivery Fee</span><span>{Number(purchase.deliveryFee).toFixed(2)} AED</span></div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{Number(purchase.total).toFixed(2)} AED</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Items</h2>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase bg-gray-50">
            <tr>
              {["Product", "SKU", "Qty", "Unit Cost", "Tax %", "Total"].map((h) => (
                <th key={h} className="px-4 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item: any) => (
              <tr key={item.id} className="border-t border-gray-50">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.product?.sku}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{Number(item.costPrice).toFixed(2)} AED</td>
                <td className="px-4 py-3">{item.tax}%</td>
                <td className="px-4 py-3 font-semibold">{Number(item.total).toFixed(2)} AED</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {purchase.notes && (
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-2">Notes</h2>
          <p className="text-sm text-gray-600">{purchase.notes}</p>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: String(params?.id) },
    include: {
      supplier: true,
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });
  if (!purchase) return { notFound: true };
  return {
    props: {
      purchase: JSON.parse(JSON.stringify(purchase)),
    },
  };
};
