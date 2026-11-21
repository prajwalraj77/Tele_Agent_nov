// Dashboard customer search and filters

import Icon from "../common/Icon";

function DashboardToolbar({
  search,
  setSearch,
  interest,
  setInterest,
  direction,
  setDirection,
  followUp,
  setFollowUp,
  onRefresh,
  onNewCall,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="search"
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customers..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:flex">
          <select
            value={interest}
            onChange={(event) => setInterest(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"
          >
            <option value="">All Interest</option>
            <option value="interested">Interested</option>
            <option value="uncertain">Uncertain</option>
            <option value="not_interested">Not Interested</option>
          </select>

          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"
          >
            <option value="">All Calls</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>

          <select
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"
          >
            <option value="">All Follow-ups</option>
            <option value="required">Required</option>
            <option value="not_required">Not Required</option>
          </select>

          <button
            onClick={onRefresh}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <Icon name="refresh" size={16} />
            Refresh
          </button>
        </div>

        <button
          onClick={onNewCall}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/20 hover:text-white"
        >
          <Icon name="plus" size={17} />
          New Call
        </button>
      </div>
    </div>
  );
}

export default DashboardToolbar;