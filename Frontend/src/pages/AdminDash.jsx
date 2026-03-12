import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBrandTabler,
  IconClipboardList,
  IconShieldLock,
  IconUsersGroup,
  IconSettings,
  IconLogout,
  IconRefresh,
  IconPlus,
  IconCalendarEvent,
  IconUserCheck,
  IconMailOpened,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconSearch,
  IconX,
} from "@tabler/icons-react";

import { checkLogin, logout } from "../services/auth";
import {
  fetchEvents,
  getSummary,
  getMyContacts,
  getOrganizerApplications,
  updateContactStatus,
  addContactAsStudent,
  promoteToMember,
  getRoles,
  upsertRoles,
  searchStudents,
  createStudent,
  updateStudent,
  createStudentsBulk,
  registerForEvent,
  deleteEvent,
  API_BASE,
} from "../services/api";
import AddRoles from "../secret/pages/AddRoles";
import EventContacts from "./EventContacts";

import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import { cn } from "../lib/utils";

// ─── Logo ────────────────────────────────────────────────────────────────────
const Logo = () => (
  <a
    href="#"
    className="relative z-20 flex items-center gap-2 py-1 text-sm font-semibold text-white"
  >
    <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-gradient-to-br from-blue-500 to-cyan-400" />
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="whitespace-pre bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent font-bold tracking-tight"
    >
      Tara Admin
    </motion.span>
  </a>
);
const LogoIcon = () => (
  <a href="#" className="relative z-20 flex items-center py-1">
    <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-gradient-to-br from-blue-500 to-cyan-400" />
  </a>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
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

// ─── Action Card ─────────────────────────────────────────────────────────────
const ActionCard = ({ label, desc, icon, color, onClick }) => {
  const variants = {
    blue: "hover:border-blue-500/50 text-blue-400 bg-blue-500/10 group-hover:bg-blue-500/20",
    green:
      "hover:border-green-500/50 text-green-400 bg-green-500/10 group-hover:bg-green-500/20",
    purple:
      "hover:border-purple-500/50 text-purple-400 bg-purple-500/10 group-hover:bg-purple-500/20",
    orange:
      "hover:border-orange-500/50 text-orange-400 bg-orange-500/10 group-hover:bg-orange-500/20",
  };
  const cls = variants[color] || "";
  const parts = cls.split(" ");
  const hoverBorder = parts[0];
  const text = parts[1];
  const bg = parts[2];
  const groupBg = parts[3];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group rounded-xl border border-neutral-700 bg-neutral-800/60 p-5 text-left transition-all duration-200 hover:bg-neutral-700/30 backdrop-blur w-full",
        hoverBorder,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn("p-3 rounded-lg transition-colors", bg, text, groupBg)}
        >
          {icon}
        </span>
        <IconChevronRight
          size={18}
          className={cn(
            "text-neutral-600 transition-colors",
            `group-hover:${text}`,
          )}
        />
      </div>
      <h3 className="font-semibold text-white mb-0.5">{label}</h3>
      <p className="text-xs text-neutral-400">{desc}</p>
    </button>
  );
};

