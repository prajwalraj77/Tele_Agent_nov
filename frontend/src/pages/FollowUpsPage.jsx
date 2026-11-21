// Bold Follow-ups Page - Pending callbacks

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Icon from "../components/common/Icon";

import { getPendingFollowUps } from "../services/callService";

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

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      const response = await getPendingFollowUps();
      const data = response?.followUps || response?.data || response || [];
      setFollowUps(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load follow-ups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-white/50">Loading follow-ups...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Follow-ups</div>
              <h1 className="text-3xl font-black text-white tracking-tight">Pending Callbacks</h1>
              <p className="text-white/60 mt-1">
                Customers who requested a follow-up or callback from the AI agent
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-2">
              <Icon name="callback" size={16} />
              {followUps.length} pending follow-ups
            </div>
          </div>
          {followUps.length === 0 ? (
            <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-12 shadow-xl text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                <Icon name="callback" size={32} />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">No pending follow-ups</h3>
              <p className="text-white/50">All caught up! No pending callbacks.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((call) => (
                <div key={call.callId || call._id} className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 shadow-lg group hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-sm">
                        C
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {call.customerId || "Unknown"}
                        </div>
                        <div className="text-xs text-white/50 truncate">
                          {call.phoneNumber || "No phone"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-white/60">
                      {formatDateTime(call.followUpAt || call.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm text-white/80 max-w-xs truncate">
                    {call.callbackReason || "Follow-up requested"}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Link
                      to={"/calls/" + (call.callId || call._id)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View Call
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}