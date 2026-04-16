import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FiCheckCircle, FiAlertCircle, FiClock, FiZap, FiRefreshCw } from "react-icons/fi";

function fmt(n: number) { return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? "bg-green-100 text-green-700 border-green-200"
    : score >= 60 ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-red-100 text-red-600 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {score >= 90 && <FiZap size={10} />}{score}
    </span>
  );
}

export default function ReconciliationPage() {
  const router = useRouter();
  const { txId: preselectedTxId } = router.query;

  const [unmatchedTxs, setUnmatchedTxs] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [matchAmt, setMatchAmt] = useState("");
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accFilter, setAccFilter] = useState("");

  const loadUnmatched = async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: "unmatched", limit: "100" });
    if (accFilter) params.set("bankAccountId", accFilter);
    const [txRes, accRes] = await Promise.all([
      fetch(`/api/banking/transactions?${params}`).then((r) => r.json()),
      fetch("/api/banking/accounts").then((r) => r.json()),
    ]);
    const all = [...(txRes.transactions || [])];
    // Also get partial
    const pParams = new URLSearchParams({ status: "partial", limit: "100" });
    if (accFilter) pParams.set("bankAccountId", accFilter);
    const partRes = await fetch(`/api/banking/transactions?${pParams}`).then((r) => r.json());
    all.push(...(partRes.transactions || []));
    setUnmatchedTxs(all);
    setAccounts(Array.isArray(accRes) ? accRes : []);
    setLoading(false);
  };

  useEffect(() => { loadUnmatched(); }, [accFilter]);

  useEffect(() => {
    if (preselectedTxId && unmatchedTxs.length > 0) {
      const tx = unmatchedTxs.find((t) => t.id === preselectedTxId);
      if (tx) selectTx(tx);
    }
  }, [preselectedTxId, unmatchedTxs]);

  const selectTx = async (tx: any) => {
    setSelectedTx(tx);
    setMatchAmt(String(tx.remainingAmount));
    setLoadingSuggestions(true);
    setSuggestions([]);
    const res = await fetch(`/api/banking/suggestions?bankTransactionId=${tx.id}`);
    const data = await res.json();
    setSuggestions(Array.isArray(data) ? data : []);
    setLoadingSuggestions(false);
  };

  const refreshSuggestions = async () => {
    if (!selectedTx) return;
    setLoadingSuggestions(true);
    const res = await fetch(`/api/banking/suggestions?bankTransactionId=${selectedTx.id}&refresh=1`);
    const data = await res.json();
    setSuggestions(Array.isArray(data) ? data : []);
    setLoadingSuggestions(false);
  };

  const handleMatch = async (suggestion: any) => {
    const amt = parseFloat(matchAmt);
    if (!amt || amt <= 0) return alert("Enter a valid amount");
    setMatchingId(suggestion.entityId || suggestion.entity?.id);
    const res = await fetch("/api/banking/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankTransactionId: selectedTx.id,
        entityType: suggestion.entityType,
        entityId: suggestion.entityId || suggestion.entity?.id,
        matchedAmount: amt,
      }),
    });
    const data = await res.json();
    setMatchingId(null);
    if (res.ok) {
      await loadUnmatched();
      setSelectedTx(null);
      setSuggestions([]);
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Reconciliation</h1>
          <p className="text-gray-500 mt-1">{unmatchedTxs.length} transactions need attention</p>
        </div>
        <select value={accFilter} onChange={(e) => setAccFilter(e.target.value)}
          className="border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
          <option value="">All Accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: unmatched transactions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Unmatched / Partial Transactions</h2>
          {loading ? <p className="text-gray-400 text-sm">Loading...</p> : (
            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {unmatchedTxs.map((tx) => (
                <button key={tx.id} onClick={() => selectTx(tx)}
                  className={`w-full text-left p-4 rounded-2xl border transition ${selectedTx?.id === tx.id ? "border-blue-400 bg-blue-50 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(tx.date).toLocaleDateString()} · {tx.bankAccount?.name}
                        {tx.reference && <span className="ml-1 font-mono">{tx.reference}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "credit" ? "+" : "−"}{fmt(tx.amount)}
                      </p>
                      {tx.status === "partial" && (
                        <p className="text-xs text-yellow-600">Remaining: {fmt(tx.remainingAmount)}</p>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${tx.status === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {unmatchedTxs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <FiCheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                  <p>All transactions are matched!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: suggestions panel */}
        <div>
          {!selectedTx ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 h-64 flex items-center justify-center">
              <div>
                <FiAlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a transaction to see matching suggestions</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {/* Selected tx info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{selectedTx.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(selectedTx.date).toLocaleDateString()} · {selectedTx.bankAccount?.name}</p>
                  </div>
                  <p className={`font-bold text-lg ${selectedTx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                    {selectedTx.type === "credit" ? "+" : "−"}{fmt(selectedTx.amount)} AED
                  </p>
                </div>
                {selectedTx.status === "partial" && (
                  <p className="text-xs text-yellow-600 mt-2 font-medium">Remaining unmatched: {fmt(selectedTx.remainingAmount)} AED</p>
                )}
                <div className="mt-3">
                  <label className="text-xs text-gray-500 block mb-1">Amount to match (AED)</label>
                  <input type="number" step="0.01" value={matchAmt} onChange={(e) => setMatchAmt(e.target.value)}
                    max={selectedTx.remainingAmount}
                    className="w-40 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  <span className="text-xs text-gray-400 ml-2">of {fmt(selectedTx.remainingAmount)} remaining</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  {loadingSuggestions ? "Finding matches..." : `${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""}`}
                </h3>
                <button onClick={refreshSuggestions} disabled={loadingSuggestions}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <FiRefreshCw size={11} className={loadingSuggestions ? "animate-spin" : ""} /> Refresh
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {loadingSuggestions && (
                  <div className="text-center py-8 text-gray-400 text-sm">Analysing transactions...</div>
                )}
                {!loadingSuggestions && suggestions.map((s) => {
                  const ent = s.entity || s;
                  const isMatching = matchingId === (s.entityId || ent.id);
                  return (
                    <div key={s.id || s.entityId}
                      className={`border rounded-xl p-4 transition ${s.score >= 90 ? "border-green-200 bg-green-50" : s.score >= 60 ? "border-yellow-200 bg-yellow-50" : "border-gray-100 bg-gray-50"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ScoreBadge score={Math.round(s.score)} />
                            {s.score >= 90 && <span className="text-xs text-green-700 font-medium flex items-center gap-1"><FiZap size={10} /> Auto-match ready</span>}
                          </div>
                          <p className="font-medium text-gray-900 mt-1 text-sm">{ent.label || ent.entityRef}</p>
                          <p className="text-xs text-gray-500">{ent.name} · {ent.date ? new Date(ent.date).toLocaleDateString() : ""}</p>
                        </div>
                        <p className="font-bold text-gray-800 ml-2 flex-shrink-0">{fmt(ent.amount || ent.entityAmount || 0)} AED</p>
                      </div>
                      {/* Score breakdown */}
                      {s.breakdown && (
                        <div className="flex gap-2 flex-wrap mb-3">
                          {Object.entries(s.breakdown).map(([k, v]: any) => v > 0 && (
                            <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                              {k}: +{v}
                            </span>
                          ))}
                        </div>
                      )}
                      <button onClick={() => handleMatch(s)} disabled={isMatching}
                        className={`w-full py-2 rounded-xl text-sm font-medium transition ${s.score >= 90 ? "bg-green-600 text-white hover:bg-green-700" : "bg-blue-600 text-white hover:bg-blue-700"} disabled:opacity-60`}>
                        {isMatching ? "Matching..." : `Match ${fmt(parseFloat(matchAmt) || 0)} AED`}
                      </button>
                    </div>
                  );
                })}
                {!loadingSuggestions && suggestions.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <p>No suggestions found.</p>
                    <p className="mt-1 text-xs">Make sure there are unpaid invoices or expenses with similar amounts.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
