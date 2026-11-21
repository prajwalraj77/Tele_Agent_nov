// Bold sidebar navigation for the teleagent platform

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../common/Icon";

const mainNavigation = [
  { label: "Dashboard", icon: "dashboard", path: "/" },
  { label: "Call Logs", icon: "phone", path: "/calls" },
  { label: "Customers", icon: "users", path: "/customers" },
  { label: "Follow-ups", icon: "callback", path: "/follow-ups" },
];

const managementNavigation = [
  { label: "Agent Configuration", icon: "microphone" },
  { label: "Knowledge Base", icon: "dashboard" },
  { label: "Analytics", icon: "analytics" },
  { label: "Settings", icon: "settings" },
];

function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-950 border-r border-white/10 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
        collapsed ? "-translate-x-full" : "translate-x-0"
      }`}
    >
      <div className="flex h-[70px] items-center justify-between border-b border-white/10 px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/30">
            <Icon name="phone" size={14} className="text-white" />
          </div>
          <div className="hidden lg:block">
            <div className="text-white font-bold text-sm tracking-tight">TEJO<span className="text-blue-400">.</span>VOICE</div>
            <div className="text-[10px] text-blue-200/70 font-medium uppercase tracking-wider">AI Teleagent</div>
          </div>
        </div>

        <button
          onClick={() => setCollapsed(true)}
          className="lg:hidden w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-8">
        <div>
          <div className="px-4 mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
            Workspace
          </div>

          <div className="space-y-1">
            {mainNavigation.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-white/10 border border-blue-500/30 text-white shadow-lg shadow-blue-500/20"
                      : "text-white/50 hover:bg-white/5 hover:text-white hover:border-white/10 border-transparent"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 backdrop-blur flex items-center justify-center text-white/50 group-hover:text-white transition-all">
                    <Icon name={item.icon} size={18} />
                  </div>
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
            Management
          </div>

          <div className="space-y-1">
            {managementNavigation.map((item) => (
              <Link
                key={item.label}
                to={`/management/${item.label.toLowerCase().replace(' ', '-')}`}
                className={`group flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  location.pathname.includes(item.label.toLowerCase().replace(' ', '-'))
                    ? "bg-white/10 border border-blue-500/30 text-white shadow-lg shadow-blue-500/20"
                    : "text-white/50 hover:bg-white/5 hover:text-white hover:border-white/10 border-transparent"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white/5 backdrop-blur flex items-center justify-center text-white/50 group-hover:text-white transition-all">
                  <Icon name={item.icon} size={18} />
                </div>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 p-6">
        <div className="rounded-3xl bg-white/5 border border-white/10 p-5 shadow-xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white font-bold text-xs uppercase tracking-wider">
              AI Agent Online
            </span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Gemini Live voice agent ready for Kannada, English & South Indian languages
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;