import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

export default function Dashboard({ stats, monthlyChart, lowStockItems }: any) {

  const currencyFormatter = (value: any, name?: any): [string, string] => {
    const val = Number(value ?? 0);
    return [`${val.toFixed(2)} AED`, name ?? ""];
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome back — here's your business overview</p>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card title="Total Sales" value={`${stats.totalSales.toFixed(2)} AED`} color="blue" icon="💰" sub={`${stats.paidInvoices} paid invoices`} />
        <Card title="Total Purchases" value={`${stats.totalPurchases.toFixed(2)} AED`} color="yellow" icon="🛒" sub={`${stats.receivedPurchases} received`} />
        <Card title="Net Profit" value={`${stats.netProfit.toFixed(2)} AED`} color={stats.netProfit >= 0 ? "green" : "red"} icon="📈" sub={`Margin: ${stats.profitMargin.toFixed(1)}%`} />
        <Card title="Inventory Value" value={`${stats.inventoryValue.toFixed(2)} AED`} color="purple" icon="📦" sub={`${stats.totalProducts} products`} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Total Invoices" value={stats.totalInvoices} color="blue" icon="📄" />
        <Card title="Total Clients" value={stats.totalClients} color="blue" icon="👥" />
        <Card title="Quotations" value={stats.totalQuotations} color="green" icon="📋" />
        <Card title="Low Stock Alerts" value={stats.lowStockCount} color={stats.lowStockCount > 0 ? "red" : "green"} icon={stats.lowStockCount > 0 ? "⚠️" : "✅"} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Monthly Revenue (AED)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyChart}>
              <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={currencyFormatter} contentStyle={{ borderRadius: "10px", border: "none" }} />
              <Bar dataKey="sales" name="Sales" radius={[4,4,0,0]} fill="#6366f1" />
              <Bar dataKey="purchases" name="Purchases" radius={[4,4,0,0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Monthly Net Profit (AED)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={currencyFormatter} contentStyle={{ borderRadius: "10px", border: "none" }} />
              <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-red-600">⚠️ Low Stock Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center bg-red-50 border border-red-100 rounded-xl p-3">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                </div>
                <span className="text-red-700 font-bold">{p.stockQuantity} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value, color, icon, sub }: { title: string; value: any; color: string; icon?: string; sub?: string }) {
  const colors: Record<string, string> = {
    blue:   "from-blue-500/10 to-blue-100 text-blue-700",
    green:  "from-green-500/10 to-green-100 text-green-700",
    yellow: "from-yellow-500/10 to-yellow-100 text-yellow-700",
    purple: "from-purple-500/10 to-purple-100 text-purple-700",
    red:    "from-red-500/10 to-red-100 text-red-700",
  };
  return (
    <div className="relative p-5 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors[color] || colors.blue} opacity-20`} />
      <div className="relative flex items-center justify-between">
        <div>
          <h2 className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{title}</h2>
          <p className="text-xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {icon && <div className="p-3 bg-gray-100 rounded-xl text-lg">{icon}</div>}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [invoices, clients, quotations, purchases, products] = await Promise.all([
    prisma.invoice.findMany({ select: { total: true, tax: true, status: true, createdAt: true } }),
    prisma.client.findMany({ select: { id: true } }),
    prisma.quotation.findMany({ select: { id: true, status: true } }),
    prisma.purchase.findMany({ select: { total: true, tax: true, status: true, createdAt: true } }),
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true, stockQuantity: true, costPrice: true, lowStockAlert: true, unit: true } }),
  ]);

  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const receivedPurchases = purchases.filter((p) => p.status === "RECEIVED");

  const totalSales = paidInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPurchases = receivedPurchases.reduce((s, p) => s + Number(p.total), 0);
  const netProfit = totalSales - totalPurchases;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
  const inventoryValue = products.reduce((s, p) => s + p.stockQuantity * p.costPrice, 0);
  const lowStockItems = products.filter((p) => p.stockQuantity <= p.lowStockAlert);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyChart = monthNames.map((month, idx) => {
    const mInvoices = invoices.filter((i) => {
      const d = new Date(i.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === idx && i.status === "PAID";
    });
    const mPurchases = purchases.filter((p) => {
      const d = new Date(p.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === idx && p.status === "RECEIVED";
    });
    const sales = mInvoices.reduce((s, i) => s + Number(i.total), 0);
    const purch = mPurchases.reduce((s, p) => s + Number(p.total), 0);
    return { month, sales, purchases: purch, profit: sales - purch };
  });

  return {
    props: {
      stats: {
        totalSales,
        totalPurchases,
        netProfit,
        profitMargin,
        inventoryValue,
        paidInvoices: paidInvoices.length,
        receivedPurchases: receivedPurchases.length,
        totalInvoices: invoices.length,
        totalClients: clients.length,
        totalQuotations: quotations.length,
        totalProducts: products.length,
        lowStockCount: lowStockItems.length,
      },
      monthlyChart,
      lowStockItems,
    },
  };
};