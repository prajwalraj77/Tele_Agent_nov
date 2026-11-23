// ============================================================
// BULK CALL DETAIL PAGE
// ============================================================
// View detailed campaign progress and call history.
// ============================================================

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Icon from "../components/common/Icon";

import {
  getBulkCallStatus,
  pauseBulkCall,
  resumeBulkCall,
  cancelBulkCall,
  getBulkCallCalls,
} from "../services/callService";

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDuration(seconds) {
  if (!seconds) return "0m 0s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes + "m " + remainingSeconds + "s";
}

function getStatusColor(status) {
  switch (status) {
    case "completed": return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
    case "running": return "border-blue-500/20 text-blue-400 bg-blue-500/5 animate-pulse";
    case "paused": return "border-amber-500/20 text-amber-400 bg-amber-500/5";
    case "failed": return "border-rose-500/20 text-rose-400 bg-rose-500/5";
    case "cancelled": return "border-slate-500/20 text-slate-400 bg-slate-500/5";
    default: return "border-white/10 text-white/40 bg-white/5";
  }
}

function getCallStatusColor(status) {
  switch (status) {
    case "completed": return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
    case "answered": return "border-blue-500/20 text-blue-400 bg-blue-500/5";
    case "initiated":
    case "ringing": return "border-amber-500/20 text-amber-400 bg-amber-500/5";
    case "failed": return "border-rose-500/20 text-rose-400 bg-rose-500/5";
    case "no_answer": return "border-slate-500/20 text-slate-400 bg-slate-500/5";
    default: return "border-white/10 text-white/40 bg-white/5";
  }
}

