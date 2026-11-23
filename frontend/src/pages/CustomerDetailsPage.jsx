// Bold Customer Details Page - Complete customer profile with call history

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Icon from "../components/common/Icon";

import { getCustomerDetails } from "../services/customerService";

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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds) {
  if (!seconds) return "0m 0s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getLast6Digits(phoneNumber) {
  if (!phoneNumber) return "—";
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length <= 6) return phoneNumber;
  return `••••••${digits.slice(-6)}`;
}

function getInterestBadgeClass(status) {
  switch (status) {
    case "interested":
      return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
    case "not_interested":
      return "border-rose-500/20 text-rose-400 bg-rose-500/5";
    case "uncertain":
      return "border-amber-500/20 text-amber-400 bg-amber-500/5";
    default:
      return "border-white/10 text-white/40 bg-white/5";
  }
}

function getDirectionBadgeClass(direction) {
  return direction === "outbound"
    ? "border-blue-500/20 text-blue-400 bg-blue-500/5"
    : "border-purple-500/20 text-purple-400 bg-purple-500/5";
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "completed":
      return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
    case "failed":
      return "border-rose-500/20 text-rose-400 bg-rose-500/5";
    case "initiated":
    case "ringing":
    case "answered":
      return "border-blue-500/20 text-blue-400 bg-blue-500/5";
    default:
      return "border-white/10 text-white/40 bg-white/5";
  }
}

function getCallOutcomeBadgeClass(outcome) {
  switch (outcome) {
    case "normal":
      return "border-blue-500/20 text-blue-400 bg-blue-500/5";
    case "callback_requested":
      return "border-amber-500/20 text-amber-400 bg-amber-500/5";
    case "demo_visit_confirmed":
      return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
    case "not_interested":
      return "border-rose-500/20 text-rose-400 bg-rose-500/5";
    case "no_response":
      return "border-white/10 text-white/40 bg-white/5";
    default:
      return "border-white/10 text-white/40 bg-white/5";
  }
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-white/80 bg-white/5 rounded-xl px-3 py-2">{typeof value === "object" ? value : value}</div>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, icon, color }) {
  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
  };

  const icons = {
    phone: "phone",
    arrowDown: "arrowDown",
    arrowUp: "arrowUp",
    checkCircle: "checkCircle",
    xCircle: "xCircle",
  };

  return (
    <div className={`rounded-2xl bg-white/5 backdrop-blur border p-5 shadow-xl ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider">{label}</div>
          <div className="text-3xl font-black mt-1">{value}</div>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color].replace("bg-", "bg-").replace("text-", "bg-").replace("border-", "bg-")}`}>
          <Icon name={icons[icon]} size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, copyable }) {
  return (
    <div>
      <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-white/80 truncate flex items-center gap-2">
        {typeof value === "object" ? value : <span>{value}</span>}
        {copyable && (
          <button className="text-white/40 hover:text-white transition-colors p-1" title="Copy">
            <Icon name="copy" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function ExpandableCallRow({ call, isExpanded, onToggle }) {
  const callId = call.callId || call._id;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${getDirectionBadgeClass(call.direction).replace("border-", "bg-").replace("text-", "bg-").replace("border-", "bg-")}`}>
            <Icon name={call.direction === "outbound" ? "arrowUp" : "arrowDown"} size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-sm font-bold text-white truncate">
              <span>{callId}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(call.status)}`}>
                {call.status}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getDirectionBadgeClass(call.direction)}`}>
                {call.direction}
              </span>
            </div>
            <div className="text-xs text-white/50 truncate flex items-center gap-2">
              <span>{formatDateTime(call.startedAt)}</span>
              <span>•</span>
              <span>{formatDuration(call.durationSeconds)}</span>
              {call.language && <>• {call.language}</>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getInterestBadgeClass(call.interestStatus)}`}>
            {call.interestStatus || "—"}
          </span>
          <Icon name={isExpanded ? "chevronUp" : "chevronDown"} size={18} className="text-white/50 transition-transform duration-200" />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 p-4 bg-white/3 animate-slideDown">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <DetailRow label="Call ID" value={callId} />
            <DetailRow label="External Caller ID" value={call.externalCallSid || "—"} />
            <DetailRow label="Phone Number" value={call.phoneNumber || "—"} />
            <DetailRow label="Direction" value={
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getDirectionBadgeClass(call.direction)}`}>
                {call.direction}
              </span>
            } />
            <DetailRow label="Status" value={
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusBadgeClass(call.status)}`}>
                {call.status}
              </span>
            } />
            <DetailRow label="Duration" value={formatDuration(call.durationSeconds)} />
            <DetailRow label="Started At" value={formatDateTime(call.startedAt)} />
            <DetailRow label="Answered At" value={formatDateTime(call.answeredAt)} />
            <DetailRow label="Ended At" value={formatDateTime(call.endedAt)} />
            <DetailRow label="Language" value={call.language || "—"} />
            <DetailRow label="Interest Status" value={
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getInterestBadgeClass(call.interestStatus)}`}>
                {call.interestStatus || "—"}
              </span>
            } />
            <DetailRow label="Call Outcome" value={
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getCallOutcomeBadgeClass(call.callOutcome)}`}>
                {call.callOutcome || "—"}
              </span>
            } />
            <DetailRow label="Follow-up Required" value={call.followUpRequired ? "Yes" : "No"} />
            {call.followUpRequired && call.followUpAt && (
              <DetailRow label="Follow-up Date/Time" value={formatDateTime(call.followUpAt)} />
            )}
            {call.followUpRequired && !call.followUpAt && (
              <DetailRow label="Follow-up Date/Time" value="—" />
            )}
            <DetailRow label="Callback Status" value={call.callbackStatus || "—"} />
            <DetailRow label="Callback Reason" value={call.callbackReason || "—"} />
          </div>

          {call.nextAction && (
            <div className="mb-4">
              <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Next Action</div>
              <p className="text-sm text-white/80 bg-white/5 rounded-xl p-4">{call.nextAction}</p>
            </div>
          )}

          {call.summary && (
            <div>
              <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Call Summary</div>
              <p className="text-sm text-white/80 bg-white/5 rounded-xl p-4 whitespace-pre-wrap">{call.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerDetailsPage() {
  const { customerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCallId, setExpandedCallId] = useState(null);
  const [showFullCallerId, setShowFullCallerId] = useState(false);

  const loadCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await getCustomerDetails(customerId);
      setData(response);
    } catch (err) {
      console.error("Failed to load customer details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerDetails();
  }, [customerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-white/50">Loading customer details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-rose-400">Error: {error}</div>
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-white/50">Customer not found</div>
      </div>
    );
  }

  const { customer, calls, stats, lastCall, hasFollowUp } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          {/* Header with back button */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/customers"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
              >
                <Icon name="chevronLeft" size={20} />
              </Link>
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Customer Details</div>
                <h1 className="text-3xl font-black text-white tracking-tight">{customer.name || "Unknown Customer"}</h1>
                <p className="text-white/60 mt-1">Complete profile with call history and analytics</p>
              </div>
            </div>
            {hasFollowUp && (
              <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-2">
                <Icon name="callback" size={16} />
                Follow-up Required
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Calls" value={stats.totalCalls} icon="phone" color="blue" />
            <StatCard label="Inbound" value={stats.inboundCalls} icon="arrowDown" color="purple" />
            <StatCard label="Outbound" value={stats.outboundCalls} icon="arrowUp" color="blue" />
            <StatCard label="Completed" value={stats.completedCalls} icon="checkCircle" color="emerald" />
            <StatCard label="Failed" value={stats.failedCalls} icon="xCircle" color="rose" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Customer Info & Last Call */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Info Card */}
              <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold text-2xl">
                    {(customer.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-white truncate">{customer.name || "Unknown Customer"}</h2>
                    <div className="text-sm text-white/50">{customer.customerId || "—"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Phone" value={customer.phoneNumber || "—"} copyable={true} />
                  <InfoRow label="Email" value={customer.email || "—"} />
                  <InfoRow label="Interest Status" value={
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getInterestBadgeClass(customer.interestStatus)}`}>
                      {customer.interestStatus || "—"}
                    </span>
                  } />
                  <InfoRow label="Source" value={customer.source || "—"} />
                  <InfoRow label="Do Not Call" value={customer.doNotCall ? "Yes" : "No"} />
                  <InfoRow label="Conversation Rate" value={customer.conversationRate !== null ? `${customer.conversationRate}%` : "—"} />
                </div>
              </div>

              {/* Last Call Details Card */}
              {lastCall && (
                <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Icon name="phone" size={18} className="text-blue-400" />
                      Last Call Details
                    </h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusBadgeClass(lastCall.status)}`}>
                      {lastCall.status}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailRow label="Call ID" value={lastCall.callId || "—"} copyable={true} />
                      <DetailRow label="External Caller ID" value={lastCall.externalCallSid || "—"} copyable={true} />
                      <DetailRow label="Phone Number" value={lastCall.phoneNumber || "—"} />
                      <DetailRow label="Direction" value={
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getDirectionBadgeClass(lastCall.direction)}`}>
                          {lastCall.direction}
                        </span>
                      } />
                      <DetailRow label="Status" value={
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusBadgeClass(lastCall.status)}`}>
                          {lastCall.status}
                        </span>
                      } />
                      <DetailRow label="Duration" value={formatDuration(lastCall.durationSeconds)} />
                      <DetailRow label="Started At" value={formatDateTime(lastCall.startedAt)} />
                      <DetailRow label="Answered At" value={formatDateTime(lastCall.answeredAt)} />
                      <DetailRow label="Ended At" value={formatDateTime(lastCall.endedAt)} />
                      <DetailRow label="Language" value={lastCall.language || "—"} />
                      <DetailRow label="Interest Status" value={
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getInterestBadgeClass(lastCall.interestStatus)}`}>
                          {lastCall.interestStatus || "—"}
                        </span>
                      } />
                      <DetailRow label="Call Outcome" value={
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getCallOutcomeBadgeClass(lastCall.callOutcome)}`}>
                          {lastCall.callOutcome || "—"}
                        </span>
                      } />
                      <DetailRow label="Follow-up Required" value={lastCall.followUpRequired ? "Yes" : "No"} />
                      {lastCall.followUpRequired && lastCall.followUpAt && (
                        <DetailRow label="Follow-up Date/Time" value={formatDateTime(lastCall.followUpAt)} />
                      )}
                      {lastCall.followUpRequired && !lastCall.followUpAt && (
                        <DetailRow label="Follow-up Date/Time" value="—" />
                      )}
                      <DetailRow label="Callback Status" value={lastCall.callbackStatus || "—"} />
                      <DetailRow label="Callback Reason" value={lastCall.callbackReason || "—"} />
                    </div>

                    {lastCall.nextAction && (
                      <div className="pt-4 border-t border-white/10">
                        <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Next Action</div>
                        <p className="text-sm text-white/80 bg-white/5 rounded-xl p-4">{lastCall.nextAction}</p>
                      </div>
                    )}

                    {lastCall.summary && (
                      <div className="pt-4 border-t border-white/10">
                        <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Call Summary</div>
                        <p className="text-sm text-white/80 bg-white/5 rounded-xl p-4 whitespace-pre-wrap">{lastCall.summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Call History - Expandable */}
              <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icon name="history" size={18} className="text-blue-400" />
                    Call History ({calls?.length || 0})
                  </h3>
                </div>

                {calls && calls.length > 0 ? (
                  <div className="space-y-2">
                    {calls.map((call) => (
                      <ExpandableCallRow
                        key={call.callId || call._id}
                        call={call}
                        isExpanded={expandedCallId === (call.callId || call._id)}
                        onToggle={() => setExpandedCallId(expandedCallId === (call.callId || call._id) ? null : (call.callId || call._id))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                      <Icon name="phone" size={32} />
                    </div>
                    <p className="text-white/50">No calls found for this customer.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Caller ID Card */}
            <div className="space-y-6">
              <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl sticky top-24 h-fit">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                  <Icon name="user" size={18} className="text-blue-400" />
                  Caller ID
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Caller ID</div>
                    <div className="relative">
                      <code className="text-xl font-mono text-white bg-white/5 rounded-xl px-4 py-3 block break-all cursor-pointer hover:bg-white/10 transition-all"
                        onClick={() => setShowFullCallerId(!showFullCallerId)}>
                        {showFullCallerId ? (customer.phoneNumber || "—") : getLast6Digits(customer.phoneNumber)}
                      </code>
                      <div className="absolute top-3 right-3 text-xs text-white/50">
                        {showFullCallerId ? "Click to collapse" : "Click to expand"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Phone Number</div>
                    <code className="text-sm font-mono text-white/80 bg-white/5 rounded-xl px-4 py-3 block break-all">{customer.phoneNumber || "—"}</code>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Direction (Last Call)</div>
                    <span className={`text-sm font-bold px-3 py-2 rounded-xl border ${getDirectionBadgeClass(lastCall?.direction)} inline-block`}>
                      {lastCall?.direction || "—"}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Status (Last Call)</div>
                    <span className={`text-sm font-bold px-3 py-2 rounded-xl border ${getStatusBadgeClass(lastCall?.status)} inline-block`}>
                      {lastCall?.status || "—"}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Interest (Last Call)</div>
                    <span className={`text-sm font-bold px-3 py-2 rounded-xl border ${getInterestBadgeClass(lastCall?.interestStatus)} inline-block`}>
                      {lastCall?.interestStatus || "—"}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Date (Last Call)</div>
                    <div className="text-sm text-white/80">{formatDateTime(lastCall?.startedAt)}</div>
                  </div>

                  {lastCall?.followUpRequired && lastCall?.followUpAt && (
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Follow-up Date/Time</div>
                      <div className="text-sm text-amber-400 font-bold">{formatDateTime(lastCall.followUpAt)}</div>
                    </div>
                  )}

                  {lastCall?.followUpRequired && !lastCall?.followUpAt && (
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Follow-up Date/Time</div>
                      <div className="text-sm text-white/50">—</div>
                    </div>
                  )}

                  <Link
                    to="/follow-ups"
                    className="block w-full text-center px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-sm hover:bg-blue-500/20 transition-all"
                  >
                    View All Follow-ups
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}