import { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import {
  FiBarChart2, FiFileText, FiUsers, FiLogOut, FiClipboard,
  FiShoppingCart, FiBox, FiPieChart, FiTruck, FiUserPlus, FiDollarSign,
  FiCreditCard, FiRefreshCw, FiCheckSquare, FiDroplet, FiMapPin,
} from "react-icons/fi";

type MenuItem = {
  title: string;
  href: string;
  icon: ReactElement;
  adminOnly?: boolean;       // only admin sees this
  salesOnly?: boolean;       // only salesperson sees this
  hiddenFromSales?: boolean; // hidden from salesperson
};
type MenuGroup = {
  label: string;
  items: MenuItem[];
  hiddenFromSales?: boolean; // entire group hidden from salesperson
};

export default function Sidebar() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isSales = role === "salesperson";

  const menuGroups: MenuGroup[] = [
    {
      label: "Main",
      hiddenFromSales: true,
      items: [
        { title: "Dashboard", href: "/dashboard", icon: <FiBarChart2 size={18} /> },
      ],
    },
    {
      label: "Attendance",
      items: [
        { title: "My Attendance", href: "/attendance",            icon: <FiMapPin size={18} /> },
        { title: "My History",    href: "/attendance/my-history", icon: <FiClipboard size={18} /> },
        { title: "Admin View",    href: "/attendance/admin",      icon: <FiUsers size={18} />, adminOnly: true },
      ],
    },
    {
      label: "Sales",
      hiddenFromSales: true,
      items: [
        { title: "Invoices",   href: "/invoices",   icon: <FiFileText size={18} /> },
        { title: "Quotations", href: "/quotations", icon: <FiClipboard size={18} /> },
        { title: "Clients",    href: "/clients",    icon: <FiUsers size={18} /> },
      ],
    },
    {
      label: "Purchasing",
      hiddenFromSales: true,
      items: [
        { title: "Purchases", href: "/purchases", icon: <FiShoppingCart size={18} /> },
        { title: "Suppliers", href: "/suppliers", icon: <FiTruck size={18} /> },
        { title: "Expenses",  href: "/expenses",  icon: <FiDollarSign size={18} /> },
      ],
    },
    {
      label: "Banking",
      hiddenFromSales: true,
      items: [
        { title: "Overview",       href: "/banking",                icon: <FiCreditCard size={18} /> },
        { title: "Accounts",       href: "/banking/accounts",       icon: <FiCreditCard size={18} /> },
        { title: "Transactions",   href: "/banking/transactions",   icon: <FiFileText size={18} /> },
        { title: "Transfers",      href: "/banking/transfers",      icon: <FiRefreshCw size={18} /> },
        { title: "Reconciliation", href: "/banking/reconciliation", icon: <FiCheckSquare size={18} /> },
      ],
    },
    {
      label: "Inventory",
      hiddenFromSales: true,
      items: [
        { title: "Products",             href: "/products",             icon: <FiBox size={18} /> },
        { title: "Inventory Log",        href: "/inventory",            icon: <FiClipboard size={18} /> },
        { title: "Material Consumption", href: "/material-consumption", icon: <FiDroplet size={18} /> },
      ],
    },
    {
      label: "Analytics",
      hiddenFromSales: true,
      items: [
        { title: "Reports",      href: "/reports",      icon: <FiPieChart size={18} /> },
        { title: "WooCommerce",  href: "/woocommerce",  icon: <FiShoppingCart size={18} /> },
      ],
    },
    {
      label: "Admin",
      hiddenFromSales: true,
      items: [
        { title: "Users", href: "/users", icon: <FiUserPlus size={18} />, adminOnly: true },
      ],
    },
  ];

  const isActive = (path: string) => router.pathname.startsWith(path);

  return (
    <div className="w-64 min-h-screen flex flex-col justify-between bg-gradient-to-b from-gray-900 to-gray-800 text-gray-200 p-4">
      <div>
        <div className="mb-6 px-2">
          <h2 className="text-xl font-bold tracking-wide text-white">🚀 SEID</h2>
          <p className="text-xs text-gray-400 mt-1">
            {isSales ? "Sales Portal" : "Business Dashboard"}
          </p>
        </div>

        <nav className="space-y-5">
          {menuGroups.map((group) => {
            // Hide entire group from salesperson if flagged
            if (isSales && group.hiddenFromSales) return null;

            const visible = group.items.filter((item) => {
              if (item.adminOnly && role !== "admin") return false;
              if (item.hiddenFromSales && isSales)   return false;
              return true;
            });

            if (visible.length === 0) return null;

            return (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-3 mb-1">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {visible.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                          isActive(item.href)
                            ? "bg-white/10 text-white shadow-inner"
                            : "hover:bg-white/5 text-gray-300"
                        }`}
                      >
                        {isActive(item.href) && (
                          <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-r" />
                        )}
                        <span className="opacity-80">{item.icon}</span>
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User info + Logout */}
      <div className="border-t border-gray-700 pt-4 space-y-2">
        {session?.user && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-white">{session.user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{role}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition"
        >
          <FiLogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
