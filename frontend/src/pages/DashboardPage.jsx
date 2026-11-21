// Bold Dashboard - Main teleagent overview

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import CallModal from "../components/calls/CallModal";

import { getCustomers } from "../services/customerService";
import { getCalls, startCall } from "../services/callService";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds) {
  if (!seconds) return "0m 0s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function Icon({ name, size = 16, className = "" }) {
  const icons = {
    phone: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 0 7h0.12"/></svg>`,
    dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    users: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    callback: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4.93 4.93l14.14 14.14M21 2v20M19.07 4.93l-14.14 14.14"/></svg>`,
    chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
    menu: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`,
    arrowUp: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 15 10 10 15 15"></polyline></svg>`,
    arrowDown: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 9 14 14 9 9"></polyline></svg>`,
  };

  return (
    <span
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: icons[name] || "" }}
    />
  );
}

function StatCard({ title, value, description, icon, trend, trendUp = true, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-blue-500/30",
    emerald: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-emerald-500/30",
    amber: "bg-amber-500/20 border-amber-500/30 text-amber-400 shadow-amber-500/30",
    rose: "bg-rose-500/20 border-rose-500/30 text-rose-400 shadow-rose-500/30",
  };

  return (
    <div className={`rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl hover:border-white/20 transition-all ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
          <Icon name={icon} size={22} />
        </div>
        {trend && (
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold ${
            trendUp
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/20 text-rose-400 border-rose-500/30"
          }`}>
            <Icon name={trendUp ? "arrowUp" : "arrowDown"} size={12} />
            {trend}
          </div>
        )}
      </div>

      <div className="text-4xl font-black text-white tracking-tight mb-1">{value}</div>
      <div className="text-sm font-bold text-white/90">{title}</div>
      <div className="text-xs text-white/50 mt-1">{description}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [activeCallStatus, setActiveCallStatus] = useState(null);
  const [search, setSearch] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [customerResponse, callResponse] = await Promise.all([
        getCustomers(),
        getCalls(),
      ]);

      const customerData = customerResponse?.customers || customerResponse?.data || customerResponse || [];
      const callData = callResponse?.calls || callResponse?.data || callResponse || [];

      setCustomers(Array.isArray(customerData) ? customerData : []);
      setCalls(Array.isArray(callData) ? callData : []);
    } catch (error) {
      console.error("Dashboard loading failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const text = [customer.name, customer.phoneNumber, customer.customerId, customer.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return search ? text.includes(search.toLowerCase()) : true;
    });
  }, [customers, search]);

  const stats = {
    totalCalls: calls.length,
    totalCustomers: customers.length,
    interested: customers.filter((c) => c.interestStatus === "interested").length,
    followUps: customers.filter((c) => c.followUpRequired).length,
  };

  const todayCalls = useMemo(() => {
    const today = new Date();
    return calls.filter((call) => {
      const value = call.startedAt || call.createdAt;
      if (!value) return false;
      const date = new Date(value);
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    });
  }, [calls]);

  const recentCalls = useMemo(() => {
    return [...calls].sort(
      (a, b) => new Date(b.createdAt || b.startedAt || 0).getTime() - new Date(a.createdAt || a.startedAt || 0).getTime()
    ).slice(0, 5);
  }, [calls]);

  const handleStartCallSubmit = async (phoneNumber) => {
    try {
      setActiveCallStatus({ phoneNumber, status: "initiating" });
      const response = await startCall(phoneNumber);
      setActiveCallStatus({ phoneNumber, status: "active", response });
      setCallModalOpen(false);
      await loadDashboard();
    } catch (error) {
      setActiveCallStatus({ phoneNumber, status: "error", message: error.message });
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />

      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 backdrop-blur flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/30">
                  <Icon name="dashboard" size={18} />
                </div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">Good morning, Prajwal</div>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight">AI Voice Dashboard</h1>
              <p className="text-white/60 mt-2">
                Your teleagent is live and ready to handle calls in Kannada, English & South Indian languages
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/calls"
                className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10 text-white font-bold shadow-lg hover:bg-white/10 transition-all"
              >
                <Icon name="phone" size={18} /> View All Calls
              </Link>

              <button
                onClick={() => setCallModalOpen(true)}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-xl shadow-blue-500/40 hover:from-blue-700 hover:to-purple-700 hover:shadow-blue-500/60 transition-all"
              >
                <Icon name="phone" size={18} /> New Call
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="Total Calls"
              value={stats.totalCalls}
              description="All recorded calls"
              icon="phone"
              trend="+12.5%"
              trendUp
              color="blue"
            />
            <StatCard
              title="Customers"
              value={stats.totalCustomers}
              description="In your CRM"
              icon="users"
              trend="+8.2%"
              trendUp
              color="emerald"
            />
            <StatCard
              title="Interested Leads"
              value={stats.interested}
              description="Showing interest"
              icon="callback"
              trend="+15.4%"
              trendUp
              color="emerald"
            />
            <StatCard
              title="Follow-ups"
              value={stats.followUps}
              description="Pending actions"
              icon="callback"
              trend={stats.followUps > 0 ? "+12%" : "0%"}
              trendUp={stats.followUps > 0}
              color="amber"
            />
          </div>

          {activeCallStatus && (
            <div className="mb-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-2 rounded-full ${activeCallStatus.status === "active" ? "bg-emerald-400 animate-pulse" : activeCallStatus.status === "error" ? "bg-rose-500" : "bg-blue-400"}`} />
                <span className="text-sm font-bold text-white">Call Status</span>
              </div>
              <div className="text-sm text-white/80">
                {activeCallStatus.status === "active"
                  ? `Call initiated to ${activeCallStatus.phoneNumber} - ${activeCallStatus.response?.message || "Connected"}`
                  : activeCallStatus.status === "error"
                    ? `Error: ${activeCallStatus.message}`
                    : `Initiating call to ${activeCallStatus.phoneNumber}...`}
              </div>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="phone" size={16} className="text-blue-400" />
                    <div className="text-white font-bold text-lg tracking-tight">Recent Calls</div>
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">Latest call activity</div>
                </div>
                <Link to="/calls" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                  View all →
                </Link>
              </div>

              <div className="space-y-3">
                {recentCalls.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-white/30">
                      <Icon name="phone" size={24} />
                    </div>
                    <p className="text-white/50">No calls yet. Start your first call!</p>
                  </div>
                ) : (
                  recentCalls.map((call) => (
                    <div key={call.callId || call._id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
                        <Icon name="phone" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{call.phoneNumber || "Unknown"}</div>
                        <div className="text-xs text-white/50 truncate">{call.direction || "outbound"} • {formatDate(call.startedAt || call.createdAt)}</div>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg border ${
                        call.status === "completed" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" :
                        call.status === "failed" ? "border-rose-500/20 text-rose-400 bg-rose-500/5" :
                        "border-blue-500/20 text-blue-400 bg-blue-500/5"
                      }`}>
                        {call.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="callback" size={16} className="text-blue-400" />
                  <div className="text-white font-bold text-lg tracking-tight">Quick Actions</div>
                </div>
                <div className="text-xs text-white/50 mt-0.5">Frequently used actions</div>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() => setCallModalOpen(true)}
                  className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 text-left hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 backdrop-blur flex items-center justify-center text-blue-400 group-hover:bg-blue-600/30 transition-colors">
                    <Icon name="phone" size={18} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Start New Call</div>
                    <div className="text-xs text-white/50">Call a customer using AI agent</div>
                  </div>
                </button>

                <button
                  className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 text-left hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 backdrop-blur flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600/30 transition-colors">
                    <Icon name="callback" size={18} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">View Follow-ups</div>
                    <div className="text-xs text-white/50">Review pending callbacks</div>
                  </div>
                </button>

                <Link
                  to="/customers"
                  className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 text-left hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 backdrop-blur flex items-center justify-center text-purple-400 group-hover:bg-purple-600/30 transition-colors">
                    <Icon name="users" size={18} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Customer List</div>
                    <div className="text-xs text-white/50">Manage all customers</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="users" size={16} className="text-blue-400" />
                  <div className="text-white font-bold text-lg tracking-tight">Recent Customers</div>
                </div>
                <div className="text-xs text-white/50 mt-0.5">Customers who have been called</div>
              </div>
              <Link to="/customers" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                View all →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-3 text-xs font-bold text-white/40 uppercase tracking-wider">Customer</th>
                    <th className="pb-3 text-xs font-bold text-white/40 uppercase tracking-wider">Phone</th>
                    <th className="pb-3 text-xs font-bold text-white/40 uppercase tracking-wider">Interest</th>
                    <th className="pb-3 text-xs font-bold text-white/40 uppercase tracking-wider">Last Call</th>
                    <th className="pb-3 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.slice(0, 5).map((customer) => (
                    <tr key={customer._id || customer.customerId} className="border-b border-white/5 hover:bg-white/5 transition-all">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                            {(customer.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">{customer.name || "Unknown"}</div>
                            <div className="text-xs text-white/50">{customer.email || "No email"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-white/80">{customer.phoneNumber || "No phone"}</td>
                      <td className="py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                          customer.interestStatus === "interested" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" :
                          customer.interestStatus === "not_interested" ? "border-rose-500/20 text-rose-400 bg-rose-500/5" :
                          customer.interestStatus === "uncertain" ? "border-amber-500/20 text-amber-400 bg-amber-500/5" :
                          "border-white/10 text-white/40 bg-white/5"
                        }`}>
                          {customer.interestStatus || "—"}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-white/60">{formatDate(customer.latestCallAt)}</td>
                      <td className="py-4 text-right">
                        <button className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                          Call
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <CallModal
        open={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        onCall={handleStartCallSubmit}
      />
    </div>
  );
}