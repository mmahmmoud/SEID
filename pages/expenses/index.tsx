import { useState, useEffect } from "react";
import Link from "next/link";
import { FiPlus, FiTrash2, FiEdit2, FiDollarSign } from "react-icons/fi";

const CATEGORIES = ["All", "Rent", "Utilities", "Salaries", "Marketing", "Office Supplies", "Travel", "Software", "Maintenance", "Other"];

const categoryColors: Record<string, string> = {
  Rent: "bg-purple-100 text-purple-700",
  Utilities: "bg-blue-100 text-blue-700",
  Salaries: "bg-green-100 text-green-700",
  Marketing: "bg-pink-100 text-pink-700",
  "Office Supplies": "bg-yellow-100 text-yellow-700",
  Travel: "bg-indigo-100 text-indigo-700",
  Software: "bg-cyan-100 text-cyan-700",
  Maintenance: "bg-orange-100 text-orange-700",
  Other: "bg-gray-100 text-gray-600",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchExpenses = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    fetch(`/api/expenses?${params}`)
      .then((r) => r.json())
      .then((d) => { setExpenses(d.expenses || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [categoryFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    setDeleting(id);
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    fetchExpenses();
    setDeleting(null);
  };

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Expenses</h1>
          <p className="text-gray-500 mt-1">{total} records · Total: {totalAmount.toFixed(2)} AED</p>
        </div>
        <Link
          href="/expenses/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        >
          <FiPlus /> New Expense
        </Link>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === "All" ? "" : cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              (cat === "All" && !categoryFilter) || cat === categoryFilter
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {["Date", "Title", "Category", "Payment Method", "Amount", "Notes", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{expense.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColors[expense.category] || "bg-gray-100 text-gray-600"}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{expense.paymentMethod || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{Number(expense.amount).toFixed(2)} AED</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{expense.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <Link href={`/expenses/${expense.id}/edit`} className="text-gray-400 hover:text-blue-600">
                        <FiEdit2 size={15} />
                      </Link>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deleting === expense.id}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-40"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <FiDollarSign size={32} className="mx-auto mb-2 opacity-30" />
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
