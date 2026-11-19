// AI voice agent status card

function AgentStatusCard() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-400">
            VOICE AGENT
          </div>

          <h2 className="mt-2 text-lg font-semibold">
            Tejo Sales Agent
          </h2>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-semibold text-emerald-300">
            Online
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-xs text-slate-400">Voice</div>
          <div className="mt-1 text-sm font-semibold">Sadachbia</div>
        </div>

        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-xs text-slate-400">Model</div>
          <div className="mt-1 text-sm font-semibold">Gemini Live</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white/5 p-3">
        <div className="text-xs text-slate-400">Language behavior</div>

        <div className="mt-1 text-sm font-medium text-slate-200">
          Regional language + English
        </div>
      </div>
    </section>
  );
}

export default AgentStatusCard;