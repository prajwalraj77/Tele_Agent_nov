// Knowledge Base Page

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Icon from "../components/common/Icon";

export default function KnowledgeBasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Knowledge Base</div>
              <h1 className="text-4xl font-black text-white tracking-tight">Knowledge Base</h1>
              <p className="text-white/60 mt-2">
                Manage training data, FAQs, and responses for your AI voice agent
              </p>
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-8 shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/30">
              <Icon name="dashboard" size={32} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Knowledge Base</h3>
            <p className="text-white/50">Manage training data and FAQs for your AI agent.</p>
          </div>
        </main>
      </div>
    </div>
  );
}