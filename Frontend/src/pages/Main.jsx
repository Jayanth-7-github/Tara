import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkLogin, logout } from "../services/auth";
import { getMyTestResults, fetchEvents } from "../services/api";
import EventsList from "../components/EventsList";

export default function Main() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hasTestResults, setHasTestResults] = useState(false);
  const [testLoading, setTestLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("token");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still navigate to login even if logout API fails
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await checkLogin();
        if (!response.authenticated) {
          navigate("/login", { replace: true });
        } else {
          setUser(response.user);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchTestResults = async () => {
      try {
        const response = await getMyTestResults();
        setHasTestResults(response.results && response.results.length > 0);
      } catch (error) {
        console.error("Error fetching test results:", error);
        setHasTestResults(false);
      } finally {
        setTestLoading(false);
      }
    };

    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        const data = await fetchEvents();
        setEvents(data.events || []);
      } catch (err) {
        console.error("Failed to load events:", err);
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    if (user) {
      fetchTestResults();
    }

    // load events regardless of user (so dashboard shows upcoming events)
    loadEvents();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="mt-2 text-gray-400 text-sm sm:text-base">
                {user
                  ? `Welcome back, ${user.name || user.email}!`
                  : "Quick overview of what's new. Jump into events and assignments."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {testLoading ? (
              <button
                disabled
                className="px-4 py-2 text-sm rounded-lg bg-gray-700 text-gray-400 cursor-not-allowed transition shadow"
              >
                Loading...
              </button>
            ) : hasTestResults ? (
              <button
                disabled
                className="px-4 py-2 text-sm rounded-lg bg-green-600/50 border border-green-500 text-green-200 cursor-not-allowed transition shadow"
              >
                ✓ Test Taken
              </button>
            ) : (
              <Link
                to="/test"
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 transition shadow"
              >
                Take a Test
              </Link>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Events — individual cards (no outer container) */}
          <div className="col-span-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Upcoming Events</h2>
            </div>

            {eventsLoading ? (
              <div className="py-6">
                <button
                  disabled
                  className="px-4 py-2 text-sm rounded-lg bg-gray-700 text-gray-400 cursor-not-allowed transition shadow"
                >
                  Loading events...
                </button>
              </div>
            ) : !events || events.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-400">
                  Events coming soon — check back later.
                </p>
              </div>
            ) : (
              <div>
                <EventsList events={events} loading={eventsLoading} />
              </div>
            )}
          </div>

          {/* Assignments preview (commented out)
          <section className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Assignments</h2>
              <Link
                to="/assignments"
                className="text-sm text-blue-400 hover:text-cyan-300"
              >
                View all →
              </Link>
            </div>
            <ul className="space-y-3">
              {[
                { id: 1, title: "Maths Worksheet 3", due: "Nov 18, 2025" },
                { id: 2, title: "Physics Lab Report", due: "Nov 22, 2025" },
                { id: 3, title: "CS Mini Project", due: "Dec 02, 2025" },
              ].map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between bg-gray-800/60 border border-gray-800 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="w-4 h-4"
                      >
                        <path d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-medium text-gray-100">{a.title}</p>
                      <p className="text-xs text-gray-400">Due {a.due}</p>
                    </div>
                  </div>
                  <Link
                    to="/assignments"
                    className="text-sm text-gray-300 hover:text-white"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </section>
            */}
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className="fixed bottom-6 right-6 z-50 px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 transition shadow flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
