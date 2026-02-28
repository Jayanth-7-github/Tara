import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBrandTabler,
  IconCalendarEvent,
  IconClipboardList,
  IconUsersGroup,
  IconUserCheck,
  IconSettings,
  IconLogout,
  IconRefresh,
  IconPlus,
} from "@tabler/icons-react";

import { checkLogin, logout } from "../services/auth";
import {
  fetchEvents,
  API_BASE,
  generateEventKey,
  revokeEventKey,
} from "../services/api";
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import { cn } from "../lib/utils";
import ManageStudents from "./ManageStudents";
import StudentResults from "./StudentResults";
import EventSessions from "./EventSessions";
import ManageQuestions from "./ManageQuestions";

// ─── Logo ────────────────────────────────────────────────────────────────────
const Logo = () => (
  <a
    href="#"
    className="relative z-20 flex items-center gap-2 py-1 text-sm font-semibold text-white"
  >
    <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-linear-to-br from-blue-500 to-cyan-400" />
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="whitespace-pre bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent font-bold tracking-tight"
    >
      Tara Manager
    </motion.span>
  </a>
);

const LogoIcon = () => (
  <a href="#" className="relative z-20 flex items-center py-1">
    <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-linear-to-br from-blue-500 to-cyan-400" />
  </a>
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
const colorVariants = {
  blue: "border-blue-500/20 hover:border-blue-500/50 bg-blue-500/10 text-blue-400",
  green:
    "border-green-500/20 hover:border-green-500/50 bg-green-500/10 text-green-400",
  purple:
    "border-purple-500/20 hover:border-purple-500/50 bg-purple-500/10 text-purple-400",
  yellow:
    "border-yellow-500/20 hover:border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  orange:
    "border-orange-500/20 hover:border-orange-500/50 bg-orange-500/10 text-orange-400",
};

const StatCard = ({ title, value, sub, icon, color, onClick }) => {
  const cls = colorVariants[color] || "";
  const parts = cls.split(" ");
  const bg = parts[2] || "";
  const text = parts[3] || "";
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border p-5 transition-all duration-200 backdrop-blur bg-neutral-800/60",
        cls,
        onClick && "cursor-pointer hover:bg-neutral-700/40",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          {title}
        </p>
        <span className={cn("p-2 rounded-lg", bg, text)}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function EventManagerDashboard() {
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);

  const [events, setEvents] = useState([]);
  const [imageError, setImageError] = useState({});
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    totalAttendance: 0,
    upcomingEvents: 0,
    pastEvents: 0,
  });

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        const res = await checkLogin();
        if (!mounted) return;

        if (!res?.authenticated || !res?.user) {
          navigate("/login", { replace: true });
          return;
        }

        const ud = res.user;
        // Allow admin and member as event managers
        if (ud.role !== "admin" && ud.role !== "member") {
          navigate("/main", { replace: true });
          return;
        }

        setUser(ud);
        setAuthorized(true);
      } catch {
        if (mounted) navigate("/login", { replace: true });
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    };

    verify();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const loadData = async () => {
    if (!user) return;
    setLoadingEvents(true);
    try {
      const res = await fetchEvents();
      const all = Array.isArray(res?.events)
        ? res.events
        : Array.isArray(res)
          ? res
          : [];

      const managed = all.filter((e) => {
        if (!user?.email) return true;
        return e.managerEmail === user.email;
      });

      setEvents(managed);

      let totalRegistrations = 0;
      let totalAttendance = 0;
      let upcomingEvents = 0;
      let pastEvents = 0;
      const now = new Date();

      managed.forEach((e) => {
        const reg = e.registeredCount || 0;
        const att = e.attendedCount || 0;
        totalRegistrations += reg;
        totalAttendance += att;
        const d = new Date(e.date);
        if (d > now) upcomingEvents += 1;
        else pastEvents += 1;
      });

      setStats({
        totalEvents: managed.length,
        totalRegistrations,
        totalAttendance,
        upcomingEvents,
        pastEvents,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (!authorized || !user) return;
    loadData();
  }, [authorized, user]);

  const handleGenerateKey = async (id) => {
    try {
      await generateEventKey(id);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to generate key");
    }
  };

  const handleRevokeKey = async (id) => {
    if (!window.confirm("Revoke access key for this event?")) return;
    try {
      await revokeEventKey(id);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to revoke key");
    }
  };

  const [toggleMcqLoading, setToggleMcqLoading] = useState({});
  const [toggleCodingLoading, setToggleCodingLoading] = useState({});

  const handleToggleMcq = async (id, enabled) => {
    try {
      setToggleMcqLoading((prev) => ({ ...prev, [id]: true }));
      const response = await fetch(`${API_BASE}/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMcqEnabled: enabled }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update MCQ test status");
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to update MCQ test status");
    } finally {
      setToggleMcqLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleToggleCoding = async (id, enabled) => {
    try {
      setToggleCodingLoading((prev) => ({ ...prev, [id]: true }));
      const response = await fetch(`${API_BASE}/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCodingEnabled: enabled }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update Coding test status");
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to update Coding test status");
    } finally {
      setToggleCodingLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">
            Loading manager dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized || !user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-white mb-2">Access Denied</p>
          <p className="text-neutral-400 text-sm">
            You do not have permission to view the Event Manager dashboard.
          </p>
        </div>
      </div>
    );
  }

  const navLinks = [
    {
      label: "Overview",
      section: "overview",
      icon: <IconBrandTabler size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Attendance",
      section: "attendance",
      icon: (
        <IconClipboardList size={20} className="text-neutral-300 shrink-0" />
      ),
    },
    {
      label: "Sessions",
      section: "sessions",
      icon: (
        <IconCalendarEvent size={20} className="text-neutral-300 shrink-0" />
      ),
    },
    {
      label: "Students",
      section: "students",
      icon: <IconUsersGroup size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Questions",
      section: "questions",
      icon: <IconSettings size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Results",
      section: "results",
      icon: <IconUserCheck size={20} className="text-neutral-300 shrink-0" />,
    },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "attendance":
        return <AttendanceSection navigate={navigate} user={user} />;
      case "sessions":
        return <SessionsSection />;
      case "students":
        return <ManagerStudentsSection />;
      case "questions":
        return <ManageQuestions />;
      case "results":
        return <ManagerResultsSection />;
      default:
        return (
          <ManagerOverviewSection
            user={user}
            stats={stats}
            events={events}
            imageError={imageError}
            setImageError={setImageError}
            handleGenerateKey={handleGenerateKey}
            handleRevokeKey={handleRevokeKey}
            handleToggleMcq={handleToggleMcq}
            handleToggleCoding={handleToggleCoding}
            toggleMcqLoading={toggleMcqLoading}
            toggleCodingLoading={toggleCodingLoading}
            navigate={navigate}
            loadData={loadData}
            loadingEvents={loadingEvents}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-950 flex-col md:flex-row">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-8">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto gap-1">
            {sidebarOpen ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-1">
              {navLinks.map((link) => (
                <SidebarLink
                  key={link.section}
                  link={{ label: link.label, href: "#", icon: link.icon }}
                  onClick={() => {
                    setActiveSection(link.section);
                    setSidebarOpen(false);
                  }}
                  className={
                    activeSection === link.section
                      ? "bg-white/10 text-white"
                      : ""
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: user?.name || user?.email || "Manager",
                href: "#",
                icon: (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-linear-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                    {(user?.name || user?.email || "M")[0].toUpperCase()}
                  </div>
                ),
              }}
            />
            <SidebarLink
              link={{
                label: "Logout",
                href: "#",
                icon: (
                  <IconLogout size={20} className="text-neutral-400 shrink-0" />
                ),
              }}
              onClick={async () => {
                try {
                  await logout();
                } catch (e) {
                  // ignore logout error and still redirect
                }
                navigate("/login", { replace: true });
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      <main className="flex-1 overflow-y-auto bg-neutral-950 text-white w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Section: Overview ──────────────────────────────────────────────────────
function ManagerOverviewSection({
  user,
  stats,
  events,
  imageError,
  setImageError,
  handleGenerateKey,
  handleRevokeKey,
  handleToggleMcq,
  handleToggleCoding,
  toggleMcqLoading,
  toggleCodingLoading,
  navigate,
  loadData,
  loadingEvents,
}) {
  const attendanceRate =
    stats.totalRegistrations > 0
      ? Math.round((stats.totalAttendance / stats.totalRegistrations) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Event Manager
            </h1>
            <p className="text-neutral-400 text-sm mt-0.5">
              View and manage your events
            </p>
          </div>
          <button
            onClick={() => navigate("/events/create")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition"
          >
            <IconPlus size={15} /> Create Event
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            sub="All time"
            icon={<IconCalendarEvent size={18} />}
            color="blue"
          />
          <StatCard
            title="Registrations"
            value={stats.totalRegistrations}
            sub="Across your events"
            icon={<IconUsersGroup size={18} />}
            color="green"
          />
          <StatCard
            title="Attendance"
            value={stats.totalAttendance}
            sub={`${attendanceRate}% rate`}
            icon={<IconUserCheck size={18} />}
            color="purple"
          />
        </div>

        {/* Overview Detail: Event status */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="rounded-xl border border-neutral-700/60 bg-neutral-900/70 p-5 backdrop-blur">
            <h3 className="text-sm font-semibold text-white mb-4">
              Event Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm text-neutral-300">
                    Upcoming Events
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  {stats.upcomingEvents}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
                  <span className="text-sm text-neutral-300">
                    Completed Events
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  {stats.pastEvents}
                </span>
              </div>
              {stats.totalEvents > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Completion</span>
                    <span>
                      {Math.round((stats.pastEvents / stats.totalEvents) * 100)}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-cyan-400 rounded-full"
                      style={{
                        width: `${Math.round(
                          (stats.pastEvents / stats.totalEvents) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Your Events</h2>
              <p className="text-sm text-gray-400 mt-1">
                Manage and monitor your events
              </p>
            </div>
            {loadingEvents && (
              <span className="text-xs text-neutral-400">Loading...</span>
            )}
          </div>

          {events.length === 0 && !loadingEvents ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
                <IconCalendarEvent size={28} className="text-gray-500" />
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
                const id = event._id || event.id;
                const apiBase = API_BASE.replace(/\/$/, "");
                const cacheBustSource = event.updatedAt || event.createdAt;
                const cacheBust = cacheBustSource
                  ? `?v=${new Date(cacheBustSource).getTime()}`
                  : "";
                const imageSrc =
                  event.imageUrl || `${apiBase}/events/${id}/image${cacheBust}`;

                return (
                  <div
                    key={id}
                    className="px-6 py-4 hover:bg-gray-700/30 transition"
                  >
                    <div className="flex items-start gap-4">
                      {/* Event Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-700 shrink-0">
                        {imageSrc && !imageError[id] ? (
                          <img
                            src={imageSrc}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            onError={() =>
                              setImageError((prev) => ({
                                ...prev,
                                [id]: true,
                              }))
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
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                              <span>
                                {eventDate.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                })}
                              </span>
                              <span>
                                {eventDate.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {event.venue && <span>{event.venue}</span>}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium",
                              isUpcoming
                                ? "bg-green-500/10 text-green-400"
                                : "bg-gray-500/10 text-gray-400",
                            )}
                          >
                            {isUpcoming ? "Upcoming" : "Completed"}
                          </span>
                        </div>

                        {event.accessKey ? (
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                              <span className="text-xs text-blue-300 uppercase tracking-wide">
                                Access Key
                              </span>
                              <span className="text-sm font-mono font-bold text-blue-300 tracking-wider">
                                {event.accessKey}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRevokeKey(id)}
                              className="text-xs text-red-500 hover:text-red-400 font-medium transition"
                            >
                              Revoke
                            </button>
                            <button
                              onClick={() => handleGenerateKey(id)}
                              className="text-xs text-blue-500 hover:text-blue-400 font-medium transition"
                            >
                              Regenerate
                            </button>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <button
                              onClick={() => handleGenerateKey(id)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg border border-gray-700 transition text-sm font-medium"
                            >
                              <span className="text-base leading-none">+</span>
                              Generate Member Key
                            </button>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Generate a key to allow team access without login
                            </p>
                          </div>
                        )}

                        {/* Event Stats */}
                        <div className="flex flex-wrap items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-300 font-semibold">
                              {event.registeredCount || 0}
                            </span>
                            <span className="text-gray-500">registered</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-300 font-semibold">
                              {event.attendedCount || 0}
                            </span>
                            <span className="text-gray-500">attended</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-purple-300 font-semibold">
                              {event.registeredCount > 0
                                ? `${Math.round(
                                    ((event.attendedCount || 0) /
                                      event.registeredCount) *
                                      100,
                                  )}%`
                                : "N/A"}
                            </span>
                            <span className="text-gray-500">attendance</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleToggleMcq(id, !event.isMcqEnabled)
                              }
                              disabled={toggleMcqLoading[id]}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
                                event.isMcqEnabled
                                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                  : "bg-green-500/10 text-green-400 border border-green-500/30"
                              }`}
                            >
                              {toggleMcqLoading[id]
                                ? event.isMcqEnabled
                                  ? "Disabling..."
                                  : "Enabling..."
                                : event.isMcqEnabled
                                  ? "Disable Test 1 (MCQ)"
                                  : "Enable Test 1 (MCQ)"}
                            </button>

                            <button
                              onClick={() =>
                                handleToggleCoding(id, !event.isCodingEnabled)
                              }
                              disabled={toggleCodingLoading[id]}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
                                event.isCodingEnabled
                                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                  : "bg-green-500/10 text-green-400 border border-green-500/30"
                              }`}
                            >
                              {toggleCodingLoading[id]
                                ? event.isCodingEnabled
                                  ? "Disabling..."
                                  : "Enabling..."
                                : event.isCodingEnabled
                                  ? "Disable Test 2 (Coding)"
                                  : "Enable Test 2 (Coding)"}
                            </button>
                          </div>
                          <button
                            onClick={() =>
                              navigate(`/events/${id}/registrations`)
                            }
                            className="text-xs text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
                          >
                            View registrations
                          </button>
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

// ─── Section: Attendance ────────────────────────────────────────────────────
function AttendanceSection({ navigate, user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then((d) => {
        const all = Array.isArray(d?.events)
          ? d.events
          : Array.isArray(d)
            ? d
            : [];

        let filtered = all;

        // For non-admins, only show events they manage
        if (user && user.role !== "admin" && user.email) {
          filtered = all.filter(
            (ev) => ev.managerEmail && ev.managerEmail === user.email,
          );
        }

        setEvents(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const links = [
    {
      label: "Mark Attendance",
      desc: "Record student attendance for events",
      color: "green",
      icon: <IconClipboardList size={22} />,
      href: "/member/Attendance",
    },
    {
      label: "Manage Attendance",
      desc: "Detailed attendance manager",
      color: "purple",
      icon: <IconUserCheck size={22} />,
      href: "/events/attendance",
    },
    {
      label: "View Reports",
      desc: "Attendance summaries & analytics",
      color: "orange",
      icon: <IconSettings size={22} />,
      href: "/member/summary",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-linear-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
          Attendance
        </h1>
        <p className="text-neutral-400 text-sm mt-0.5">
          Manage event attendance across all sessions
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {links.map((l) => (
          <button
            key={l.label}
            onClick={() => navigate(l.href)}
            className="group rounded-xl border border-neutral-700 bg-neutral-800/60 p-5 text-left hover:bg-neutral-700/30 transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-lg bg-green-500/10 text-green-400">
                {l.icon}
              </span>
              <h3 className="font-semibold text-white">{l.label}</h3>
            </div>
            <p className="text-sm text-neutral-400">{l.desc}</p>
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-700/50 bg-neutral-800/60">
          <div className="px-6 py-4 border-b border-neutral-700/50">
            <h2 className="text-base font-semibold text-white">
              Events Overview
            </h2>
          </div>
          <div className="divide-y divide-neutral-700/50">
            {events.length === 0 ? (
              <p className="px-6 py-10 text-center text-neutral-400 text-sm">
                No events found
              </p>
            ) : (
              events.map((ev) => {
                const total = ev.registeredCount || 0;
                const attended = ev.attendedCount || 0;
                const rate = total ? Math.round((attended / total) * 100) : 0;
                return (
                  <div
                    key={ev._id || ev.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {ev.title}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(ev.date).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">
                        {attended}/{total}
                      </p>
                      <div className="w-24 h-1.5 bg-neutral-700 rounded-full mt-1">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {rate}% attendance
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Sessions ──────────────────────────────────────────────────────
function SessionsSection() {
  return <EventSessions />;
}

// ─── Section: Students ──────────────────────────────────────────────────────
function ManagerStudentsSection() {
  // Reuse the full ManageStudents page inside the dashboard content area
  return <ManageStudents />;
}

// ─── Section: Results ───────────────────────────────────────────────────────
function ManagerResultsSection() {
  return <StudentResults />;
}
