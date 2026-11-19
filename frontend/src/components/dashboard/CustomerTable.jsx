// Recent customer table

import Badge from "../common/Badge";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds) {
  if (!seconds) return "0m 0s";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

function CustomerTable({ customers }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Recent Customers
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Latest customer activity
          </p>
        </div>

        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          View all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Customer
              </th>

              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Last Call
              </th>

              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </th>

              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Interest
              </th>

              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Follow-up
              </th>

              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Duration
              </th>

              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Language
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr
                  key={customer._id || customer.customerId}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                        {(customer.name || "U").charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {customer.name || "Unknown"}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-400">
                          {customer.phoneNumber || "No phone"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {formatDate(customer.latestCallAt)}
                  </td>

                  <td className="px-5 py-4">
                    <Badge value={customer.latestCallStatus} />
                  </td>

                  <td className="px-5 py-4">
                    <Badge value={customer.interestStatus} />
                  </td>

                  <td className="px-5 py-4">
                    {customer.followUpRequired ? (
                      <div>
                        <div className="text-sm font-medium text-slate-700">
                          Required
                        </div>

                        <div className="text-xs text-slate-400">
                          {formatDate(customer.followUpAt)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">None</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {formatDuration(customer.latestCallDuration)}
                  </td>

                  <td className="px-5 py-4 text-sm capitalize text-slate-600">
                    {customer.latestLanguage || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomerTable;