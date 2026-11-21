// Bold top header for the teleagent dashboard

import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../common/Icon";

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-[70px] z-40 flex items-center justify-between border-b border-white/30 bg-white/10 backdrop-blur-2xl px-6 lg:pl-64 lg:px-8">
      {/* Left: Brand + Navigation toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <Icon name="menu" size={20} />
        </button>

        <Link
          to="/"
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30">
            <Icon name="phone" size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg tracking-tight">
              TEJO<span className="text-blue-400">.</span>VOICE
            </div>
            <div className="text-xs text-blue-200/70 font-medium uppercase tracking-wider">
              AI Teleagent Platform
            </div>
          </div>
        </Link>
      </div>

      {/* Center: Search */}
      <div className="hidden lg:flex items-center w-[400px]">
        <div className="relative w-full">
          <Icon
            name="search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
          />
          <input
            type="text"
            placeholder="Search customers, calls, follow-ups..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white/20 transition-all"
          />
        </div>
      </div>

      {/* Right: User + Agent status */}
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/10 border border-white/20 backdrop-blur">
          <div className="flex flex-col text-right">
            <div className="text-white font-semibold text-sm">Prajwal Raj</div>
            <div className="text-xs text-white/60">Administrator</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
            P
          </div>
        </div>

        {/* AI Agent Status Indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-bold text-xs tracking-wider uppercase">
            AI Agent Live
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;