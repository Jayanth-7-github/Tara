import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkLogin } from "../services/auth";
import { fetchEvents, API_BASE, getAllTestResults } from "../services/api";
import { ADMIN_TOKEN } from "../services/constants";

export default function EventManagerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [imageError, setImageError] = useState({});

  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    totalAttendance: 0,
    upcomingEvents: 0,
    pastEvents: 0,
  });

  // Auto-refresh every 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [authorized]);

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
        // Only admins and members (event managers) can access
        if (role === "admin" || role === "member") {
          setAuthorized(true);
        } else {
          setAuthorized(false);
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

  const loadData = async () => {
    if (!authorized || !user) return;
    try {
      const data = await fetchEvents();
      const allEvents = data.events || data || [];

      // Filter events managed by current user
      const userEmail = (user.email || "").toLowerCase().trim();
      const managedEvents = allEvents.filter((ev) => {
        const managerEmail = (ev.managerEmail || "").toLowerCase().trim();
        return managerEmail === userEmail;
      });

      setEvents(managedEvents);

      // Calculate statistics
      const now = new Date();
      const totalRegistrations = managedEvents.reduce(
        (sum, ev) => sum + (ev.registeredCount || 0),
        0,
      );
      const totalAttendance = managedEvents.reduce(
        (sum, ev) => sum + (ev.attendedCount || 0),
        0,
      );
      const upcomingEvents = managedEvents.filter(
        (ev) => new Date(ev.date) > now,
      ).length;
      const pastEvents = managedEvents.filter(
        (ev) => new Date(ev.date) <= now,
      ).length;

      setStats({
        totalEvents: managedEvents.length,
        totalRegistrations,
        totalAttendance,
        upcomingEvents,
        pastEvents,
      });
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-400 mb-6">
            You need to be an event manager to access this dashboard.
          </p>
          <button
            onClick={() => navigate("/main")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Event Manager Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Welcome back, {user?.name || user?.email}
              </p>
            </div>
            <div className="flex gap-3">
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
              <button
                onClick={() => navigate("/events/create")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Event
              </button>
            </div>
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

          <div
            onClick={() => navigate("/events/all-registrations")}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-green-500/50 transition cursor-pointer hover:bg-gray-700/30"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Registrations
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
            <p className="text-xs text-gray-500 mt-1">Total students</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Attendance</h3>
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
              {stats.totalRegistrations > 0
                ? `${Math.round(
                  (stats.totalAttendance / stats.totalRegistrations) * 100,
                )}% attendance rate`
                : "No data"}
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Upcoming</h3>
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.upcomingEvents}
            </p>
            <p className="text-xs text-gray-500 mt-1">Events scheduled</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-gray-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Completed</h3>
              <div className="p-2 bg-gray-500/10 rounded-lg">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.pastEvents}</p>
            <p className="text-xs text-gray-500 mt-1">Past events</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate("/events/contacts")}
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
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
              View Contacts
            </h3>
            <p className="text-sm text-gray-400">
              Manage student inquiries and registrations
            </p>
          </button>

          <button
            onClick={() => navigate(`/member/Attendance/${ADMIN_TOKEN}`)}
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
              Mark Attendance
            </h3>
            <p className="text-sm text-gray-400">
              Record student attendance for events
            </p>
          </button>

          <button
            onClick={() => navigate(`/member/summary/${ADMIN_TOKEN}`)}
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
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
              View Reports
            </h3>
            <p className="text-sm text-gray-400">
              Access attendance summaries and analytics
            </p>
          </button>

          <button
            onClick={() => navigate("/events/questions")}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-pink-500/50 transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-pink-500/10 rounded-lg group-hover:bg-pink-500/20 transition">
                <svg
                  className="w-6 h-6 text-pink-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-pink-400 transition"
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
              Test Questions
            </h3>
            <p className="text-sm text-gray-400">
              Set up MCQs and Coding problems
            </p>
          </button>

          <button
            onClick={() => navigate("/events/approvals")}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition">
                <svg
                  className="w-6 h-6 text-yellow-400"
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
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-yellow-400 transition"
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
              Manage Approvals
            </h3>
            <p className="text-sm text-gray-400">
              Review and approve registration requests
            </p>
          </button>

          <button
            onClick={() => navigate("/events/results")}
            className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-teal-500/50 transition text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-teal-500/10 rounded-lg group-hover:bg-teal-500/20 transition">
                <svg
                  className="w-6 h-6 text-teal-400"
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
                className="w-5 h-5 text-gray-600 group-hover:text-teal-400 transition"
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
              Student Results
            </h3>
            <p className="text-sm text-gray-400">
              View assessment scores and reports
            </p>
          </button>
        </div>

        {/* Events List */}
        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Your Events</h2>
            <p className="text-sm text-gray-400 mt-1">
              Manage and monitor your events
            </p>
          </div>

          {events.length === 0 ? (
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
              <p className="text-sm text-gray-500 mb-4">
                Create your first event to get started
              </p>
              <button
                onClick={() => navigate("/events/create")}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Create Event
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {events.map((event) => {
                const eventDate = new Date(event.date);
                const isUpcoming = eventDate > new Date();
                const apiBase = API_BASE.replace(/\/$/, "");
                const id = event._id || event.id;
                const cacheBustSource = event.updatedAt || event.createdAt;
                const cacheBust = cacheBustSource
                  ? `?v=${new Date(cacheBustSource).getTime()}`
                  : "";
                const imageSrc =
                  event.imageUrl || `${apiBase}/events/${id}/image${cacheBust}`;

                return (
                  <div
                    key={event._id || event.id}
                    className="px-6 py-4 hover:bg-gray-700/30 transition"
                  >
                    <div className="flex items-start gap-4">
                      {/* Event Image */}
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-700 shrink-0">
                        {imageSrc && !imageError[id] ? (
                          <img
                            src={imageSrc}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            onError={() =>
                              setImageError((prev) => ({ ...prev, [id]: true }))
                            }
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-1">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
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
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                {eventDate.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                })}
                              </span>
                              <span className="flex items-center gap-1">
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
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                {eventDate.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="flex items-center gap-1">
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
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${isUpcoming
                              ? "bg-green-500/10 text-green-400"
                              : "bg-gray-500/10 text-gray-400"
                              }`}
                          >
                            {isUpcoming ? "Upcoming" : "Completed"}
                          </span>
                        </div>

                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                          {event.description}
                        </p>

                        {/* Event Stats */}
                        <div className="flex items-center gap-6">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/50 rounded p-1 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/events/${event._id || event.id}/registrations`);
                            }}
                          >
                            <div className="p-1.5 bg-blue-500/10 rounded">
                              <svg
                                className="w-4 h-4 text-blue-400"
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
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {event.registeredCount || 0}
                              </p>
                              <p className="text-xs text-gray-500">
                                Registered
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-500/10 rounded">
                              <svg
                                className="w-4 h-4 text-green-400"
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
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {event.attendedCount || 0}
                              </p>
                              <p className="text-xs text-gray-500">Attended</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-500/10 rounded">
                              <svg
                                className="w-4 h-4 text-purple-400"
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
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {event.registeredCount > 0
                                  ? `${Math.round(
                                    ((event.attendedCount || 0) /
                                      event.registeredCount) *
                                    100,
                                  )}%`
                                  : "N/A"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Attendance
                              </p>
                            </div>
                          </div>
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
