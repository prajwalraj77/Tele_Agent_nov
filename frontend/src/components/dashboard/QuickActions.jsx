// Dashboard quick action buttons

import Icon from "../common/Icon";

function QuickActions({ onNewCall }) {
  const actions = [
    {
      title: "Start New Call",
      description: "Call a customer using the AI agent",
      icon: "phone",
      onClick: onNewCall,
    },
    {
      title: "View Callbacks",
      description: "Review pending follow-ups",
      icon: "callback",
    },
    {
      title: "Demo Visits",
      description: "Check confirmed showroom visits",
      icon: "demo",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-950">
          Quick Actions
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Frequently used actions
        </p>
      </div>

      <div className="space-y-3">
        {actions.map((action) => (
          <button
            key={action.title}
            onClick={action.onClick}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Icon name={action.icon} size={18} />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                {action.title}
              </div>

              <div className="mt-0.5 truncate text-xs text-slate-400">
                {action.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default QuickActions;