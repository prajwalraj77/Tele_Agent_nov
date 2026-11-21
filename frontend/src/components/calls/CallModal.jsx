// ============================================================
// CALL MODAL
// ============================================================
// Glassmorphism modal for initiating a new outbound call.
// ============================================================

import { useEffect, useState } from "react";

function CallModal({
  open,
  initialPhone = "",
  onClose,
  onCall,
}) {
  const [phoneNumber, setPhoneNumber] =
    useState(initialPhone);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setPhoneNumber(initialPhone || "");
    setError("");
  }, [initialPhone, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanedPhone =
      phoneNumber.replace(/\D/g, "");

    if (cleanedPhone.length < 10) {
      setError(
        "Please enter a valid phone number.",
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      await onCall(cleanedPhone);
    } catch (err) {
      setError(
        err.message ||
          "Unable to start the call.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      {/* Glassy backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-xl bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Glassy modal card */}
      <div
        className="relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* Top accent gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Make a Call
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Enter the customer's phone number
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

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="phoneNumber"
              className="block mb-2 text-sm font-medium text-slate-200"
            >
              Phone number
            </label>

            <div className="relative mb-6">
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(event) =>
                  setPhoneNumber(event.target.value)
                }
                placeholder="+91 81979 83277"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white/10 transition-all disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
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
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-purple-700 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Calling..." : "Start Call"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CallModal;