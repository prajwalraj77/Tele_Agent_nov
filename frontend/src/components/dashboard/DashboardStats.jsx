// Dashboard KPI cards

import Icon from "../common/Icon";

function StatCard({ title, value, description, icon, trend, trendUp = true }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon name={icon} size={19} />
        </div>

        {trend && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
              trendUp
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <Icon name={trendUp ? "arrowUp" : "arrowDown"} size={12} />
            {trend}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="text-3xl font-bold tracking-tight text-slate-950">
          {value}
        </div>

        <div className="mt-1 text-sm font-medium text-slate-700">
          {title}
        </div>

        <div className="mt-1 text-xs text-slate-400">
          {description}
        </div>
      </div>
    </div>
  );
}

function DashboardStats({ stats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total Calls"
        value={stats.totalCalls}
        description="All recorded calls"
        icon="phone"
        trend="12.5%"
      />

      <StatCard
        title="Customers"
        value={stats.totalCustomers}
        description="Customers in your CRM"
        icon="users"
        trend="8.2%"
      />

      <StatCard
        title="Interested Leads"
        value={stats.interested}
        description="Customers showing interest"
        icon="check"
        trend="15.4%"
      />

      <StatCard
        title="Follow-ups"
        value={stats.followUps}
        description="Pending customer actions"
        icon="callback"
        trend={stats.followUps > 0 ? undefined : "0%"}
        trendUp={false}
      />
    </section>
  );
}

export default DashboardStats;