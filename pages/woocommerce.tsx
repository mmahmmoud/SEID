import { useState, useEffect } from "react";

interface WebhookResult {
  topic: string;
  status: string;
  id: number;
}

interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  message: string;
}

interface Webhook {
  id: number;
  name: string;
  topic: string;
  status: string;
  delivery_url: string;
}

export default function WooCommercePage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<WebhookResult[] | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncDays, setSyncDays] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function fetchWebhooks() {
    try {
      const res = await fetch("/api/woocommerce/setup-webhooks");
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
    } catch {
      setWebhooks([]);
    }
  }

  async function setupWebhooks() {
    setLoading(true);
    setError("");
    setSetupResult(null);
    try {
      const res = await fetch("/api/woocommerce/setup-webhooks", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSetupResult(data.results);
      await fetchWebhooks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runSync() {
    setLoading(true);
    setError("");
    setSyncResult(null);
    const after = new Date(Date.now() - syncDays * 24 * 60 * 60 * 1000).toISOString();
    try {
      const res = await fetch("/api/woocommerce/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ after, status: "any" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSyncResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const erpHooks = webhooks.filter((w) =>
    w.delivery_url?.includes("/api/woocommerce/webhook")
  );

  const allTopicsActive =
    ["order.created", "order.updated", "order.deleted"].every((t) =>
      erpHooks.some((h) => h.topic === t && h.status === "active")
    );

  return (
    <main className="flex-1 p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">WooCommerce Integration</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Connect sejf.ae orders → ERP invoices automatically
          </p>
        </div>

        {/* Status banner */}
        <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${allTopicsActive ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${allTopicsActive ? "bg-green-500" : "bg-yellow-400"}`} />
          <span className={`text-sm font-medium ${allTopicsActive ? "text-green-800" : "text-yellow-800"}`}>
            {allTopicsActive
              ? "Webhooks active — orders will sync automatically"
              : "Webhooks not fully configured — click Setup below"}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Webhook setup */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Webhook Setup</h2>
          <p className="text-sm text-gray-500 mb-4">
            Registers order.created, order.updated, and order.deleted webhooks on sejf.ae
          </p>

          <button
            onClick={setupWebhooks}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition"
          >
            {loading ? "Working…" : "Setup / Verify Webhooks"}
          </button>

          {setupResult && (
            <div className="mt-4 space-y-2">
              {setupResult.map((r) => (
                <div key={r.topic} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${r.status === "created" ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-gray-700">{r.topic}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${r.status === "created" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Current webhooks list */}
          {erpHooks.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Active ERP webhooks</p>
              <div className="space-y-2">
                {erpHooks.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${h.status === "active" ? "bg-green-400" : "bg-gray-300"}`} />
                    <span>{h.topic}</span>
                    <span className="ml-auto text-xs text-gray-400">#{h.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Manual sync */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Manual Sync</h2>
          <p className="text-sm text-gray-500 mb-4">
            Pull recent orders from WooCommerce and create missing invoices. Use this for initial setup or to recover missed webhooks.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600">Sync last</label>
            <select
              value={syncDays}
              onChange={(e) => setSyncDays(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
            <label className="text-sm text-gray-600">of orders</label>
          </div>

          <button
            onClick={runSync}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition"
          >
            {loading ? "Syncing…" : "Run Sync Now"}
          </button>

          {syncResult && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm">
              <p className="font-medium text-gray-700">{syncResult.message}</p>
              {syncResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {syncResult.errors.map((e, i) => (
                    <p key={i} className="text-red-600 text-xs">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Environment variables guide */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Required .env Variables</h2>
          <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono text-green-400 space-y-1">
            <p># WooCommerce REST API</p>
            <p>WOOCOMMERCE_URL=https://sejf.ae</p>
            <p>WOOCOMMERCE_KEY=ck_your_key_here</p>
            <p>WOOCOMMERCE_SECRET=cs_your_secret_here</p>
            <p className="mt-2"># Webhook signature verification (set any random string)</p>
            <p>WOOCOMMERCE_WEBHOOK_SECRET=your_random_secret_here</p>
            <p className="mt-2"># Your ERP public URL (used for webhook delivery URL)</p>
            <p>NEXT_PUBLIC_BASE_URL=https://your-erp-domain.com</p>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Never commit your .env file. Add it to .gitignore.
          </p>
        </div>
      </main>
  );
}
