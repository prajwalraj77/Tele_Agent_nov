// ============================================================
// BULK CALLS PAGE
// ============================================================
// Manage and monitor bulk dial campaigns.
// ============================================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Icon from "../components/common/Icon";
import BulkCallModal from "../components/calls/BulkCallModal";

import {
  listBulkCalls,
  getBulkCallStatus,
  pauseBulkCall,
  resumeBulkCall,
  cancelBulkCall,
  startBulkCall,
} from "../services/callService";

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

function BulkCallsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await listBulkCalls(50);
      const data = response?.bulkCalls || response?.data || response || [];
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load bulk campaigns:", error);
    } finally { setLoading(false); }
  };

  const refreshCampaign = async (bulkId) => {
    try { setDetailLoading(true);
      const response = await getBulkCallStatus(bulkId);
      const updated = response?.bulkCall || response?.data || response;
      if (updated) { setCampaigns((prev) => prev.map((c) => (c.bulkId === bulkId ? updated : c))); }
    } catch (error) { console.error("Failed to refresh campaign:", error); }
    finally { setDetailLoading(false); }
  };

  const handleStartCampaign = async (campaignData) => {
    try { 
      await startBulkCall(campaignData.name, campaignData.phoneNumbers, campaignData.config);
      await loadCampaigns(); 
      setModalOpen(false); 
    }
    catch (error) { throw error; }
  };

  const handlePause = async (bulkId) => { try { await pauseBulkCall(bulkId); await refreshCampaign(bulkId); } catch (error) { console.error("Failed to pause:", error); } };
  const handleResume = async (bulkId) => { try { await resumeBulkCall(bulkId); await refreshCampaign(bulkId); } catch (error) { console.error("Failed to resume:", error); } };
  const handleCancel = async (bulkId) => { if (!window.confirm("Cancel this campaign?")) return; try { await cancelBulkCall(bulkId); await refreshCampaign(bulkId); } catch (error) { console.error("Failed to cancel:", error); } };

  useEffect(() => { loadCampaigns(); }, []);
  useEffect(() => { const interval = setInterval(() => { campaigns.filter(c => c.status === "running").forEach(c => refreshCampaign(c.bulkId)); }, 5000); return () => clearInterval(interval); }, [campaigns]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Bulk Dial</div>
              <h1 className="text-3xl font-black text-white tracking-tight">Campaigns</h1>
              <p className="text-white/60 mt-1">Manage and monitor bulk outbound dial campaigns</p>
            </div>
            <button onClick={() => setModalOpen(true)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-purple-700 hover:shadow-blue-500/40 transition-all flex items-center gap-2"><Icon name="phone" size={18} /> New Campaign</button>
          </div>

          <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-0 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Campaign ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Answered</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">No Answer</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Failed</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Started</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" className="px-6 py-12 text-center text-white/50">Loading campaigns...</td></tr>
                  ) : campaigns.length === 0 ? (
                    <tr><td colSpan="9" className="px-6 py-12 text-center"><div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30"><Icon name="phone" size={32} /></div><p className="text-white/50">No campaigns found. Create your first bulk dial campaign!</p></td></tr>
                  ) : (
                    campaigns.map((campaign) => (
                      <tr key={campaign.bulkId} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 font-bold text-xs">B</div><div className="text-sm font-bold text-white truncate max-w-xs">{campaign.bulkId}</div></div></td>
                        <td className="px-6 py-4 text-sm text-white/80 max-w-xs truncate">{campaign.name || "Unnamed Campaign"}</td>
                        <td className="px-6 py-4"><span className={"text-xs font-bold px-2 py-1 rounded-full border " + getStatusColor(campaign.status)}>{campaign.status}{campaign.active?.paused && <span className="ml-1">⏸</span>}</span></td>
                        <td className="px-6 py-4"><div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: campaign.totalNumbers > 0 ? (campaign.processedCount / campaign.totalNumbers) * 100 + "%" : "0%" }} /></div><p className="text-xs text-white/50 mt-1">{campaign.processedCount} / {campaign.totalNumbers}</p></td>
                        <td className="px-6 py-4 text-sm font-medium text-emerald-400">{campaign.answeredCount || 0}</td>
                        <td className="px-6 py-4 text-sm font-medium text-amber-400">{campaign.noAnswerCount || 0}</td>
                        <td className="px-6 py-4 text-sm font-medium text-rose-400">{campaign.failedCount || 0}</td>
                        <td className="px-6 py-4 text-sm text-white/60">{formatDateTime(campaign.startedAt || campaign.createdAt)}</td>
                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">
                          <button onClick={() => refreshCampaign(campaign.bulkId)} disabled={detailLoading} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50" title="Refresh"><Icon name="refresh-cw" size={16} /></button>
                          {campaign.status === "running" && <button onClick={() => handlePause(campaign.bulkId)} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all">Pause</button>}
                          {campaign.status === "paused" && <button onClick={() => handleResume(campaign.bulkId)} className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all">Resume</button>}
                          {(campaign.status === "running" || campaign.status === "paused") && <button onClick={() => handleCancel(campaign.bulkId)} className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-500/20 transition-all">Cancel</button>}
                          <Link to={"/bulk/" + campaign.bulkId} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 hover:text-white transition-all">Details</Link>
                        </div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      <BulkCallModal open={modalOpen} onClose={() => setModalOpen(false)} onStart={handleStartCampaign} />
    </div>
  );
}
export default BulkCallsPage;
