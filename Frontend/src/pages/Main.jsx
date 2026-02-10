import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkLogin, logout } from "../services/auth";
import { checkTestTaken, fetchEvents } from "../services/api";
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
      try {
        window.dispatchEvent(new Event("auth-changed"));
      } catch (e) { }
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still navigate to login even if logout API fails
      localStorage.removeItem("token");
      try {
        window.dispatchEvent(new Event("auth-changed"));
      } catch (e) { }
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
        // call the lightweight check endpoint which returns { taken: boolean }
        const response = await checkTestTaken();
        setHasTestResults(Boolean(response && response.taken));
      } catch (error) {
        console.error("Error checking test taken:", error);
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

    // load events regardless of user (we may hide them from non-students/admins in the UI)
    loadEvents();
    const interval = setInterval(() => {
      loadEvents();
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying...</p>
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
            {/* header actions intentionally left blank */}
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
                <EventsList
                  events={events}
                  loading={eventsLoading}
                  hasTestResults={hasTestResults}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
