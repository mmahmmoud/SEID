import { type ReactElement, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import {
  FiBarChart2, FiFileText, FiUsers, FiLogOut, FiClipboard,
  FiShoppingCart, FiBox, FiPieChart, FiTruck, FiUserPlus, FiDollarSign,
  FiCreditCard, FiRefreshCw, FiCheckSquare, FiDroplet, FiMapPin,
  FiMenu, FiX,
} from "react-icons/fi";

type MenuItem = {
  title: string; href: string; icon: ReactElement;
  adminOnly?: boolean; hiddenFromSales?: boolean;
};
type MenuGroup = {
  label: string; items: MenuItem[]; hiddenFromSales?: boolean;
};

export default function Sidebar() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isSales = role === "salesperson";
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [router.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const menuGroups: MenuGroup[] = [
    { label: "Main", hiddenFromSales: true, items: [
      { title: "Dashboard", href: "/dashboard", icon: <FiBarChart2 size={18} /> },
    ]},
    { label: "Attendance", items: [
      { title: "My Attendance", href: "/attendance",            icon: <FiMapPin size={18} /> },
      { title: "My History",    href: "/attendance/my-history", icon: <FiClipboard size={18} /> },
      { title: "Admin View",    href: "/attendance/admin",      icon: <FiUsers size={18} />, adminOnly: true },
    ]},
    { label: "Sales", hiddenFromSales: true, items: [
      { title: "Invoices",   href: "/invoices",   icon: <FiFileText size={18} /> },
      { title: "Quotations", href: "/quotations", icon: <FiClipboard size={18} /> },
      { title: "Clients",    href: "/clients",    icon: <FiUsers size={18} /> },
    ]},
    { label: "Purchasing", hiddenFromSales: true, items: [
      { title: "Purchases", href: "/purchases", icon: <FiShoppingCart size={18} /> },
      { title: "Suppliers", href: "/suppliers", icon: <FiTruck size={18} /> },
      { title: "Expenses",  href: "/expenses",  icon: <FiDollarSign size={18} /> },
    ]},
    { label: "Banking", hiddenFromSales: true, items: [
      { title: "Overview",       href: "/banking",                icon: <FiCreditCard size={18} /> },
      { title: "Accounts",       href: "/banking/accounts",       icon: <FiCreditCard size={18} /> },
      { title: "Transactions",   href: "/banking/transactions",   icon: <FiFileText size={18} /> },
      { title: "Transfers",      href: "/banking/transfers",      icon: <FiRefreshCw size={18} /> },
      { title: "Reconciliation", href: "/banking/reconciliation", icon: <FiCheckSquare size={18} /> },
    ]},
    { label: "Inventory", hiddenFromSales: true, items: [
      { title: "Products",             href: "/products",             icon: <FiBox size={18} /> },
      { title: "Inventory Log",        href: "/inventory",            icon: <FiClipboard size={18} /> },
      { title: "Material Consumption", href: "/material-consumption", icon: <FiDroplet size={18} /> },
    ]},
    { label: "Analytics", hiddenFromSales: true, items: [
      { title: "Reports",     href: "/reports",     icon: <FiPieChart size={18} /> },
      { title: "WooCommerce", href: "/woocommerce", icon: <FiShoppingCart size={18} /> },
    ]},
    { label: "Admin", hiddenFromSales: true, items: [
      { title: "Users", href: "/users", icon: <FiUserPlus size={18} />, adminOnly: true },
    ]},
  ];

  const isActive = (path: string) => router.pathname.startsWith(path);

  const NavContent = () => (
    <>
      <div className="mb-6 px-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-white">🚀 SEID</h2>
          <p className="text-xs text-gray-400 mt-1">{isSales ? "Sales Portal" : "Business Dashboard"}</p>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
          <FiX size={22} />
        </button>
      </div>

      <nav className="space-y-5 flex-1 overflow-y-auto">
        {menuGroups.map((group) => {
          if (isSales && group.hiddenFromSales) return null;
          const visible = group.items.filter(item => {
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
                    <Link href={item.href}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                        isActive(item.href)
                          ? "bg-white/10 text-white shadow-inner"
                          : "hover:bg-white/5 text-gray-300"
                      }`}>
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

      <div className="border-t border-gray-700 pt-4 space-y-2 mt-4">
        {session?.user && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-white">{session.user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{role}</p>
          </div>
        )}
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition">
          <FiLogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-gray-900 shadow-lg">
        <span className="text-white font-bold text-lg">🚀 SEID</span>
        <button onClick={() => setOpen(true)} className="text-gray-300 hover:text-white p-1">
          <FiMenu size={26} />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col p-4 overflow-y-auto shadow-2xl">
            <NavContent />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex lg:flex-col w-64 min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-200 p-4 sticky top-0 h-screen overflow-y-auto flex-shrink-0">
        <NavContent />
      </div>
    </>
  );
}
