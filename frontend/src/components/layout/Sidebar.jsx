// Dashboard navigation sidebar

import Icon from "../common/Icon";

const mainNavigation = [
  { label: "Dashboard", icon: "dashboard", active: true },
  { label: "Customers", icon: "users" },
  { label: "Call Logs", icon: "phone" },
  { label: "Callbacks", icon: "callback" },
  { label: "Demo Visits", icon: "demo" },
];

const managementNavigation = [
  { label: "Agent Configuration", icon: "microphone" },
  { label: "Knowledge Base", icon: "dashboard" },
  { label: "Analytics", icon: "analytics" },
  { label: "Settings", icon: "settings" },
];

function Sidebar() {
  return (
    <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-[76px] items-center border-b border-slate-100 px-7">
        <div>
          <div className="text-xl font-bold tracking-tight text-slate-950">
            TEJO<span className="text-blue-600">.</span>
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            AI Voice Platform
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-7 px-4 py-6">
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </div>

          <div className="space-y-1">
            {mainNavigation.map((item) => (
              <button
                key={item.label}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  className={
                    item.active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-700"
                  }
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Management
          </div>

          <div className="space-y-1">
            {managementNavigation.map((item) => (
              <button
                key={item.label}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              >
                <Icon
                  name={item.icon}
                  size={18}
                  className="text-slate-400 group-hover:text-slate-700"
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-700">
              AI Agent Online
            </span>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Your Tejo EV voice agent is ready to handle calls.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;