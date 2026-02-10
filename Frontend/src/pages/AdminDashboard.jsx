import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkLogin } from "../services/auth";
import {
  fetchEvents,
  getSummary,
  getMyContacts,
  API_BASE,
} from "../services/api";
import { ADMIN_TOKEN } from "../services/constants";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    totalAttendance: 0,
    totalStudents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
    attendanceRate: 0,
    unreadContacts: 0,
    activeManagers: 0,
  });

  // Auto-refresh every 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      try {
        const res = await checkLogin();
        if (!mounted) return;
        if (!res.authenticated) {
          navigate("/login", { replace: true });
          return;
        }
        const userData = res.user || {};
        setUser(userData);
        const role = userData.role;
        // Only admins can access
        if (role !== "admin") {
          navigate("/main", { replace: true });
          return;
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (mounted) navigate("/login", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    verify();
    return () => (mounted = false);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Fetch all events
      const eventsData = await fetchEvents();
      const allEvents = eventsData.events || eventsData || [];
      setEvents(allEvents);

      const now = new Date();
      const upcomingEvents = allEvents.filter(
        (ev) => new Date(ev.date) > now
      ).length;
      const pastEvents = allEvents.filter(
        (ev) => new Date(ev.date) <= now
      ).length;

      // Get recent events (last 5)
      const sortedEvents = [...allEvents].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setRecentEvents(sortedEvents.slice(0, 5));

      const totalRegistrations = allEvents.reduce(
        (sum, ev) => sum + (ev.registeredCount || 0),
        0
      );
      const totalAttendance = allEvents.reduce(
        (sum, ev) => sum + (ev.attendedCount || 0),
        0
      );

      // Count unique event managers
      const uniqueManagers = new Set(
        allEvents.map((ev) => ev.managerEmail).filter(Boolean)
      );

      // Fetch contacts
      let unreadCount = 0;
      try {
        const contactsData = await getMyContacts();
        const allContacts = contactsData.contacts || [];
        setContacts(allContacts.slice(0, 5)); // Keep last 5
        unreadCount = allContacts.filter((c) => c.status === "unread").length;
      } catch (err) {
        console.error("Failed to load contacts:", err);
      }

      // Fetch attendance summary
      try {
        const summaryData = await getSummary();
        const totalStudents = summaryData?.totalStudents || 0;

        setStats({
          totalEvents: allEvents.length,
          totalRegistrations,
          totalAttendance,
          totalStudents,
          upcomingEvents,
          pastEvents,
          attendanceRate:
            totalRegistrations > 0
              ? Math.round((totalAttendance / totalRegistrations) * 100)
              : 0,
          unreadContacts: unreadCount,
          activeManagers: uniqueManagers.size,
        });
      } catch (err) {
        console.error("Failed to load summary:", err);
        setStats({
          totalEvents: allEvents.length,
          totalRegistrations,
          totalAttendance,
          totalStudents: 0,
          upcomingEvents,
          pastEvents,
          attendanceRate:
            totalRegistrations > 0
              ? Math.round((totalAttendance / totalRegistrations) * 100)
              : 0,
          unreadContacts: unreadCount,
          activeManagers: uniqueManagers.size,
        });
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 mt-1">System Overview & Management</p>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
              title="Refresh data"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Auto-refreshes every 30 seconds • Last updated:{" "}
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Total Events
              </h3>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalEvents}</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-green-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Total Registrations
              </h3>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.totalRegistrations}
            </p>
            <p className="text-xs text-gray-500 mt-1">Across all events</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Total Attendance
              </h3>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <svg
                  className="w-5 h-5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.totalAttendance}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.attendanceRate}% attendance rate
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Total Students
              </h3>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <svg
                  className="w-5 h-5 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.totalStudents}
            </p>
            <p className="text-xs text-gray-500 mt-1">In database</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-orange-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Event Managers
              </h3>
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <svg
                  className="w-5 h-5 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.activeManagers}
            </p>
            <p className="text-xs text-gray-500 mt-1">Active managers</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Event Status</h3>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-300">Upcoming Events</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  {stats.upcomingEvents}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-gray-300">Completed Events</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  {stats.pastEvents}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Pending Actions
              </h3>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Unread Contacts</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${stats.unreadContacts > 0
                    ? "bg-red-500/10 text-red-400"
                    : "bg-green-500/10 text-green-400"
                    }`}
                >
                  {stats.unreadContacts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Upcoming Events</span>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium">
                  {stats.upcomingEvents}
                </span>
              </div>
              <button
                onClick={() => navigate("/events/contacts")}
                className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition"
              >
                View All Contacts
              </button>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                System Health
              </h3>
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Database</span>
                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-medium">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">API Server</span>
                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-medium">
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Auto-Refresh</span>
                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/events/dashboard")}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Event Manager
            </h3>
            <p className="text-sm text-gray-400">Manage all events</p>
          </button>

          <button
            onClick={() => navigate(`/admin/manage-attendance/${ADMIN_TOKEN}`)}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-green-500/50 transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Manage Attendance
            </h3>
            <p className="text-sm text-gray-400">Control attendance records</p>
          </button>

          <button
            onClick={() => navigate(`/admin/roles/${ADMIN_TOKEN}`)}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              User Roles
            </h3>
            <p className="text-sm text-gray-400">Assign user permissions</p>
          </button>

          <button
            onClick={() => navigate(`/admin/secret/${ADMIN_TOKEN}`)}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-orange-500/50 transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition">
                <svg
                  className="w-6 h-6 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-orange-400 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Admin Portal
            </h3>
            <p className="text-sm text-gray-400">Advanced settings</p>
          </button>
        </div>

        {/* Recent Events */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Recent Events</h2>
            <p className="text-sm text-gray-400 mt-1">
              Latest events in the system
            </p>
          </div>

          {recentEvents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">
                No Events Yet
              </h3>
              <p className="text-sm text-gray-500">
                Events will appear here once created
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {recentEvents.map((event) => {
                const eventDate = new Date(event.date);
                const isUpcoming = eventDate > new Date();
                const apiBase = API_BASE.replace(/\/$/, "");
                const imageSrc =
                  event.imageUrl ||
                  `${apiBase}/events/${event._id || event.id}/image`;

                return (
                  <div
                    key={event._id || event.id}
                    className="px-6 py-4 hover:bg-gray-700/30 transition cursor-pointer"
                    onClick={() => navigate("/events/dashboard")}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        {imageSrc && (
                          <img
                            src={imageSrc}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h3 className="text-base font-semibold text-white">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                {eventDate.toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                {event.venue}
                              </span>
                              <span className="text-gray-500">
                                By: {event.managerEmail || "Unknown"}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${isUpcoming
                              ? "bg-green-500/10 text-green-400"
                              : "bg-gray-500/10 text-gray-400"
                              }`}
                          >
                            {isUpcoming ? "Upcoming" : "Completed"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-400">
                            {event.registeredCount || 0} registered
                          </span>
                          <span className="text-xs text-gray-400">
                            {event.attendedCount || 0} attended
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
