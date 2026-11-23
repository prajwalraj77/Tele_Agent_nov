// Bold Follow-ups Page - Calls requiring follow-up

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

function getInterestBadgeClass(status) {
  switch (status) {
    case "interested":
      return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
    case "not_interested":
      return "border-rose-500/20 text-rose-400 bg-rose-500/5";
    case "uncertain":
      return "border-amber-500/20 text-amber-400 bg-amber-500/5";
    default:
      return "border-white/10 text-white/40 bg-white/5";
  }
}

function getDirectionBadgeClass(direction) {
  return direction === "outbound"
    ? "border-blue-500/20 text-blue-400 bg-blue-500/5"
    : "border-purple-500/20 text-purple-400 bg-purple-500/5";
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "completed":
      return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
    case "failed":
      return "border-rose-500/20 text-rose-400 bg-rose-500/5";
    case "initiated":
    case "ringing":
    case "answered":
      return "border-blue-500/20 text-blue-400 bg-blue-500/5";
    default:
      return "border-white/10 text-white/40 bg-white/5";
  }
}

export default function FollowUpsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFollowUpCalls = async () => {
    try {
      setLoading(true);
      const response = await getCalls();
      const data = response?.calls || response?.data || response || [];
      const allCalls = Array.isArray(data) ? data : [];
      
      // Filter to only calls with followUpRequired === true
      const followUpCalls = allCalls.filter((call) => call.followUpRequired === true);
      
      setCalls(followUpCalls);
    } catch (error) {
      console.error("Failed to load follow-up calls:", error);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUpCalls();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Follow-ups</div>
              <h1 className="text-3xl font-black text-white tracking-tight">Follow-up Calls</h1>
              <p className="text-white/60 mt-1">
                Calls that require follow-up action
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-2">
              <Icon name="callback" size={16} />
              {calls.length} calls need follow-up
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-0 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Call ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Follow-up At</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Callback Reason</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-white/50">
                        Loading follow-up calls...
                      </td>
                    </tr>
                  ) : calls.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                          <Icon name="callback" size={32} />
                        </div>
                        <p className="text-white/50">No follow-up calls found.</p>
                      </td>
                    </tr>
                  ) : (
                    calls.map((call) => (
                      <tr
                        key={call.callId || call._id}
                        className="border-b border-white/5 hover:bg-white/5 transition-all group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 font-bold text-xs">
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
                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getDirectionBadgeClass(call.direction)}`}>
                            {call.direction}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusBadgeClass(call.status)}`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {formatDuration(call.durationSeconds || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getInterestBadgeClass(call.interestStatus)}`}>
                            {call.interestStatus || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {call.followUpAt ? formatDateTime(call.followUpAt) : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/70 max-w-xs truncate">
                          {call.callbackReason || "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/customers/${call.customerId || call._id}`}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            View Customer
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