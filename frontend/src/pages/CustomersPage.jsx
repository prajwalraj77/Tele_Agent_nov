// Bold Customers Page - Customer list

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await getCustomers();
      const data = response?.customers || response?.data || response || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const text = [customer.name, customer.phoneNumber, customer.customerId, customer.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return search ? text.includes(search.toLowerCase()) : true;
    });
  }, [customers, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <div className="pl-64 min-h-screen transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8 lg:py-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Customer Management</div>
              <h1 className="text-3xl font-black text-white tracking-tight">All Customers</h1>
              <p className="text-white/60 mt-1">
                Complete list of customers who have been called by the AI agent
              </p>
            </div>
            <div className="relative w-[320px]">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white/20 transition-all"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 backdrop-blur border border-white/10 p-0 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Follow-up</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Last Call</th>
                    <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-white/50">
                        Loading customers...
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                          <Icon name="users" size={32} />
                        </div>
                        <p className="text-white/50">No customers found.</p>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer._id || customer.customerId} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                                {(customer.name || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate">{customer.name || "Unknown"}</div>
                                <div className="text-xs text-white/50 truncate">{customer.customerId || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-white/80">
                            {customer.phoneNumber || "No phone"}
                          </td>
                          <td className="px-6 py-4 text-sm text-white/60">
                            {customer.email || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${customer.interestStatus === "interested" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" : customer.interestStatus === "not_interested" ? "border-rose-500/20 text-rose-400 bg-rose-500/5" : customer.interestStatus === "uncertain" ? "border-amber-500/20 text-amber-400 bg-amber-500/5" : "border-white/10 text-white/40 bg-white/5"}`}>
                              {customer.interestStatus || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {customer.followUpRequired ? (
                              <div className="text-sm font-bold text-amber-400">Required</div>
                            ) : (
                              <span className="text-sm text-white/50">None</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-white/60">
                            {formatDate(customer.latestCallAt || customer.updatedAt)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link to={`/customers/${customer._id || customer.customerId}`} className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </>
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