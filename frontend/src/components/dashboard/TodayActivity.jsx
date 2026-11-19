// Today's activity summary

import Icon from "../common/Icon";

function TodayActivity({ calls }) {
  const completed = calls.filter(
    (call) => call.status === "completed"
  ).length;

  const answered = calls.filter(
    (call) =>
      call.status === "answered" ||
      call.status === "completed"
  ).length;

  const interested = calls.filter(
    (call) => call.interestStatus === "interested"
  ).length;

  const activities = [
    {
      label: "Calls handled",
      value: answered,
      icon: "phone",
    },
    {
      label: "Completed",
      value: completed,
      icon: "check",
    },
    {
      label: "Interested",
      value: interested,
      icon: "users",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-950">
          Today's Activity
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Current call performance
        </p>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.label}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                <Icon name={activity.icon} size={16} />
              </div>

              <span className="text-sm text-slate-600">
                {activity.label}
              </span>
            </div>

            <span className="text-sm font-bold text-slate-900">
              {activity.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TodayActivity;