// ─── Section: Overview ────────────────────────────────────────────────────────
function OverviewSection({
  user,
  stats,
  recentEvents,
  imageError,
  setImageError,
  loadData,
  navigate,
  setSection,
}) {
  const apiBase = API_BASE.replace(/\/$/, "");
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            System Overview &amp; Management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition"
          >
            <IconRefresh size={15} /> Refresh
          </button>
          <button
            onClick={() => navigate("/events/create")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition"
          >
            <IconPlus size={15} /> Create Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
          sub="Across all events"
          icon={<IconUsersGroup size={18} />}
          color="green"
        />
        <StatCard
          title="Attendance"
          value={stats.totalAttendance}
          sub={`${stats.attendanceRate}% rate`}
          icon={<IconUserCheck size={18} />}
          color="purple"
        />
        <StatCard
          title="Students"
          value={stats.totalStudents}
          sub="In database"
          icon={<IconUsersGroup size={18} />}
          color="yellow"
        />
        <StatCard
          title="Managers"
          value={stats.activeManagers}
          sub="Active"
          icon={<IconSettings size={18} />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-neutral-700/50 bg-neutral-800/60 p-5 backdrop-blur">
          <h3 className="text-sm font-semibold text-white mb-4">
            Event Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
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
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
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
                    {Math.round((stats.pastEvents / stats.totalEvents) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                    style={{
                      width: `${Math.round((stats.pastEvents / stats.totalEvents) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-700/50 bg-neutral-800/60 p-5 backdrop-blur">
          <h3 className="text-sm font-semibold text-white mb-4">
            Pending Actions
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Unread Contacts</span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium",
                  stats.unreadContacts > 0
                    ? "bg-red-500/10 text-red-400"
                    : "bg-green-500/10 text-green-400",
                )}
              >
                {stats.unreadContacts}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Upcoming Events</span>
              <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium">
                {stats.upcomingEvents}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSection("contacts")}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition text-white"
          >
            View All Contacts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <ActionCard
          label="Event Manager"
          desc="Manage all events"
          icon={<IconBrandTabler size={22} />}
          color="blue"
          onClick={() => setSection("events")}
        />
        <ActionCard
          label="Attendance"
          desc="Control attendance records"
          icon={<IconClipboardList size={22} />}
          color="green"
          onClick={() => setSection("attendance")}
        />
        <ActionCard
          label="User Roles"
          desc="Assign user permissions"
          icon={<IconUsersGroup size={22} />}
          color="purple"
          onClick={() => setSection("roles")}
        />
        <ActionCard
          label="Admin Portal"
          desc="Advanced settings"
          icon={<IconShieldLock size={22} />}
          color="orange"
          onClick={() => setSection("portal")}
        />
      </div>

      <div className="rounded-xl border border-neutral-700/50 bg-neutral-800/60 backdrop-blur overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-700/50">
          <h2 className="text-base font-semibold text-white">Recent Events</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Latest events in the system
          </p>
        </div>
        {recentEvents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-neutral-700/50 mb-4">
              <IconCalendarEvent size={24} className="text-neutral-500" />
            </div>
            <p className="text-neutral-400 font-medium">No Events Yet</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-700/50">
            {recentEvents.map((event) => {
              const id = event._id || event.id;
              const cacheBust = event.updatedAt
                ? `?v=${new Date(event.updatedAt).getTime()}`
                : "";
              const imageSrc =
                event.imageUrl || `${apiBase}/events/${id}/image${cacheBust}`;
              const isUpcoming = new Date(event.date) > new Date();
              return (
                <div
                  key={id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-neutral-700/20 transition cursor-pointer"
                  onClick={() => setSection("events")}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-700 shrink-0">
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
                      <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white truncate">
                          {event.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-0.5">
                          <span>
                            {new Date(event.date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                            })}
                          </span>
                          {event.venue && <span>• {event.venue}</span>}
                          {event.managerEmail && (
                            <span>• By {event.managerEmail}</span>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium",
                          isUpcoming
                            ? "bg-green-500/10 text-green-400"
                            : "bg-neutral-600/30 text-neutral-400",
                        )}
                      >
                        {isUpcoming ? "Upcoming" : "Done"}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-neutral-500">
                      <span>{event.registeredCount || 0} registered</span>
                      <span>{event.attendedCount || 0} attended</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-600 text-center mt-6">
        Auto-refreshes every 60s · Last updated:{" "}
        {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}

// ─── Section: Events ──────────────────────────────────────────────────────────
function EventsSection({ navigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState({});
  const apiBase = API_BASE.replace(/\/$/, "");

  useEffect(() => {
    fetchEvents()
      .then((d) => {
        setEvents(
          Array.isArray(d?.events) ? d.events : Array.isArray(d) ? d : [],
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => (e._id || e.id) !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Event Manager
          </h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            All events in the system
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setLoading(true);
              fetchEvents()
                .then((d) => {
                  setEvents(
                    Array.isArray(d?.events)
                      ? d.events
                      : Array.isArray(d)
                        ? d
                        : [],
                  );
                  setLoading(false);
                })
                .catch(() => setLoading(false));
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition"
          >
            <IconRefresh size={15} /> Refresh
          </button>
          <button
            onClick={() => navigate("/events/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition"
          >
            <IconBrandTabler size={15} /> Manager Dash
          </button>
          <button
            onClick={() => navigate("/events/create")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition"
          >
            <IconPlus size={15} /> Create Event
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          No events found. Create one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((event) => {
            const id = event._id || event.id;
            const cacheBust = event.updatedAt
              ? `?v=${new Date(event.updatedAt).getTime()}`
              : "";
            const imageSrc =
              event.imageUrl || `${apiBase}/events/${id}/image${cacheBust}`;
            const isUpcoming = new Date(event.date) > new Date();
            return (
              <div
                key={id}
                className="rounded-xl border border-neutral-700/50 bg-neutral-800/60 overflow-hidden hover:border-blue-500/30 transition group"
              >
                <div className="h-36 bg-neutral-700 overflow-hidden relative">
                  {imageSrc && !imageError[id] ? (
                    <img
                      src={imageSrc}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() =>
                        setImageError((prev) => ({ ...prev, [id]: true }))
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">
                      No Image
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium",
                      isUpcoming
                        ? "bg-green-500/80 text-white"
                        : "bg-neutral-600/80 text-neutral-300",
                    )}
                  >
                    {isUpcoming ? "Upcoming" : "Done"}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate mb-1">
                    {event.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    {new Date(event.date).toLocaleDateString("en-GB")}{" "}
                    {event.venue && `• ${event.venue}`}
                  </p>
                  <div className="flex gap-3 text-xs text-neutral-500 mb-3">
                    <span className="text-blue-400">
                      {event.registeredCount || 0} registered
                    </span>
                    <span className="text-purple-400">
                      {event.attendedCount || 0} attended
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/events/create?edit=${id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs transition"
                    >
                      <IconEdit size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/30 text-red-400 text-xs transition"
                    >
                      <IconTrash size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section: Attendance ──────────────────────────────────────────────────────
function AttendanceSection({ navigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then((d) => {
        setEvents(
          Array.isArray(d?.events) ? d.events : Array.isArray(d) ? d : [],
        );
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
      label: "Manage Sessions",
      desc: "Add or toggle attendance sessions",
      color: "blue",
      icon: <IconCalendarEvent size={22} />,
      href: "/events/sessions",
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
        <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
          Attendance
        </h1>
        <p className="text-neutral-400 text-sm mt-0.5">
          Manage event attendance across all sessions
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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
// ─── Section: Admin Portal ────────────────────────────────────────────────────
function PortalSection({ navigate }) {
  const quickLinks = [
    {
      label: "Manage Students",
      desc: "Search, add, edit student records",
      icon: <IconUsersGroup size={22} />,
      href: "/events/students",
      color: "blue",
    },
    {
      label: "Approvals",
      desc: "Review registration requests",
      icon: <IconUserCheck size={22} />,
      href: "/events/approvals",
      color: "green",
    },
    {
      label: "Test Questions",
      desc: "Set up MCQs and Coding problems",
      icon: <IconClipboardList size={22} />,
      href: "/events/questions",
      color: "purple",
    },
    {
      label: "Student Results",
      desc: "View assessment scores",
      icon: <IconSettings size={22} />,
      href: "/events/results",
      color: "orange",
    },
    {
      label: "All Registrations",
      desc: "Browse all event registrations",
      icon: <IconCalendarEvent size={22} />,
      href: "/events/all-registrations",
      color: "yellow",
    },
    {
      label: "Full Roles Editor",
      desc: "Advanced role management UI",
      icon: <IconShieldLock size={22} />,
      href: "/admin/roles",
      color: "orange",
    },
  ];
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-300 bg-clip-text text-transparent">
          Admin Portal
        </h1>
        <p className="text-neutral-400 text-sm mt-0.5">
          Advanced management tools and settings
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((l) => (
          <ActionCard
            key={l.label}
            label={l.label}
            desc={l.desc}
            icon={l.icon}
            color={l.color}
            onClick={() => navigate(l.href)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [imageError, setImageError] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
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

  useEffect(() => {
    const interval = setInterval(loadData, 60000);
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
        const ud = res.user || {};
        setUser(ud);
        if (ud.role !== "admin") {
          navigate("/main", { replace: true });
          return;
        }
      } catch {
        if (mounted) navigate("/login", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    verify();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const evData = await fetchEvents();
      const all = Array.isArray(evData?.events)
        ? evData.events
        : Array.isArray(evData)
          ? evData
          : [];
      const now = new Date();
      const upcoming = all.filter((e) => new Date(e.date) > now).length;
      const past = all.filter((e) => new Date(e.date) <= now).length;
      setRecentEvents(
        [...all]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5),
      );
      const totalReg = all.reduce((s, e) => s + (e.registeredCount || 0), 0);
      const totalAtt = all.reduce((s, e) => s + (e.attendedCount || 0), 0);
      const mgrs = new Set(all.map((e) => e.managerEmail).filter(Boolean)).size;
      let unread = 0;
      try {
        const cd = await getMyContacts();
        unread = (
          Array.isArray(cd?.contacts)
            ? cd.contacts
            : Array.isArray(cd)
              ? cd
              : []
        ).filter((c) => c.status === "unread").length;
      } catch {}
      let students = 0;
      try {
        const sd = await getSummary();
        students = sd?.totalStudents || 0;
      } catch {}
      setStats({
        totalEvents: all.length,
        totalRegistrations: totalReg,
        totalAttendance: totalAtt,
        totalStudents: students,
        upcomingEvents: upcoming,
        pastEvents: past,
        attendanceRate:
          totalReg > 0 ? Math.round((totalAtt / totalReg) * 100) : 0,
        unreadContacts: unread,
        activeManagers: mgrs,
      });
    } catch {}
  };

  if (loading)
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );

  const navLinks = [
    {
      label: "Overview",
      section: "overview",
      icon: <IconBrandTabler size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Event Manager",
      section: "events",
      icon: (
        <IconCalendarEvent size={20} className="text-neutral-300 shrink-0" />
      ),
    },
    {
      label: "Attendance",
      section: "attendance",
      icon: (
        <IconClipboardList size={20} className="text-neutral-300 shrink-0" />
      ),
    },
    {
      label: "User Roles",
      section: "roles",
      icon: <IconUsersGroup size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Contacts",
      section: "contacts",
      icon: <IconMailOpened size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Admin Portal",
      section: "portal",
      icon: <IconShieldLock size={20} className="text-neutral-300 shrink-0" />,
    },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "events":
        return <EventsSection navigate={navigate} />;
      case "attendance":
        return <AttendanceSection navigate={navigate} />;
      case "roles":
        return <AddRoles />;
      case "contacts":
        return <EventContacts />;
      case "portal":
        return <PortalSection navigate={navigate} />;
      default:
        return (
          <OverviewSection
            user={user}
            stats={stats}
            recentEvents={recentEvents}
            imageError={imageError}
            setImageError={setImageError}
            loadData={loadData}
            navigate={navigate}
            setSection={setActiveSection}
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
                label: user?.name || user?.email || "Admin",
                href: "#",
                icon: (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                    {(user?.name || user?.email || "A")[0].toUpperCase()}
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
