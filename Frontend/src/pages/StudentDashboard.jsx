import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkLogin } from "../services/auth";
import { fetchEvents, getMyTestStats, fetchStudent, API_BASE } from "../services/api";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [testStats, setTestStats] = useState(null);
  const [stats, setStats] = useState({
    registeredEvents: 0,
    attendedEvents: 0,
    upcomingEvents: 0,
    completedTests: 0,
    pendingTests: 0,
  });

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
        // Only students can access
        if (role !== "student" && role !== "user") {
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
      const interval = setInterval(loadData, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const data = await fetchEvents();
      const allEvents = data.events || data || [];

      let registeredEventIds = [];
      let studentData = null;

      if (user.regno) {
        try {
          studentData = await fetchStudent(user.regno);
          if (studentData && studentData.registrations) {
            registeredEventIds = studentData.registrations.map(r =>
              typeof r.event === 'object' ? r.event._id : r.event
            );
          }
        } catch (err) {
          console.warn("Could not fetch student profile (likely not yet registered as Student):", err);
        }
      }

      const registeredEvents = allEvents.filter((ev) =>
        registeredEventIds.includes(ev._id || ev.id)
      );

      const attendedEvents = [];
      const now = new Date();
      const upcoming = registeredEvents.filter(
        (ev) => new Date(ev.date) > now
      ).length;

      setEvents(registeredEvents);

      try {
        const testData = await getMyTestStats();
        setTestStats(testData);
        setStats({
          registeredEvents: registeredEvents.length,
          attendedEvents: 0,
          upcomingEvents: upcoming,
          completedTests: testData?.totalTests || 0,
          pendingTests: registeredEvents.length - (testData?.totalTests || 0),
        });
      } catch (err) {
        console.error("Failed to load test stats:", err);
        setStats({
          registeredEvents: registeredEvents.length,
          attendedEvents: 0,
          upcomingEvents: upcoming,
          completedTests: 0,
          pendingTests: 0,
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Student Portal
          </h1>
          <p className="text-gray-400 mt-1">
            Welcome, {user?.name || user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Registered Events
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.registeredEvents}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total enrolled</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-green-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Events Attended
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.attendedEvents}
            </p>
            <p className="text-xs text-gray-500 mt-1">Participation</p>
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

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Assessments
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.completedTests}
            </p>
            <p className="text-xs text-gray-500 mt-1">Tests submitted</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-orange-500/50 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">
                Participation Rate
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
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.registeredEvents > 0
                ? `${Math.round(
                  (stats.attendedEvents / stats.registeredEvents) * 100
                )}%`
                : "0%"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Engagement level</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate("/main")}
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
              Browse Events
            </h3>
            <p className="text-sm text-gray-400">
              Explore and register for new events
            </p>
          </button>

          <button
            onClick={() => navigate("/realtest")}
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
              Start Assessment
            </h3>
            <p className="text-sm text-gray-400">
              Access your scheduled evaluations
            </p>
          </button>

          <button
            onClick={() => navigate("/assignments")}
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
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
              Submission History
            </h3>
            <p className="text-sm text-gray-400">
              Review your past activities and results
            </p>
          </button>
        </div>

        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              My Registered Events
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Events you've enrolled in
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
                No Registered Events
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Browse events and register to get started
              </p>
              <button
                onClick={() => navigate("/main")}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Browse Events
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {events.map((event) => {
                const eventDate = new Date(event.date);
                const isUpcoming = eventDate > new Date();
                const apiBase = API_BASE.replace(/\/$/, "");
                const imageSrc =
                  event.imageUrl ||
                  `${apiBase}/events/${event._id || event.id}/image`;
                const userId = user._id || user.id;
                const hasAttended = (event.attendedUsers || []).includes(
                  userId
                );

                return (
                  <div
                    key={event._id || event.id}
                    className="px-6 py-4 hover:bg-gray-700/30 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        {imageSrc && (
                          <img
                            src={imageSrc}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

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
                                {eventDate.toLocaleDateString()}
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
                          <div className="flex flex-col gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${isUpcoming
                                ? "bg-green-500/10 text-green-400"
                                : "bg-gray-500/10 text-gray-400"
                                }`}
                            >
                              {isUpcoming ? "Scheduled" : "Concluded"}
                            </span>
                            {hasAttended && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                          {event.description}
                        </p>
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
