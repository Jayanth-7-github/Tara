import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import {
  IconCalendarEvent,
  IconClipboardList,
  IconUsersGroup,
  IconUserCheck,
  IconSettings,
  IconLogout,
  IconHome,
} from "@tabler/icons-react";
import { cn } from "../lib/utils";
import { getMe } from "../services/auth";
import TeamPanel from "../components/TeamPanel";

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

function StatCard({ title, value, sub, icon, color, onClick }) {
  const cls = colorVariants[color] || "";
  const parts = cls.split(" ");
  const bg = parts[2] || "";
  const text = parts[3] || "";
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-5 transition-all duration-200 backdrop-blur bg-neutral-800/60 ${cls} ${onClick ? "cursor-pointer hover:bg-neutral-700/40" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          {title}
        </p>
        <span className={`p-2 rounded-lg ${bg} ${text}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Action Card ─────────────────────────────────────────────────────────────
function ActionCard({ label, desc, icon, color, onClick }) {
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
      className={`group rounded-xl border border-neutral-700 bg-neutral-800/60 p-5 text-left transition-all duration-200 hover:bg-neutral-700/30 backdrop-blur w-full ${hoverBorder}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`p-3 rounded-lg transition-colors ${bg} ${text} ${groupBg}`}
        >
          {icon}
        </span>
        <span
          className={`text-neutral-600 transition-colors group-hover:${text}`}
        >
          →
        </span>
      </div>
      <h3 className="font-semibold text-white mb-0.5">{label}</h3>
      <p className="text-xs text-neutral-400">{desc}</p>
    </button>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    registeredEvents: 0,
    attendedEvents: 0,
    upcomingEvents: 0,
    completedTests: 0,
    pendingTests: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  // Add missing team and event state
  const [team, setTeam] = useState(null);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const profile = await getMe();
        const u = profile?.user || profile;
        setUser(u);
      } catch (err) {
        setUser(null);
      }
      setStats({
        registeredEvents: 5,
        attendedEvents: 4,
        upcomingEvents: 2,
        completedTests: 3,
        pendingTests: 1,
      });
      setRecentEvents([
        { id: 1, name: "Hackathon", date: "2026-03-10" },
        { id: 2, name: "Workshop", date: "2026-03-15" },
      ]);
    }
    fetchUser();
  }, []);

  const navLinks = [
    {
      label: "Overview",
      section: "overview",
      icon: <IconHome size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Events",
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
      label: "Results",
      section: "results",
      icon: <IconUserCheck size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Profile",
      section: "profile",
      icon: <IconUsersGroup size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Settings",
      section: "settings",
      icon: <IconSettings size={20} className="text-neutral-300 shrink-0" />,
    },
  ];

  // ─── Overview Section ───────────────────────────────────────────────
  // Add your overview UI code below
  const renderSection = () => {
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
    // Only show TeamPanel in overview
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamPanel team={team} event={event} />
      </div>
    );
  };

  // ─── Remaining UI Code ──────────────────────────────────────────────
  // Add sidebar, navigation, and main dashboard layout below
  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-950 flex-col md:flex-row">
      {/* SIDEBAR UI CODE GOES HERE */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-8">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto gap-1">
            <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-gradient-to-br from-blue-500 to-cyan-400 mb-4" />
            <div className="mt-8 flex flex-col gap-1">
              {navLinks.map((link) => (
                <SidebarLink
                  key={link.section}
                  link={{ label: link.label, href: "#", icon: link.icon }}
                  onClick={() => setActiveSection(link.section)}
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
                label: user?.name || user?.email || "Student",
                href: "#",
                icon: (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                    {(user?.name || user?.email || "S")[0].toUpperCase()}
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
              onClick={() => {
                /* Add logout logic here */
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* MAIN DASHBOARD UI CODE GOES HERE */}
      <main className="flex-1 overflow-y-auto bg-neutral-950 text-white w-full">
        {renderSection()}
      </main>
    </div>
  );
}
