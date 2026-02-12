import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkLogin, logout } from "../services/auth";
import { checkTestTaken, fetchEvents } from "../services/api";
import EventsList from "../components/EventsList";
import FooterProfile from "../components/Footerprofile";
import { LampContainer } from "../components/ui/lamp";
import { BackgroundLines } from "../components/ui/background-lines";
import { motion } from "motion/react";

export default function Main() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hasTestResults, setHasTestResults] = useState(false);
  const [testLoading, setTestLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Capture token (and optional name) from Google OAuth redirect
  // and store token for debugging/auxiliary use. Core auth uses cookies.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (token) {
        localStorage.setItem("token", token);

        // Clean up URL so token isn't left in the address bar
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (e) {
      // ignore parsing errors
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("token");
      try {
        window.dispatchEvent(new Event("auth-changed"));
      } catch (e) {}
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still navigate to login even if logout API fails
      localStorage.removeItem("token");
      try {
        window.dispatchEvent(new Event("auth-changed"));
      } catch (e) {}
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
    <BackgroundLines className="bg-slate-950 text-white font-sans overflow-x-hidden">
      <div className="min-h-screen flex flex-col">
        {/* Hero Section with Lamp Effect */}
        <section className="relative">
          <LampContainer>
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                ease: "easeInOut",
              }}
              className="text-center px-4 sm:px-6"
            >
              <h1 className="bg-gradient-to-br from-slate-100 to-slate-400 pt-1 pb-4 bg-clip-text text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-transparent">
                {user
                  ? `Welcome back, ${user.name || "Student"}`
                  : "Tara Dashboard"}
              </h1>

              {/* Professional Matter Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mt-8 md:mt-12"
              >
                <h2 className="bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-200 to-neutral-500 text-xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                  See everything in one place.
                  <br />
                  Exams, events, results and more.
                </h2>
                <p className="mt-4 max-w-xl mx-auto text-sm md:text-lg text-neutral-400 text-center">
                  Quickly check upcoming events, know if you have tests left to
                  write, and jump straight to results or attendance without
                  searching around.
                </p>
              </motion.div>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() =>
                    document
                      .getElementById("events-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                >
                  View Upcoming Events
                </button>
                <button
                  onClick={handleLogout}
                  className="px-8 py-3 rounded-full border border-slate-700 hover:bg-slate-800 text-slate-300 transition-all font-medium"
                >
                  Logout
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 2, repeat: Infinity }}
                className="mt-10 md:mt-20 hidden md:flex flex-col items-center gap-2 text-slate-500"
              >
                <span className="text-sm uppercase tracking-widest">
                  Scroll for Events
                </span>
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-transparent rounded-full animate-bounce" />
              </motion.div>
            </motion.div>
          </LampContainer>
        </section>

        {/* Events Section */}
        <section
          id="events-section"
          className="relative w-full px-3 sm:px-4 pt-12 md:pt-20 flex justify-center flex-1"
        >
          <div className="max-w-6xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-12 text-center"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-blue-400 to-cyan-200">
                Upcoming Events
              </h1>
              <p className="mt-4 text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto font-medium">
                Jump into events and assignments. Quick overview of what's new.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-6">
              {eventsLoading ? (
                <div className="flex justify-center py-12 sm:py-20">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !events || events.length === 0 ? (
                <div className="text-center py-12 sm:py-20 bg-slate-900/50 rounded-3xl border border-slate-800 backdrop-blur-sm">
                  <p className="text-slate-500 text-xl font-medium">
                    Events coming soon — check back later.
                  </p>
                </div>
              ) : (
                <div className="pb-20">
                  <EventsList
                    events={events}
                    loading={eventsLoading}
                    hasTestResults={hasTestResults}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <FooterProfile />
      </div>
    </BackgroundLines>
  );
}
