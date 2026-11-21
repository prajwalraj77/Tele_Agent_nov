// Bold Calls Page - Complete call history

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Icon from "../components/common/Icon";

import { getCalls } from "../services/callService";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds) {
  if (!seconds) return "0m 0s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const loadCalls = async () => {
    try {
      setLoading(true);
      const response = await getCalls();
      const data = response?.calls || response?.data || response || [];
      setCalls(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load calls:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const filteredCalls = calls.filter((call) => {
    if (tab === "completed") return call.status === "completed";
    if (tab === "pending") return call.status !== "completed" && call.status !== "failed";
    if (tab === "failed") return call.status === "failed";
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />

      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Call Logs</div>
              <h1 className="text-3xl font-black text-white tracking-tight">All Calls</h1>
              <p className="text-white/60 mt-1">
                Complete history of all AI agent calls with transcripts and summaries
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("all")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  tab === "all"
                    ? "bg-white/10 border border-white/20 text-white"
                    : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTab("completed")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  tab === "completed"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setTab("pending")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  tab === "pending"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setTab("failed")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  tab === "failed"
                    ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                    : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
                }`}
              >
                Failed
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-0 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Call ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-white/50">
                        Loading calls...
                      </td>
                    </tr>
                  ) : filteredCalls.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                          <Icon name="phone" size={32} />
                        </div>
                        <p className="text-white/50">No calls found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCalls.map((call) => (
                      <tr
                        key={call.callId || call._id}
                        className="border-b border-white/5 hover:bg-white/5 transition-all group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                              C
                            </div>
                            <div className="text-sm font-bold text-white truncate max-w-xs">
                              {call.callId || call._id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/80">
                          {call.phoneNumber || "Unknown"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                            call.direction === "outbound" ? "border-blue-500/20 text-blue-400 bg-blue-500/5" : "border-purple-500/20 text-purple-400 bg-purple-500/5"
                          }`}>
                            {call.direction}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                            call.status === "completed" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" :
                            call.status === "failed" ? "border-rose-500/20 text-rose-400 bg-rose-500/5" :
                            call.status === "initiated" || call.status === "ringing" || call.status === "answered"
                              ? "border-blue-500/20 text-blue-400 bg-blue-500/5" :
                              "border-white/10 text-white/40 bg-white/5"
                          }`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {formatDuration(call.durationSeconds || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                            call.interestStatus === "interested" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" :
                            call.interestStatus === "not_interested" ? "border-rose-500/20 text-rose-400 bg-rose-500/5" :
                            call.interestStatus === "uncertain" ? "border-amber-500/20 text-amber-400 bg-amber-500/5" :
                            "border-white/10 text-white/40 bg-white/5"
                          }`}>
                            {call.interestStatus || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {formatDateTime(call.startedAt || call.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/calls/${call.callId || call._id}`}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}