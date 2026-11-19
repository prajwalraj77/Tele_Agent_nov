// Small reusable status badge

const styles = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  answered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  interested: "bg-blue-50 text-blue-700 ring-blue-200",
  not_interested: "bg-red-50 text-red-700 ring-red-200",
  uncertain: "bg-amber-50 text-amber-700 ring-amber-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  ringing: "bg-violet-50 text-violet-700 ring-violet-200",
  initiated: "bg-slate-100 text-slate-700 ring-slate-200",
};

function Badge({ value }) {
  if (!value) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        —
      </span>
    );
  }

  const className =
    styles[value] || "bg-slate-100 text-slate-700 ring-slate-200";

  const label = value.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

export default Badge;