function BulkCallDetailPage() {
  const { bulkId } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const response = await getBulkCallStatus(bulkId);
      const data = response?.bulkCall || response?.data || response;
      if (data) {
        setCampaign(data);
        const callsResponse = await getBulkCallCalls(bulkId);
        setCallHistory(Array.isArray(callsResponse) ? callsResponse : []);
      }
    } catch (error) {
      console.error("Failed to load campaign:", error);
    } finally { setLoading(false); }
  };

  const refresh = async () => {
    try {
      setRefreshing(true);
      const response = await getBulkCallStatus(bulkId);
      const data = response?.bulkCall || response?.data || response;
      if (data) setCampaign(data);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally { setRefreshing(false); }
  };

  const handlePause = async () => { try { await pauseBulkCall(bulkId); await refresh(); } catch (error) { console.error("Failed to pause:", error); } };
  const handleResume = async () => { try { await resumeBulkCall(bulkId); await refresh(); } catch (error) { console.error("Failed to resume:", error); } };
  const handleCancel = async () => { if (!window.confirm("Cancel this campaign?")) return; try { await cancelBulkCall(bulkId); await refresh(); } catch (error) { console.error("Failed to cancel:", error); } };

  useEffect(() => { loadCampaign(); }, [bulkId]);
  useEffect(() => { if (!campaign || campaign.status !== "running") return; const interval = setInterval(() => refresh(), 5000); return () => clearInterval(interval); }, [campaign]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <Sidebar />
        <div className="pl-64 min-h-screen transition-all duration-300">
          <Header />
          <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
            <div className="text-center py-20 text-white/50">Loading campaign...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <Sidebar />
        <div className="pl-64 min-h-screen transition-all duration-300">
          <Header />
          <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30"><Icon name="alert-circle" size={32} /></div>
              <p className="text-white/50">Campaign not found</p>
              <Link to="/bulk" className="mt-4 inline-block text-blue-400 hover:text-blue-300">Back to Campaigns</Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const pendingNumbers = campaign.phoneNumbers?.filter(n => n.status === "pending") || [];
  const callingNumbers = campaign.phoneNumbers?.filter(n => n.status === "calling") || [];
  const completedNumbers = campaign.phoneNumbers?.filter(n => ["answered", "completed"].includes(n.status)) || [];
  const noAnswerNumbers = campaign.phoneNumbers?.filter(n => n.status === "no_answer") || [];
  const failedNumbers = campaign.phoneNumbers?.filter(n => n.status === "failed") || [];
  const skippedNumbers = campaign.phoneNumbers?.filter(n => n.status === "skipped") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/bulk" className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"><Icon name="chevron-left" size={20} /></Link>
              <div><div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Bulk Dial</div>
                <h1 className="text-3xl font-black text-white tracking-tight">{campaign.name || "Unnamed Campaign"}</h1>
                <p className="text-white/60 mt-1">{campaign.bulkId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={refresh} disabled={refreshing} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50" title="Refresh"><Icon name="refresh-cw" size={18} className={refreshing ? "animate-spin" : ""} /></button>
              <span className={"px-4 py-2 rounded-xl font-bold text-sm " + getStatusColor(campaign.status)}>{campaign.status}{campaign.active?.paused && <span className="ml-2">⏸ Paused</span>}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5"><div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Total Numbers</div><div className="text-3xl font-black text-white">{campaign.totalNumbers || 0}</div></div>
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5"><div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Processed</div><div className="text-3xl font-black text-white">{campaign.processedCount || 0}</div></div>
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5"><div className="text-xs font-bold text-emerald-400/80 uppercase tracking-wider mb-1">Answered</div><div className="text-3xl font-black text-emerald-400">{campaign.answeredCount || 0}</div></div>
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5"><div className="text-xs font-bold text-amber-400/80 uppercase tracking-wider mb-1">No Answer</div><div className="text-3xl font-black text-amber-400">{campaign.noAnswerCount || 0}</div></div>
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5"><div className="text-xs font-bold text-rose-400/80 uppercase tracking-wider mb-1">Failed</div><div className="text-3xl font-black text-rose-400">{campaign.failedCount || 0}</div></div>
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5"><div className="text-xs font-bold text-slate-400/80 uppercase tracking-wider mb-1">Skipped</div><div className="text-3xl font-black text-slate-400">{skippedNumbers.length}</div></div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 mb-8">
            <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-white/80">Overall Progress</span><span className="text-sm font-bold text-white">{campaign.totalNumbers > 0 ? Math.round((campaign.processedCount / campaign.totalNumbers) * 100) : 0}%</span></div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" style={{ width: campaign.totalNumbers > 0 ? (campaign.processedCount / campaign.totalNumbers) * 100 + "%" : "0%" }} /></div>
            <p className="text-xs text-white/50 mt-2">{campaign.processedCount} of {campaign.totalNumbers} numbers processed</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Icon name="info" size={20} className="text-blue-400" /> Campaign Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-white/50">Campaign ID</dt><dd className="text-white font-mono">{campaign.bulkId}</dd></div>
                <div className="flex justify-between"><dt className="text-white/50">Created</dt><dd className="text-white">{formatDateTime(campaign.createdAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-white/50">Started</dt><dd className="text-white">{campaign.startedAt ? formatDateTime(campaign.startedAt) : "Not started"}</dd></div>
                <div className="flex justify-between"><dt className="text-white/50">Completed</dt><dd className="text-white">{campaign.completedAt ? formatDateTime(campaign.completedAt) : "In progress"}</dd></div>
                <div className="flex justify-between"><dt className="text-white/50">Gap Between Calls</dt><dd className="text-white">{(campaign.config?.gapBetweenCallsMs || 5000) / 1000}s</dd></div>
                <div className="flex justify-between"><dt className="text-white/50">Max Retries</dt><dd className="text-white">{campaign.config?.maxRetries || 1}</dd></div>
              </dl>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Icon name="settings" size={20} className="text-purple-400" /> Configuration</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-white/50">Call Timeout</dt><dd className="text-white">{(campaign.config?.callTimeoutMs || 30000) / 1000}s</dd></div>
                <div className="flex justify-between"><dt className="text-white/50">Retry Delay</dt><dd className="text-white">{(campaign.config?.retryDelayMs || 5000) / 1000}s</dd></div>
                <div className="flex justify-between"><dt className="text-white/50">Max Retries</dt><dd className="text-white">{campaign.config?.maxRetries || 1}</dd></div>
              </dl>
            </div>
          </div>

          {(campaign.status === "running" || campaign.status === "paused") && (
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 mb-8 flex flex-wrap gap-3">
              {campaign.status === "running" && <button onClick={handlePause} className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/20 transition-all flex items-center gap-2"><Icon name="pause" size={16} /> Pause Campaign</button>}
              {campaign.status === "paused" && <button onClick={handleResume} className="px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium hover:bg-blue-500/20 transition-all flex items-center gap-2"><Icon name="play" size={16} /> Resume Campaign</button>}
              <button onClick={handleCancel} className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium hover:bg-rose-500/20 transition-all flex items-center gap-2"><Icon name="x" size={16} /> Cancel Campaign</button>
            </div>
          )}

          <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-0 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Icon name="list" size={20} className="text-blue-400" /> Call History ({callHistory.length} calls)</h3>
              <span className="text-xs font-bold px-2 py-1 rounded-full border bg-blue-500/10 border-blue-500/20 text-blue-400">Bulk Call Logs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Call ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Started</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Ended</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Exotel SID</th>
                  </tr>
                </thead>
                <tbody>
                  {callHistory.length === 0 ? (
                    <tr><td colSpan="7" className="px-6 py-12 text-center"><div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-white/30"><Icon name="phone" size={24} /></div><p className="text-white/50">No calls made yet</p></td></tr>
                  ) : (
                    callHistory.map((call) => (
                      <tr key={call.callId || call._id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 font-bold text-xs">C</div><div className="text-sm font-bold text-white truncate max-w-xs">{call.callId || call._id}</div></div></td>
                        <td className="px-6 py-4 text-sm text-white/80">{call.phoneNumber || "Unknown"}</td>
                        <td className="px-6 py-4"><span className={"text-xs font-bold px-2 py-1 rounded-full border " + getCallStatusColor(call.status)}>{call.status}</span></td>
                        <td className="px-6 py-4 text-sm text-white/60">{formatDuration(call.durationSeconds || 0)}</td>
                        <td className="px-6 py-4 text-sm text-white/60">{formatDateTime(call.startedAt)}</td>
                        <td className="px-6 py-4 text-sm text-white/60">{call.endedAt ? formatDateTime(call.endedAt) : "—"}</td>
                        <td className="px-6 py-4 text-sm text-white/50 font-mono">{call.externalCallSid || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {(pendingNumbers.length > 0 || callingNumbers.length > 0 || completedNumbers.length > 0 || noAnswerNumbers.length > 0 || failedNumbers.length > 0 || skippedNumbers.length > 0) && (
            <div className="mt-8 space-y-4">
              {pendingNumbers.length > 0 && (
                <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5">
                  <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white/30" /> Pending ({pendingNumbers.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {pendingNumbers.map((n, i) => <div key={i} className="font-mono text-white/60 bg-white/5 p-2 rounded-lg">{n.original} → +{n.normalized}</div>)}
                  </div>
                </div>
              )}
              {callingNumbers.length > 0 && (
                <div className="rounded-2xl bg-white/5 backdrop-blur border border-blue-500/20 p-5 animate-pulse">
                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400" /> Currently Calling ({callingNumbers.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {callingNumbers.map((n, i) => <div key={i} className="font-mono text-blue-400 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">{n.original} → +{n.normalized}</div>)}
                  </div>
                </div>
              )}
              {completedNumbers.length > 0 && (
                <div className="rounded-2xl bg-white/5 backdrop-blur border border-emerald-500/20 p-5">
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Answered ({completedNumbers.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {completedNumbers.map((n, i) => <div key={i} className="font-mono text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">{n.original} → +{n.normalized} ({n.durationSeconds || 0}s)</div>)}
                  </div>
                </div>
              )}
              {noAnswerNumbers.length > 0 && (
                <div className="rounded-2xl bg-white/5 backdrop-blur border border-amber-500/20 p-5">
                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" /> No Answer ({noAnswerNumbers.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {noAnswerNumbers.map((n, i) => <div key={i} className="font-mono text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">{n.original} → +{n.normalized}</div>)}
                  </div>
                </div>
              )}
              {failedNumbers.length > 0 && (
                <div className="rounded-2xl bg-white/5 backdrop-blur border border-rose-500/20 p-5">
                  <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-400" /> Failed ({failedNumbers.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {failedNumbers.map((n, i) => <div key={i} className="font-mono text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10" title={n.error}>{n.original} → +{n.normalized}</div>)}
                  </div>
                </div>
              )}
              {skippedNumbers.length > 0 && (
                <div className="rounded-2xl bg-white/5 backdrop-blur border border-slate-500/20 p-5">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400" /> Skipped ({skippedNumbers.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {skippedNumbers.map((n, i) => <div key={i} className="font-mono text-slate-400 bg-slate-500/5 p-2 rounded-lg border border-slate-500/10">{n.original} → +{n.normalized}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
export default BulkCallDetailPage;
