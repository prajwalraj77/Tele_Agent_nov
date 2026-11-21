// Main AI voice platform dashboard

import { useEffect, useMemo, useState } from "react";

import DashboardStats from "./DashboardStats";
import DashboardToolbar from "./DashboardToolbar";
import CustomerTable from "./CustomerTable";
import QuickActions from "./QuickActions";
import AgentStatusCard from "./AgentStatusCard";
import TodayActivity from "./TodayActivity";
import CallModal from "../calls/CallModal";

import Sidebar from "../layout/Sidebar";
import Header from "../layout/Header";

import { getCustomers } from "../../services/customerService";
import { getCalls, startCall } from "../../services/callService";

function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [calls, setCalls] = useState([]);

  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState("");
  const [direction, setDirection] = useState("");
  const [followUp, setFollowUp] = useState("");

  const [loading, setLoading] = useState(true);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [activeCallStatus, setActiveCallStatus] = useState(null);

  // Load customers and calls from backend
  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [customerResponse, callResponse] = await Promise.all([
        getCustomers(),
        getCalls(),
      ]);

      const customerData =
        customerResponse?.customers ||
        customerResponse?.data ||
        customerResponse ||
        [];

      const callData =
        callResponse?.calls ||
        callResponse?.data ||
        callResponse ||
        [];

      setCustomers(Array.isArray(customerData) ? customerData : []);
      setCalls(Array.isArray(callData) ? callData : []);
    } catch (error) {
      console.error("Dashboard loading failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const recentCustomers = useMemo(() => {
    const latestCallsByCustomer = new Map();

    [...calls]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.startedAt || 0) -
          new Date(a.createdAt || a.startedAt || 0)
      )
      .forEach((call) => {
        const customerId =
          call.customerId?._id ||
          call.customerId ||
          call.customer;

        if (customerId && !latestCallsByCustomer.has(customerId)) {
          latestCallsByCustomer.set(customerId, call);
        }
      });

    return customers
      .map((customer) => {
        const latestCall =
          latestCallsByCustomer.get(
            customer._id || customer.customerId
          ) || {};

        return {
          ...customer,
          latestCallStatus:
            latestCall.status || customer.latestCallStatus,
          latestCallDuration:
            latestCall.durationSeconds ||
            customer.latestCallDuration ||
            0,
          latestLanguage:
            latestCall.language || customer.latestLanguage,
          latestCallAt:
            latestCall.startedAt ||
            latestCall.createdAt ||
            customer.latestCallAt,
          callDirection:
            latestCall.direction || customer.callDirection,
        };
      })
      .filter((customer) => {
        const text = [
          customer.name,
          customer.phoneNumber,
          customer.email,
          customer.customerId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (search && !text.includes(search.toLowerCase())) {
          return false;
        }

        if (
          interest &&
          customer.interestStatus !== interest
        ) {
          return false;
        }

        if (
          direction &&
          customer.callDirection !== direction
        ) {
          return false;
        }

        if (
          followUp === "required" &&
          !customer.followUpRequired
        ) {
          return false;
        }

        if (
          followUp === "not_required" &&
          customer.followUpRequired
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.latestCallAt || 0) -
          new Date(a.latestCallAt || 0)
      )
      .slice(0, 8);
  }, [customers, calls, search, interest, direction, followUp]);

  const stats = {
    totalCalls: calls.length,
    totalCustomers: customers.length,
    interested: customers.filter(
      (customer) =>
        customer.interestStatus === "interested"
    ).length,
    followUps: customers.filter(
      (customer) => customer.followUpRequired
    ).length,
  };

  const todayCalls = useMemo(() => {
    const today = new Date();

    return calls.filter((call) => {
      const value = call.startedAt || call.createdAt;

      if (!value) return false;

      const date = new Date(value);

      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    });
  }, [calls]);

  const handleNewCall = () => {
    setCallModalOpen(true);
  };

  const handleStartCallSubmit = async (phoneNumber) => {
    try {
      setActiveCallStatus({ phoneNumber, status: "initiating" });
      const response = await startCall(phoneNumber);
      setActiveCallStatus({ phoneNumber, status: "active", response });
      setCallModalOpen(false);
      // Reload dashboard data after starting call
      await loadDashboard();
    } catch (error) {
      setActiveCallStatus({ phoneNumber, status: "error", message: error.message });
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Header />

          <main className="px-5 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-[1600px]">
              <div className="mb-7">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                      Overview
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                      Dashboard
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      Monitor your AI sales calls, customers,
                      follow-ups and agent activity from one place.
                    </p>
                  </div>

                  <div className="text-sm text-slate-400">
                    {loading
                      ? "Updating dashboard..."
                      : `Showing ${recentCustomers.length} recent customers`}
                  </div>
                </div>
              </div>

              <DashboardStats stats={stats} />

              <div className="mt-5">
                <DashboardToolbar
                  search={search}
                  setSearch={setSearch}
                  interest={interest}
                  setInterest={setInterest}
                  direction={direction}
                  setDirection={setDirection}
                  followUp={followUp}
                  setFollowUp={setFollowUp}
                  onRefresh={loadDashboard}
                  onNewCall={handleNewCall}
                />
              </div>

              <div className="mt-5">
                <CustomerTable customers={recentCustomers} onCall={handleStartCallSubmit} />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="grid gap-5 md:grid-cols-2">
                  <QuickActions onNewCall={handleNewCall} />
                  <TodayActivity calls={todayCalls} />
                </div>

                <AgentStatusCard />
              </div>

              <CallModal
                open={callModalOpen}
                onClose={() => setCallModalOpen(false)}
                onCall={handleStartCallSubmit}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;