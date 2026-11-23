// CRM-style Customers Page

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Icon from "../components/common/Icon";

import { getCustomers } from "../services/customerService";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getLast6Digits(phoneNumber) {
  if (!phoneNumber) return "—";
  const digits = String(phoneNumber).replace(/\D/g, "");
  if (!digits) return "—";
  return digits.length <= 6 ? digits : digits.slice(-6);
}

function formatLabel(value) {
  if (!value) return "—";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getInterestBadgeClass(status) {
  switch (status) {
    case "interested": return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
    case "not_interested": return "border-rose-500/20 text-rose-400 bg-rose-500/5";
    case "uncertain": return "border-amber-500/20 text-amber-400 bg-amber-500/5";
    default: return "border-white/10 text-white/40 bg-white/5";
  }
}

function getDirectionBadgeClass(direction) {
  switch (direction) {
    case "inbound":
      return "border-purple-500/20 text-purple-400 bg-purple-500/5";

    case "outbound":
      return "border-blue-500/20 text-blue-400 bg-blue-500/5";

    default:
      return "border-white/10 text-white/40 bg-white/5";
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "completed":
      return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";

    case "failed":
      return "border-rose-500/20 text-rose-400 bg-rose-500/5";

    case "answered":
    case "ringing":
    case "initiated":
      return "border-blue-500/20 text-blue-400 bg-blue-500/5";

    default:
      return "border-white/10 text-white/40 bg-white/5";
  }
}

function CallerIdCell({ phoneNumber }) {
  const [expanded, setExpanded] = useState(false);

  const shortNumber = getLast6Digits(phoneNumber);
  const fullNumber = phoneNumber || "—";

  return (
    <button
      type="button"
      onClick={() => setExpanded((previous) => !previous)}
      className="font-mono text-sm text-white/90 hover:text-blue-400 transition-colors text-left"
      title="Click to show full caller ID"
    >
      <span className="inline-flex items-center gap-2">
        <span>{expanded ? fullNumber : shortNumber}</span>

        {phoneNumber && (
          <span className="text-[10px] text-white/30">
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </span>
    </button>
  );
}

function CustomerRow({ customer }) {
  const callStats = customer.callStats || {
    totalCalls: 0,
    inboundCalls: 0,
    outboundCalls: 0,
  };

  const latestCallDirection = customer.latestCallDirection;
  const latestCallStatus = customer.latestCallStatus;
  const latestCallAt = customer.latestCallAt || customer.updatedAt;

  const followUpRequired = Boolean(customer.followUpRequired);
  const followUpAt = customer.followUpAt;
  const followUpDate = customer.followUpDate;

  let followUpDisplay = "—";

  if (followUpRequired) {
    if (followUpAt) {
      followUpDisplay = formatDateTime(followUpAt);
    } else if (followUpDate) {
      followUpDisplay = formatDate(followUpDate);
    }
  }

  return (
    <tr
      className="
        border-b border-white/5
        hover:bg-white/[0.04]
        transition-colors
      "
    >
      {/* CUSTOMER */}
      <td className="px-4 py-4 min-w-[220px]">
        <div className="flex items-center gap-3">
          <div
            className="
              w-9 h-9 shrink-0
              rounded-xl
              bg-white/10
              border border-white/10
              flex items-center justify-center
              text-white font-bold text-sm
            "
          >
            {(customer.name || "U").charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate max-w-[180px]">
              {customer.name || "Unknown"}
            </div>

            <div className="text-[11px] text-white/35 truncate max-w-[180px]">
              {customer.customerId || "—"}
            </div>
          </div>
        </div>
      </td>

      {/* CALLER ID */}
      <td className="px-4 py-4 min-w-[110px]">
        <CallerIdCell phoneNumber={customer.phoneNumber} />
      </td>

      {/* PHONE */}
      <td className="px-4 py-4 min-w-[160px]">
        <span className="font-mono text-xs text-white/60 whitespace-nowrap">
          {customer.phoneNumber || "—"}
        </span>
      </td>

      {/* DIRECTION */}
      <td className="px-4 py-4 min-w-[110px]">
        <span
          className={`
            inline-flex
            px-2.5 py-1
            rounded-full
            border
            text-[11px]
            font-bold
            whitespace-nowrap
            ${getDirectionBadgeClass(latestCallDirection)}
          `}
        >
          {formatLabel(latestCallDirection)}
        </span>
      </td>

      {/* STATUS */}
      <td className="px-4 py-4 min-w-[110px]">
        <span
          className={`
            inline-flex
            px-2.5 py-1
            rounded-full
            border
            text-[11px]
            font-bold
            whitespace-nowrap
            ${getStatusBadgeClass(latestCallStatus)}
          `}
        >
          {formatLabel(latestCallStatus)}
        </span>
      </td>

      {/* INTEREST */}
      <td className="px-4 py-4 min-w-[120px]">
        <span
          className={`
            inline-flex
            px-2.5 py-1
            rounded-full
            border
            text-[11px]
            font-bold
            whitespace-nowrap
            ${getInterestBadgeClass(customer.interestStatus)}
          `}
        >
          {formatLabel(customer.interestStatus)}
        </span>
      </td>

      {/* FOLLOW-UP */}
      <td className="px-4 py-4 min-w-[150px]">
        {followUpRequired ? (
          <div>
            <div className="text-[11px] font-bold text-amber-400">
              Required
            </div>

            {followUpDisplay !== "—" && (
              <div className="text-[11px] text-white/50 mt-1">
                {followUpDisplay}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-white/35">—</span>
        )}
      </td>

      {/* LAST CALLED */}
      <td className="px-4 py-4 min-w-[155px]">
        <span className="text-xs text-white/55 whitespace-nowrap">
          {formatDateTime(latestCallAt)}
        </span>
      </td>

      {/* CALL COUNT */}
      <td className="px-4 py-4 min-w-[110px]">
        <div className="text-sm font-bold text-white">
          {callStats.totalCalls || 0}
        </div>

        <div className="text-[10px] text-white/35 mt-1 whitespace-nowrap">
          In {callStats.inboundCalls || 0}
          {" · "}
          Out {callStats.outboundCalls || 0}
        </div>
      </td>

      {/* ACTION */}
      <td className="px-4 py-4 min-w-[90px] text-right">
        <Link
          to={`/customers/${customer._id || customer.customerId}`}
          className="
            inline-flex items-center
            px-3 py-1.5
            rounded-lg
            text-[11px]
            font-bold
            text-blue-400
            border border-blue-500/10
            hover:bg-blue-500/10
            hover:text-blue-300
            transition-all
          "
        >
          Details
        </Link>
      </td>
    </tr>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const response = await getCustomers();

      const data =
        response?.customers ||
        response?.data ||
        response ||
        [];

      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      const searchableText = [
        customer.name,
        customer.phoneNumber,
        customer.customerId,
        customer.email,
        customer.latestCallDirection,
        customer.latestCallStatus,
        customer.interestStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [customers, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />

      <div className="pl-64 min-h-screen">
        <Header />

        <main className="px-5 py-7 lg:px-7 lg:py-8">
          {/* PAGE HEADER */}
          <div className="mb-7 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
            <div>
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">
                Customer Management
              </div>

              <h1 className="text-3xl font-black text-white tracking-tight">
                All Customers
              </h1>

              <p className="text-sm text-white/45 mt-1">
                Complete customer history from AI voice interactions
              </p>
            </div>

            <div className="relative w-full xl:w-[320px]">
              <Icon
                name="search"
                size={17}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-white/40
                "
              />

              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="
                  w-full
                  h-10
                  pl-10
                  pr-4
                  rounded-xl
                  bg-white/[0.06]
                  border border-white/10
                  text-sm
                  text-white
                  placeholder-white/30
                  focus:outline-none
                  focus:ring-1
                  focus:ring-blue-500/50
                  focus:border-blue-500/30
                  transition-all
                "
              />
            </div>
          </div>

          {/* CUSTOMER TABLE */}
          <div
            className="
              rounded-2xl
              bg-slate-900/60
              border border-white/10
              shadow-xl
              overflow-hidden
            "
          >
            {/* TABLE TOP BAR */}
            <div
              className="
                flex
                items-center
                justify-between
                px-4
                py-3
                border-b border-white/10
                bg-white/[0.025]
              "
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Customers
                </span>

                <span
                  className="
                    px-2
                    py-0.5
                    rounded-full
                    bg-white/10
                    text-[10px]
                    font-bold
                    text-white/50
                  "
                >
                  {filteredCustomers.length}
                </span>
              </div>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[11px] text-white/40 hover:text-white transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>

            {/* HORIZONTAL SCROLL IS INTENTIONAL */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] border-collapse">
                <thead>
                  <tr className="bg-white/[0.035] border-b border-white/10">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Customer
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Caller ID
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Phone
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Direction
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Interest
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Follow-up
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Last Called
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Calls
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-bold text-white/35 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="px-6 py-16 text-center"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className="
                              w-8 h-8
                              rounded-full
                              border-2
                              border-white/10
                              border-t-blue-400
                              animate-spin
                            "
                          />

                          <span className="text-xs text-white/40">
                            Loading customers...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="px-6 py-16 text-center"
                      >
                        <div
                          className="
                            w-14 h-14
                            rounded-full
                            bg-white/5
                            border border-white/5
                            flex items-center justify-center
                            mx-auto mb-4
                            text-white/25
                          "
                        >
                          <Icon name="users" size={28} />
                        </div>

                        <p className="text-sm text-white/40">
                          No customers found.
                        </p>

                        {search && (
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="
                              mt-3
                              text-xs
                              text-blue-400
                              hover:text-blue-300
                            "
                          >
                            Clear search
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <CustomerRow
                        key={customer._id || customer.customerId}
                        customer={customer}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}