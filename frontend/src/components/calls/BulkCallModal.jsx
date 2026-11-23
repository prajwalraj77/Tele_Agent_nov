// ============================================================
// BULK CALL MODAL
// ============================================================
// Glassmorphism modal for initiating bulk dial campaigns.
// ============================================================

import { useEffect, useState } from "react";

function BulkCallModal({
  open,
  onClose,
  onStart,
}) {
  const [campaignName, setCampaignName] = useState("");
  const [phoneNumbersText, setPhoneNumbersText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedNumbers, setParsedNumbers] = useState([]);
  const [invalidNumbers, setInvalidNumbers] = useState([]);

  useEffect(() => {
    if (!phoneNumbersText.trim()) {
      setParsedNumbers([]);
      setInvalidNumbers([]);
      return;
    }

    const rawNumbers = phoneNumbersText
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const valid = [];
    const invalid = [];

    for (const raw of rawNumbers) {
      const digits = raw.replace(/\D/g, "");
      let normalized = null;
      
      if (/^91\d{10}$/.test(digits)) {
        normalized = digits;
      } else if (/^\+91\d{10}$/.test(raw.trim())) {
        normalized = digits.slice(2);
      } else if (/^\d{10}$/.test(digits)) {
        normalized = `91${digits}`;
      } else if (/^0\d{10}$/.test(digits)) {
        normalized = digits.slice(1);
      }

      if (normalized && normalized.length === 12 && normalized.startsWith("91")) {
        valid.push({ original: raw, normalized });
      } else {
        invalid.push({ original: raw, reason: "Invalid Indian mobile number format" });
      }
    }

    setParsedNumbers(valid);
    setInvalidNumbers(invalid);
  }, [phoneNumbersText]);

  useEffect(() => {
    setError("");
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (parsedNumbers.length === 0) {
      setError("Please enter at least one valid phone number");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await onStart({
        name: campaignName || "Bulk Dial Campaign",
        phoneNumbers: phoneNumbersText,
        config: {
          maxRetries: 1,
          retryDelayMs: 5000,
          callTimeoutMs: 30000,
          gapBetweenCallsMs: 5000,
        },
      });
    } catch (err) {
      setError(err.message || "Unable to start bulk campaign");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onMouseDown={onClose}
    >
      <div
        className="absolute inset-0 backdrop-blur-xl bg-black/40 transition-opacity"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-2xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 max-h-[90vh] flex flex-col"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <div className="p-6 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Bulk Dial Campaign
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Paste multiple phone numbers (one per line, comma, or semicolon separated)
              </p>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur border border-white/20 text-slate-300 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="mb-4">
              <label
                htmlFor="campaignName"
                className="block mb-2 text-sm font-medium text-slate-200"
              >
                Campaign Name (optional)
              </label>
              <input
                id="campaignName"
                type="text"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="e.g., Morning Sales Campaign"
                className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white/10 transition-all"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="phoneNumbers"
                className="block mb-2 text-sm font-medium text-slate-200"
              >
                Phone Numbers
                <span className="text-slate-400 font-normal ml-2">
                  ({parsedNumbers.length} valid, {invalidNumbers.length} invalid)
                </span>
              </label>
              <textarea
                id="phoneNumbers"
                value={phoneNumbersText}
                onChange={(event) => setPhoneNumbersText(event.target.value)}
                placeholder="+91 81979 83277\n918197983278\n8197983279\n08197983280\n+91-81979-83281"
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white/10 transition-all font-mono text-sm resize-none"
              />
            </div>

            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-slate-300 mb-1 font-medium">Supported formats:</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400 font-mono">
                <span className="bg-white/5 px-2 py-0.5 rounded">+91 81979 83277</span>
                <span className="bg-white/5 px-2 py-0.5 rounded">918197983277</span>
                <span className="bg-white/5 px-2 py-0.5 rounded">8197983277</span>
                <span className="bg-white/5 px-2 py-0.5 rounded">08197983277</span>
              </div>
            </div>

            {invalidNumbers.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-400 mb-2">
                  {invalidNumbers.length} invalid number(s) will be skipped:
                </p>
                <div className="max-h-24 overflow-y-auto text-xs text-amber-300 font-mono">
                  {invalidNumbers.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <span>{item.original}</span>
                      <span className="text-amber-500">-</span>
                      <span>{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsedNumbers.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm font-medium text-emerald-400 mb-2">
                  {parsedNumbers.length} valid number(s) ready to dial:
                </p>
                <div className="max-h-32 overflow-y-auto text-xs text-emerald-300 font-mono">
                  {parsedNumbers.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-slate-400">{i + 1}.</span>
                      <span>{item.original}</span>
                      <span className="text-emerald-500">→</span>
                      <span className="text-emerald-400">+{item.normalized}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-white/5 backdrop-blur border border-white/20 text-slate-300 font-medium hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || parsedNumbers.length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-purple-700 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Starting Campaign..." : "Start Bulk Dial"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BulkCallModal;
