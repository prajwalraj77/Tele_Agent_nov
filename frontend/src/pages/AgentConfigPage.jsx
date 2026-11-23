// Agent Configuration Page

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Icon from "../components/common/Icon";

export default function AgentConfigPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Agent Configuration</div>
              <h1 className="text-4xl font-black text-white tracking-tight">AI Agent Settings</h1>
              <p className="text-white/60 mt-2">
                Configure your Gemini Live voice agent behavior, language, and voice settings
              </p>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Icon name="dashboard" size={18} />
                </div>
                <div className="text-white font-bold text-lg tracking-tight">Voice Settings</div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-2 uppercase">Language Model</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-green border border-white/20 text-black focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option>Gemini 3.1 Lite</option>
                    <option>Gemini 2.0 Flash</option>
                    <option>Gemini 1.5 Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-2 uppercase">Voice Language</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option>Kannada + English</option>
                    <option>Tamil + English</option>
                    <option>Telugu + English</option>
                    <option>Malayalam + English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-2 uppercase">Voice Tone</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option>Professional</option>
                    <option>Friendly</option>
                    <option>Formal</option>
                    <option>Casual</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Icon name="callback" size={18} />
                </div>
                <div className="text-white font-bold text-lg tracking-tight">Follow-up Rules</div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-2 uppercase">Follow-up Trigger</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option>Customer requested callback</option>
                    <option>Interest uncertain</option>
                    <option>All completed calls</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-2 uppercase">Default Follow-up Delay</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>24 hours</option>
                    <option>3 days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Icon name="users" size={18} />
                </div>
                <div className="text-white font-bold text-lg tracking-tight">Do Not Call</div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-2 uppercase">Auto-block Not Interested</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                    <option>Enabled</option>
                    <option>Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-2 uppercase">Block Duration</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-purple-500">
                    <option>Permanent</option>
                    <option>30 days</option>
                    <option>7 days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}