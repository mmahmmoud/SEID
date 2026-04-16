import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiGrid } from "react-icons/fi";

type Item = { description: string; quantity: number; unitPrice: number; tax: number };
type Section = { id: string; title: string; items: Item[] };

const emptyItem = (): Item => ({ description: "", quantity: 1, unitPrice: 0, tax: 0 });

const sectionSubtotal = (section: Section) =>
  section.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

const sectionTax = (section: Section) =>
  section.items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.tax / 100), 0);

const sectionTotal = (section: Section) => sectionSubtotal(section) + sectionTax(section);

export default function CreateQuotation() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [sections, setSections] = useState<Section[]>([
    { id: crypto.randomUUID(), title: "General", items: [emptyItem()] },
  ]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const newSectionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []));
  }, []);

  // ── Section helpers ────────────────────────────────────────────────────────
  const addSection = () => {
    const id = crypto.randomUUID();
    setSections((prev) => [...prev, { id, title: "", items: [emptyItem()] }]);
    setTimeout(() => newSectionRef.current?.focus(), 50);
  };

  const removeSection = (sid: string) => {
    if (sections.length === 1) return alert("At least one section is required.");
    setSections((prev) => prev.filter((s) => s.id !== sid));
  };

  const updateSectionTitle = (sid: string, title: string) => {
    setSections((prev) => prev.map((s) => (s.id === sid ? { ...s, title } : s)));
  };

  const toggleCollapse = (sid: string) =>
    setCollapsed((prev) => ({ ...prev, [sid]: !prev[sid] }));

  // ── Item helpers ───────────────────────────────────────────────────────────
  const addItem = (sid: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === sid ? { ...s, items: [...s.items, emptyItem()] } : s))
    );

  const removeItem = (sid: string, idx: number) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid ? { ...s, items: s.items.filter((_, i) => i !== idx) } : s
      )
    );

  const updateItem = (sid: string, idx: number, field: keyof Item, value: any) =>
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sid) return s;
        const items = [...s.items];
        items[idx] = {
          ...items[idx],
          [field]: field === "description" ? value : parseFloat(value) || 0,
        };
        return { ...s, items };
      })
    );

  // ── Totals ─────────────────────────────────────────────────────────────────
  const grandSubtotal = sections.reduce((s, sec) => s + sectionSubtotal(sec), 0);
  const grandTax      = sections.reduce((s, sec) => s + sectionTax(sec), 0);
  const grandTotal    = grandSubtotal + grandTax;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedClient) return alert("Please select a client");

    // Flatten sections into items, embedding section name and sortOrder
    const items: any[] = [];
    sections.forEach((sec, sIdx) => {
      sec.items.forEach((item, iIdx) => {
        items.push({
          name: item.description || "Item",
          quantity: item.quantity,
          price: item.unitPrice,
          tax: item.tax,
          section: sec.title || `Section ${sIdx + 1}`,
          sortOrder: sIdx * 1000 + iIdx,
        });
      });
    });

    setSubmitting(true);
    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selectedClient, items }),
    });
    setSubmitting(false);
    if (res.ok) router.push("/quotations");
    else { const d = await res.json(); alert(d.message || "Failed to create quotation"); }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/quotations" className="text-gray-400 hover:text-gray-600">← Back</Link>
        <h1 className="text-3xl font-bold">Create Quotation</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Client *</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="border border-gray-200 p-2.5 rounded-xl w-full md:w-80 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            required
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.email ? ` (${c.email})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Sections */}
        {sections.map((section, sIdx) => (
          <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-white border-b border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {sIdx + 1}
              </div>
              <input
                ref={sIdx === sections.length - 1 ? newSectionRef : undefined}
                type="text"
                value={section.title}
                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                placeholder="Section name (e.g. Bathroom, Bedroom, Hall…)"
                className="flex-1 text-base font-semibold text-gray-800 bg-transparent border-0 border-b-2 border-dashed border-purple-200 focus:outline-none focus:border-purple-500 pb-0.5 placeholder:font-normal placeholder:text-sm placeholder:text-gray-400"
              />
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-sm font-semibold text-purple-700 mr-2">
                  {sectionTotal(section).toFixed(2)} AED
                </span>
                <button type="button" onClick={() => toggleCollapse(section.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  {collapsed[section.id] ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
                </button>
                {sections.length > 1 && (
                  <button type="button" onClick={() => removeSection(section.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                    <FiTrash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Items Table */}
            {!collapsed[section.id] && (
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs uppercase">
                      <th className="pb-2 text-left pr-3 font-semibold">Item Description</th>
                      <th className="pb-2 text-left pr-3 font-semibold w-20">Qty</th>
                      <th className="pb-2 text-left pr-3 font-semibold w-32">Unit Price</th>
                      <th className="pb-2 text-left pr-3 font-semibold w-20">Tax %</th>
                      <th className="pb-2 text-right font-semibold w-28">Amount</th>
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, iIdx) => {
                      const amount = item.quantity * item.unitPrice * (1 + item.tax / 100);
                      return (
                        <tr key={iIdx} className="group">
                          <td className="pr-3 py-1.5">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(section.id, iIdx, "description", e.target.value)}
                              placeholder="Describe the item…"
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                            />
                          </td>
                          <td className="pr-3 py-1.5">
                            <input
                              type="number" min="0.01" step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(section.id, iIdx, "quantity", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                            />
                          </td>
                          <td className="pr-3 py-1.5">
                            <input
                              type="number" min="0" step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(section.id, iIdx, "unitPrice", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                            />
                          </td>
                          <td className="pr-3 py-1.5">
                            <input
                              type="number" min="0" max="100" step="0.01"
                              value={item.tax}
                              onChange={(e) => updateItem(section.id, iIdx, "tax", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                            />
                          </td>
                          <td className="py-1.5 text-right font-medium text-gray-700">
                            {amount.toFixed(2)} AED
                          </td>
                          <td className="py-1.5 pl-2">
                            {section.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(section.id, iIdx)}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Add Item + Section Subtotal */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-gray-100">
                  <button
                    type="button"
                    onClick={() => addItem(section.id)}
                    className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    <FiPlus size={14} /> Add Item
                  </button>
                  <div className="text-right text-sm space-y-0.5">
                    <div className="flex gap-6 text-gray-500">
                      <span>Section Subtotal:</span>
                      <span className="font-medium text-gray-700">{sectionSubtotal(section).toFixed(2)} AED</span>
                    </div>
                    {sectionTax(section) > 0 && (
                      <div className="flex gap-6 text-gray-400">
                        <span>Tax:</span>
                        <span>{sectionTax(section).toFixed(2)} AED</span>
                      </div>
                    )}
                    <div className="flex gap-6 font-bold text-purple-700 text-base">
                      <span>Section Total:</span>
                      <span>{sectionTotal(section).toFixed(2)} AED</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Section Button */}
        <button
          type="button"
          onClick={addSection}
          className="w-full py-3 border-2 border-dashed border-purple-200 rounded-2xl text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition text-sm font-medium flex items-center justify-center gap-2"
        >
          <FiGrid size={16} /> Add New Section (e.g. Bathroom, Bedroom, Hall…)
        </button>

        {/* Grand Total */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              {sections.map((sec, i) => (
                <div key={sec.id} className="flex justify-between text-gray-500">
                  <span>{sec.title || `Section ${i + 1}`}</span>
                  <span>{sectionTotal(sec).toFixed(2)} AED</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>{grandSubtotal.toFixed(2)} AED</span>
                </div>
                {grandTax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Total Tax</span><span>{grandTax.toFixed(2)} AED</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl text-gray-900 border-t pt-2">
                  <span>TOTAL</span><span>{grandTotal.toFixed(2)} AED</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => router.push("/quotations")}
              className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create Quotation"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
