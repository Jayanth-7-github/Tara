import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import {
  IconClipboardList,
  IconFileText,
  IconLogout,
  IconHome,
} from "@tabler/icons-react";
import { cn } from "../lib/utils";
import {
  Sparkles,
  ClipboardCheck,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Camera,
  Video,
  Image as LucideImage,
  MapPin,
  Users,
  Lock,
  Unlock,
  Eye,
  Check,
} from "lucide-react";
import { getMe, logout } from "../services/auth";
import TeamPanel from "../components/TeamPanel";
import {
  fetchStudent,
  fetchEventById,
  fetchTeamProblemStatements,
  fetchTeams,
  fetchTeamById,
  fetchStudentAttendanceRecords,
  selectTeamProblemStatement,
  submitStudentAttendance,
  verifyTeamNameKey,
} from "../services/api";

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
  const [student, setStudent] = useState(null);
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

  const [selectedEventId, setSelectedEventId] = useState(null);

  // Guest Access states (using Team Name as key)
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [isPublicAccess, setIsPublicAccess] = useState(false);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      let profile = null;
      try {
        profile = await getMe();
      } catch (err) {
        // Not logged in personally
      }

      if (profile) {
        const u = profile?.user || profile;
        setUser(u);

        if (u?.isTeamUser && u?.teamId) {
          // Logged in as virtual Team User
          const teamDetails = await fetchTeamById(u.teamId);
          const myTeam = teamDetails?.team || teamDetails;
          setTeam(myTeam || null);

          const evId = myTeam?.event?._id || myTeam?.event;
          if (evId) {
            setSelectedEventId(String(evId));
            const ev = await fetchEventById(String(evId));
            setEvent(ev || null);
          }
        } else if (u?.regno) {
          const s = await fetchStudent(u.regno);
          setStudent(s);

          const regs = Array.isArray(s?.registrations) ? s.registrations : [];
          const latest = regs
            .slice()
            .sort(
              (a, b) =>
                new Date(b?.registeredAt || 0) - new Date(a?.registeredAt || 0),
            )[0];

          const evId = latest?.event?._id || latest?.event || null;
          if (evId) {
            setSelectedEventId(String(evId));
            const ev = await fetchEventById(String(evId));
            setEvent(ev || null);

            const teamsResp = await fetchTeams(String(evId));
            const teams = Array.isArray(teamsResp?.teams)
              ? teamsResp.teams
              : [];
            const regUpper = String(u.regno).toUpperCase();
            const myTeam = teams.find((t) => {
              const leaderReg = t?.leader?.regno
                ? String(t.leader.regno).toUpperCase()
                : "";
              if (leaderReg && leaderReg === regUpper) return true;
              const mems = Array.isArray(t?.members) ? t.members : [];
              return mems.some(
                (m) => String(m?.regno || "").toUpperCase() === regUpper,
              );
            });
            setTeam(myTeam || null);
          }
        }
      } else {
        // Guest/Public Access checking via Team Name
        const storedTeam = sessionStorage.getItem("temp_team_access");
        if (storedTeam) {
          const teamObj = JSON.parse(storedTeam);
          setIsPublicAccess(true);
          // Fetch fresh team details
          try {
            const teamDetails = await fetchTeamById(teamObj._id);
            const freshTeam = teamDetails?.team || teamDetails;
            setTeam(freshTeam || null);
            
            const evId = freshTeam?.event?._id || freshTeam?.event;
            if (evId) {
              setSelectedEventId(String(evId));
              const ev = await fetchEventById(String(evId));
              setEvent(ev || null);
            }
            
            setUser({
              name: freshTeam.name || freshTeam.teamName,
              role: "student",
              isTeamUser: true,
              teamId: freshTeam._id
            });
          } catch (err) {
            setTeam(teamObj);
            setUser({
              name: teamObj.name || teamObj.teamName,
              role: "student",
              isTeamUser: true,
              teamId: teamObj._id
            });
          }
        } else {
          setShowKeyModal(true);
        }
      }
    } catch (err) {
      setUser(null);
      setStudent(null);
      setTeam(null);
      setEvent(null);
    } finally {
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
      if (!silent) setLoading(false);
    }
  };

  const handleVerifyKey = async (e) => {
    e.preventDefault();
    setKeyError("");
    setLoading(true);
    try {
      const res = await verifyTeamNameKey(inputKey);
      if (res.success && res.team) {
        const myTeam = res.team;
        sessionStorage.setItem("temp_event_access", JSON.stringify({
          eventId: myTeam.event,
          isPublicAccess: true,
          token: res.token
        }));
        
        setTeam(myTeam || null);
        
        const evId = myTeam?.event?._id || myTeam?.event;
        if (evId) {
          setSelectedEventId(String(evId));
          const ev = await fetchEventById(String(evId));
          setEvent(ev || null);
        }

        sessionStorage.setItem("temp_team_access", JSON.stringify(myTeam));
        
        setUser({
          name: myTeam.name || myTeam.teamName,
          role: "student",
          isTeamUser: true,
          teamId: myTeam._id
        });
        
        setIsPublicAccess(true);
        setShowKeyModal(false);
      }
    } catch (err) {
      setKeyError(err.message || "Team not found. Please verify the team name.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const navLinks = [
    {
      label: "Overview",
      section: "overview",
      icon: <IconHome size={20} className="text-neutral-300 shrink-0" />,
    },
    {
      label: "Attendance",
      section: "attendance",
      icon: (
        <IconClipboardList size={20} className="text-neutral-300 shrink-0" />
      ),
    },
    {
      label: "Problem Statement",
      section: "problem-statement",
      icon: <IconFileText size={20} className="text-neutral-300 shrink-0" />,
    },
  ];

  // ─── Overview Section ───────────────────────────────────────────────
  // Add your overview UI code below
  const renderSection = () => {
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

    switch (activeSection) {
      case "problem-statement":
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <StudentProblemStatementSection team={team} event={event} />
          </div>
        );
      case "attendance":
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <StudentAttendanceSection
              team={team}
              event={event}
              onRefresh={() => loadDashboardData(true)}
            />
          </div>
        );
      case "overview":
      default:
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TeamPanel team={team} event={event} onTeamUpdate={setTeam} />
          </div>
        );
    }
  };

  // ─── Remaining UI Code ──────────────────────────────────────────────
  // Add sidebar, navigation, and main dashboard layout below
  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-950 flex-col md:flex-row">
      {/* SIDEBAR UI CODE GOES HERE */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-8">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto gap-1">
            {team ? (
              team.avatarUrl ? (
                <img
                  src={team.avatarUrl}
                  alt="Team Profile"
                  className="h-8 w-8 rounded-full object-cover shrink-0 mb-4 border border-white/20 shadow-md"
                />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-full bg-linear-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-black mb-4 uppercase">
                  {(team.name || "T")[0]}
                </div>
              )
            ) : (
              <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-linear-to-br from-blue-500 to-cyan-400 mb-4" />
            )}
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
                  <div className="h-7 w-7 shrink-0 rounded-full bg-linear-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
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
              onClick={async () => {
                sessionStorage.removeItem("temp_event_access");
                sessionStorage.removeItem("temp_team_access");
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

      {/* MAIN DASHBOARD UI CODE GOES HERE */}
      <main className="flex-1 overflow-y-auto bg-neutral-950 text-white w-full">
        {renderSection()}
      </main>

      {/* Event Access Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xl font-bold mb-3">
                👥
              </div>
              <h3 className="text-2xl font-bold text-white tracking-wide">
                Team Access
              </h3>
              <p className="text-neutral-400 text-sm mt-1">
                Enter your Team Name to access your dashboard
              </p>
            </div>
            
            <form onSubmit={handleVerifyKey} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Your Team Name"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full bg-neutral-850 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all text-center text-lg font-semibold"
                  required
                />
              </div>
              {keyError && (
                <div className="text-red-400 text-sm text-center bg-red-950/30 border border-red-900/50 rounded-lg py-2">
                  {keyError}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Access Dashboard</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function statusBadge(status) {
  const s = String(status || "pending");
  if (s === "approved") return "bg-green-900/40 text-green-300";
  if (s === "rejected") return "bg-red-900/40 text-red-300";
  return "bg-yellow-900/40 text-yellow-300";
}

function roleBadge(role) {
  const r = String(role || "").toLowerCase();
  if (r === "team lead")
    return "bg-blue-900/40 text-blue-200 border-blue-800/60";
  return "bg-neutral-800 text-neutral-200 border-neutral-700";
}

function getProblemDescriptionPreview(value, limit = 128) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "No description available.";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}...`;
}

function ProblemStatementDetailsModal({
  item,
  locked,
  isChosen,
  onClose,
  onSelect,
}) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/5 bg-neutral-950/90 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Background radial glows */}
        <div className="absolute top-0 -left-12 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-12 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-5 relative">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Problem Statement Details
            </span>
            <h3 className="mt-1 text-2xl font-extrabold text-white tracking-tight">
              {item.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-900/60 border border-white/5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/5 bg-neutral-900/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Full Description
            </span>
            {isChosen && (
              <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.05)]">
                Selected for team
              </span>
            )}
          </div>

          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-neutral-300 select-text">
            {item.description}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-end relative">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/5 bg-neutral-900/60 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(item)}
            disabled={locked || isChosen}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer shadow-md focus-visible:ring-2",
              locked || isChosen
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 focus-visible:ring-blue-500"
            )}
          >
            {isChosen
              ? "Already Selected"
              : locked
                ? "Selection Locked"
                : "Select Problem Statement"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProblemStatementConfirmToast({
  item,
  submitting,
  onConfirm,
  onCancel,
}) {
  if (!item) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-full max-w-sm px-4 sm:px-0">
      <div className="pointer-events-auto rounded-2xl border border-amber-500/20 bg-neutral-950/90 backdrop-blur-xl p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Confirm Selection
          </span>
        </div>
        <h4 className="mt-2 text-lg font-bold text-white tracking-tight">{item.title}</h4>
        <p className="mt-2 text-xs leading-5 text-neutral-400">
          This will be the final problem statement for the whole team. You can
          confirm or cancel now, but once confirmed it cannot be changed.
        </p>

        <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-white/5 pt-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className={cn(
              "rounded-lg border border-white/5 px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              submitting
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-900/60 text-neutral-300 hover:text-white hover:bg-neutral-900",
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-md focus-visible:ring-2",
              submitting
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/10 focus-visible:ring-amber-500",
            )}
          >
            {submitting ? "Confirming..." : "Confirm Selection"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentProblemStatementSection({ team, event }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [detailItem, setDetailItem] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [teamSelection, setTeamSelection] = useState(() => ({
    selectedProblemStatement: team?.selectedProblemStatement || null,
    selectedProblemStatementBy: team?.selectedProblemStatementBy || null,
    selectedProblemStatementAt: team?.selectedProblemStatementAt || null,
  }));

  useEffect(() => {
    setTeamSelection({
      selectedProblemStatement: team?.selectedProblemStatement || null,
      selectedProblemStatementBy: team?.selectedProblemStatementBy || null,
      selectedProblemStatementAt: team?.selectedProblemStatementAt || null,
    });
  }, [
    team?.selectedProblemStatement,
    team?.selectedProblemStatementAt,
    team?.selectedProblemStatementBy,
  ]);

  const loadProblemStatements = async () => {
    if (!team?._id) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await fetchTeamProblemStatements(team._id);
      setItems(Array.isArray(resp?.items) ? resp.items : []);
      setTeamSelection({
        selectedProblemStatement: resp?.team?.selectedProblemStatement || null,
        selectedProblemStatementBy:
          resp?.team?.selectedProblemStatementBy || null,
        selectedProblemStatementAt:
          resp?.team?.selectedProblemStatementAt || null,
      });
    } catch (e) {
      setError(e?.message || "Failed to load problem statements");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblemStatements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?._id]);

  const selectedProblem = teamSelection.selectedProblemStatement;

  const handleConfirmSelection = async () => {
    if (!team?._id || !confirmItem?._id || selectedProblem) return;

    setSubmitting(true);
    setError(null);
    try {
      const resp = await selectTeamProblemStatement({
        teamId: team._id,
        problemStatementId: confirmItem._id,
      });
      setTeamSelection({
        selectedProblemStatement:
          resp?.selectedProblemStatement ||
          resp?.team?.selectedProblemStatement ||
          null,
        selectedProblemStatementBy:
          resp?.team?.selectedProblemStatementBy || null,
        selectedProblemStatementAt:
          resp?.team?.selectedProblemStatementAt || null,
      });
      setConfirmItem(null);
      setDetailItem(null);
      await loadProblemStatements();
    } catch (e) {
      setError(e?.message || "Failed to select problem statement");
    } finally {
      setSubmitting(false);
    }
  };

  if (!team || !event) {
    return (
      <div className="rounded-2xl border border-white/5 bg-neutral-900/35 backdrop-blur-md p-6 text-center text-neutral-400 max-w-md mx-auto shadow-xl">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-white">No Team or Event Found</p>
        <p className="text-xs text-neutral-400 mt-1">Unable to load problem statement selection details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/35 backdrop-blur-md p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Team Problem Statement
            </h2>
            <p className="max-w-3xl text-sm text-neutral-400 leading-relaxed">
              Only one problem statement can be selected for the whole team. Any
              student in this team can make the selection, but once a problem
              statement is chosen it is locked and cannot be changed.
            </p>
            <div className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-300">
              Team-wide lock: one selection only
            </div>
          </div>

          <button
            onClick={loadProblemStatements}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/60 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/10 text-neutral-300 hover:text-blue-300 text-xs font-semibold transition-all duration-300 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0 h-fit"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Info Grid */}
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-neutral-900/20 p-4 shadow-sm hover:border-white/10 hover:bg-neutral-900/35 transition-all duration-300">
            <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Event</span>
            <p className="mt-2 text-base font-semibold text-white truncate">
              {event?.title || "Current event"}
            </p>
          </div>
          
          <div className="rounded-xl border border-white/5 bg-neutral-900/20 p-4 shadow-sm hover:border-white/10 hover:bg-neutral-900/35 transition-all duration-300">
            <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Team</span>
            <p className="mt-2 text-base font-semibold text-white truncate">
              {team?.name || "Your team"}
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-neutral-900/20 p-4 shadow-sm hover:border-white/10 hover:bg-neutral-900/35 transition-all duration-300 flex flex-col justify-between">
            <div>
              <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Selection Status</span>
              <div className="mt-2 flex items-center gap-1.5 font-bold text-base">
                {selectedProblem ? (
                  <>
                    <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-rose-400">Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400">Open</span>
                  </>
                )}
              </div>
            </div>
            <p className="mt-2 text-[10px] text-neutral-500 leading-normal">
              {selectedProblem
                ? "A teammate has already selected the team problem statement."
                : "Any team member can select one active problem statement."}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 p-4 text-sm text-rose-200 flex items-center gap-2.5 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {selectedProblem ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md p-6 shadow-xl shadow-emerald-500/2">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_rgba(52,211,153,0.05)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Selected for Team
              </div>
              
              <div>
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Final Problem Statement</span>
                <h3 className="mt-1 text-2xl font-bold text-white tracking-tight">
                  {selectedProblem.title}
                </h3>
              </div>
              
              <p className="max-w-3xl text-sm leading-6 text-neutral-300 select-text">
                {getProblemDescriptionPreview(selectedProblem.description, 160)}
              </p>
              
              <button
                onClick={() => setDetailItem(selectedProblem)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-200 text-sm font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-md"
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
            </div>

            <div className="w-full lg:w-72 rounded-xl border border-white/5 bg-neutral-900/30 p-4 text-xs text-neutral-400 space-y-3 shrink-0">
              <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Lock Details</span>
              
              <div>
                <span className="text-neutral-500 block">Chosen By:</span>
                <span className="font-semibold text-neutral-200 block mt-0.5">
                  {teamSelection.selectedProblemStatementBy?.name || "A teammate"}
                </span>
                {teamSelection.selectedProblemStatementBy?.regno && (
                  <span className="text-neutral-500 block text-[10px]">
                    {teamSelection.selectedProblemStatementBy.regno}
                  </span>
                )}
              </div>
              
              {teamSelection.selectedProblemStatementAt && (
                <div>
                  <span className="text-neutral-500 block">Locked On:</span>
                  <span className="font-semibold text-neutral-300 block mt-0.5">
                    {new Date(teamSelection.selectedProblemStatementAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
              )}
              
              <div className="pt-2.5 border-t border-white/5 text-[10px] text-neutral-500 leading-normal">
                This choice applies to every student in the team and cannot be changed or reset.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!selectedProblem ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/35 backdrop-blur-md p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Available Problem Statements
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                Choose carefully. The first confirmed selection becomes the final problem statement for the entire team.
              </p>
            </div>
            <div className="rounded-full bg-neutral-900/50 border border-white/5 px-2.5 py-0.5 text-xs font-semibold text-neutral-300 shrink-0">
              {items.length} Active
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/5 bg-neutral-900/10 p-6 text-center text-xs text-neutral-500 animate-pulse">
              Loading problem statements...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/5 bg-neutral-900/5 p-8 text-center text-xs text-neutral-500">
              No active problem statements are available for this event yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {items.map((item, index) => {
                const isChosen =
                  String(selectedProblem?._id || "") === String(item._id || "");

                return (
                  <div
                    key={item._id}
                    className={cn(
                      "rounded-2xl border p-5 transition-all duration-300 shadow-sm",
                      isChosen
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-white/5 bg-neutral-900/20 hover:border-white/10 hover:bg-neutral-900/30"
                    )}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="inline-flex items-center rounded-full border border-white/5 bg-neutral-900/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Problem {index + 1}
                          </span>
                          {isChosen && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                              <Check className="w-3 h-3 text-emerald-400" />
                              Selected for Team
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-bold text-white tracking-tight">
                          {item.title}
                        </h4>
                        <p className="text-sm leading-relaxed text-neutral-300">
                          {getProblemDescriptionPreview(item.description)}
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-2 lg:w-52 shrink-0">
                        <button
                          onClick={() => setDetailItem(item)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer shadow-md focus-visible:ring-2",
                            isChosen
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-500"
                              : "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500 shadow-blue-500/5"
                          )}
                        >
                          <Eye className="w-4 h-4" />
                          <span>{isChosen ? "View Selected" : "View Details"}</span>
                        </button>
                        <p className="text-[10px] leading-relaxed text-neutral-500 text-center lg:text-left">
                          {selectedProblem
                            ? "Selection is locked for the whole team."
                            : "Open details to review and lock the selection."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <ProblemStatementDetailsModal
        item={detailItem}
        locked={Boolean(selectedProblem)}
        isChosen={
          String(selectedProblem?._id || "") === String(detailItem?._id || "")
        }
        onClose={() => setDetailItem(null)}
        onSelect={(item) => {
          setConfirmItem(item);
        }}
      />

      <ProblemStatementConfirmToast
        item={confirmItem}
        submitting={submitting}
        onCancel={() => setConfirmItem(null)}
        onConfirm={handleConfirmSelection}
      />
    </div>
  );
}

function StudentAttendanceSection({ team, event, onRefresh }) {
  const [eventLive, setEventLive] = useState(event);

  useEffect(() => {
    setEventLive(event);
  }, [event]);

  const sessions = useMemo(() => {
    const list = Array.isArray(eventLive?.studentSessions)
      ? eventLive.studentSessions
      : Array.isArray(eventLive?.sessions)
        ? eventLive.sessions
        : [];
    return list
      .map((s) => ({
        name: String(s?.name || "").trim(),
        isActive: Boolean(s?.isActive),
      }))
      .filter((s) => Boolean(s.name));
  }, [eventLive?.sessions, eventLive?.studentSessions]);

  const sessionNames = useMemo(() => sessions.map((s) => s.name), [sessions]);

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedSessionName, setSelectedSessionName] = useState("");
  const [snapshotDataUrl, setSnapshotDataUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!sessionNames.length) {
      setSelectedSessionName("");
      return;
    }

    // Keep selection stable if session is renamed/removed
    setSelectedSessionName((prev) => {
      if (prev && sessionNames.includes(prev)) return prev;
      const active = sessions.find((s) => s.isActive);
      return active?.name || sessionNames[0];
    });
  }, [sessionNames, sessions]);

  const teamMembers = useMemo(() => {
    if (!team) return [];
    const leader = team.leader ? [team.leader] : [];
    const leaderId = team.leader?._id || team.leader;
    const members = (Array.isArray(team.members) ? team.members : [])
      .filter((m) => {
        const mId = m?._id || m;
        return mId && String(mId) !== String(leaderId);
      });
    return leader.concat(members);
  }, [team]);

  const activeSessions = useMemo(
    () => sessions.filter((s) => s && s.isActive),
    [sessions],
  );

  const leaderId = useMemo(() => {
    const raw = team?.leader?._id || team?.leader;
    return raw ? String(raw) : "";
  }, [team?.leader]);

  const recordByStudentAndSession = useMemo(() => {
    const map = new Map();
    for (const r of Array.isArray(records) ? records : []) {
      const studentId = String(r?.student?._id || r?.student || "");
      const sName = String(r?.sessionName || "").trim();
      if (!studentId || !sName) continue;
      map.set(`${studentId}__${sName}`, r);
    }
    return map;
  }, [records]);

  const selectedMember = useMemo(() => {
    if (!selectedStudentId) return null;
    return (
      teamMembers.find(
        (m) => String(m?._id || m) === String(selectedStudentId),
      ) || null
    );
  }, [selectedStudentId, teamMembers]);

  const loadRecords = async () => {
    if (!team?._id || !event?._id) return;
    setLoadingRecords(true);
    setError(null);
    try {
      const resp = await fetchStudentAttendanceRecords({
        eventId: event._id,
        teamId: team._id,
      });
      setRecords(Array.isArray(resp?.records) ? resp.records : []);
    } catch (e) {
      setError(e?.message || "Failed to load attendance records");
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const reloadEvent = async () => {
    if (!event?._id) return eventLive;
    const fresh = await fetchEventById(String(event._id));
    if (fresh) setEventLive(fresh);
    return fresh || eventLive;
  };

  const openMarkModalFor = async ({ studentId, preferredSessionName }) => {
    setSelectedStudentId(String(studentId));
    setSnapshotDataUrl(null);

    let freshEvent = eventLive;
    try {
      freshEvent = await reloadEvent();
    } catch {
      // ignore
    }

    const list = Array.isArray(freshEvent?.studentSessions)
      ? freshEvent.studentSessions
      : Array.isArray(freshEvent?.sessions)
        ? freshEvent.sessions
        : [];

    const normalized = (Array.isArray(list) ? list : [])
      .map((s) => ({
        name: String(s?.name || "").trim(),
        isActive: Boolean(s?.isActive),
      }))
      .filter((s) => Boolean(s.name));

    const active = normalized.filter((s) => s.isActive);
    const preferred = String(preferredSessionName || "").trim();
    const canUsePreferred = active.some((s) => s.name === preferred);

    setSelectedSessionName(
      canUsePreferred
        ? preferred
        : active[0]?.name || normalized[0]?.name || "",
    );

    setMarkModalOpen(true);
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?._id, event?._id]);

  useEffect(() => {
    return () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      } catch {
        // ignore
      }
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    setCoords(null);

    // 1. Initialize camera stream immediately
    const cameraPromise = (async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraOn(true);
      } catch (e) {
        setCameraOn(false);
        throw new Error("Camera permission denied or unavailable");
      }
    })();

    // 2. Request geolocation in parallel
    const geoPromise = (async () => {
      try {
        const getGeoLocation = () => {
          return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error("Geolocation is not supported by your browser"));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                });
              },
              (err) => {
                reject(new Error("Location permission denied or unavailable"));
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          });
        };

        const loc = await getGeoLocation();

        // Instantly save coords with a default geocoding state
        setCoords({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          locationName: "Fetching address...",
        });

        // Trigger slow reverse-geocoding in the background
        (async () => {
          let locName = "";
          try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=18&addressdetails=1`;
            const resp = await fetch(url, {
              headers: {
                "Accept-Language": "en"
              }
            });
            if (resp.ok) {
              const data = await resp.json();
              const addr = data.address || {};

              const excludedKeywords = [
                "constituency",
                "assembly",
                "parliamentary",
                "district",
                "state",
                "country",
                "india",
                "tamil nadu",
                "postal",
                "postcode"
              ];

              const localName =
                addr.amenity ||
                addr.building ||
                addr.shop ||
                addr.office ||
                addr.university ||
                addr.college ||
                addr.school ||
                addr.hospital ||
                addr.tourism ||
                addr.historic ||
                addr.tourist_attraction ||
                addr.house_name;
              const street = addr.road || addr.pedestrian || addr.highway || addr.path;
              const neighborhood = addr.neighbourhood || addr.suburb || addr.city_district || addr.subdivision;
              const city = addr.city || addr.town || addr.village;

              const parts = [localName, street, neighborhood, city].filter(Boolean);
              let filteredParts = parts.filter(part => {
                const lower = part.toLowerCase();
                return !excludedKeywords.some(keyword => lower.includes(keyword));
              });

              if (filteredParts.length > 0) {
                locName = filteredParts.join(", ");
              } else {
                const dispParts = (data.display_name || "").split(",").map(p => p.trim());
                const filteredDisp = dispParts.filter(part => {
                  const lower = part.toLowerCase();
                  if (/^\d{5,6}$/.test(lower)) return false;
                  return !excludedKeywords.some(keyword => lower.includes(keyword));
                });
                locName = filteredDisp.join(", ") || data.display_name || "";
              }
            }
          } catch (err) {
            console.error("Nominatim reverse geocoding failed", err);
          }

          let poiName = "";
          try {
            const query = `[out:json];(
              node(around:500, ${loc.latitude}, ${loc.longitude})["amenity"];
              way(around:500, ${loc.latitude}, ${loc.longitude})["amenity"];
              node(around:500, ${loc.latitude}, ${loc.longitude})["building"];
              way(around:500, ${loc.latitude}, ${loc.longitude})["building"];
              node(around:500, ${loc.latitude}, ${loc.longitude})["office"];
              way(around:500, ${loc.latitude}, ${loc.longitude})["office"];
            );out tags;`;
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
            const overpassResp = await fetch(overpassUrl);
            if (overpassResp.ok) {
              const overpassData = await overpassResp.json();
              const elements = overpassData.elements || [];
              const named = elements.filter(el => el.tags && el.tags.name);
              if (named.length > 0) {
                named.sort((a, b) => {
                  const aTags = a.tags || {};
                  const bTags = b.tags || {};
                  const aName = (aTags.name || "").toLowerCase();
                  const bName = (bTags.name || "").toLowerCase();
                  const aWeight = aTags.university || aTags.college || aName.includes("university") || aName.includes("college") ? 3 :
                    aTags.amenity === "library" || aName.includes("library") ? 2 : 1;
                  const bWeight = bTags.university || bTags.college || bName.includes("university") || bName.includes("college") ? 3 :
                    bTags.amenity === "library" || bName.includes("library") ? 2 : 1;
                  return bWeight - aWeight;
                });
                poiName = named[0].tags.name;
              }
            }
          } catch (err) {
            console.error("Overpass query failed", err);
          }

          if (poiName) {
            if (!locName.toLowerCase().includes(poiName.toLowerCase())) {
              locName = `${poiName}, ${locName}`;
            }
          }

          setCoords({
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            locationName: locName || `Lat: ${loc.latitude.toFixed(4)}, Lon: ${loc.longitude.toFixed(4)}`,
          });
        })();

      } catch (e) {
        setCoords(null);
        throw e;
      }
    })();

    // Wait for both to complete or throw
    try {
      await Promise.all([cameraPromise, geoPromise]);
    } catch (e) {
      setError(e.message || "Camera or Location permission denied");
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      } catch { }
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch {
      // ignore
    }
    setCameraOn(false);
    setCoords(null);
  };

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    // JPEG keeps payload smaller than PNG
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    setSnapshotDataUrl(dataUrl);
  };

  const submit = async () => {
    if (!selectedStudentId || !selectedSessionName || !snapshotDataUrl) return;
    if (!team?._id || !event?._id) return;
    if (!coords) {
      setError("Location coordinate access is required to submit attendance");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitStudentAttendance({
        eventId: event._id,
        teamId: team._id,
        studentId: selectedStudentId,
        sessionName: selectedSessionName,
        photoDataUrl: snapshotDataUrl,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationName: coords.locationName,
        accuracy: coords.accuracy,
      });
      setSnapshotDataUrl(null);
      setSelectedStudentId(null);
      stopCamera();
      setMarkModalOpen(false);
      await loadRecords();
    } catch (e) {
      setError(e?.message || "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!markModalOpen) {
      stopCamera();
      setSnapshotDataUrl(null);
      return;
    }

    // When modal opens: start camera and default session to active
    (async () => {
      if (!selectedSessionName) {
        const preferred = activeSessions[0]?.name || sessionNames[0] || "";
        setSelectedSessionName(preferred);
      }
      await startCamera();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markModalOpen]);

  if (!team || !event) {
    return (
      <div className="rounded-2xl border border-white/5 bg-neutral-900/35 backdrop-blur-md p-6 text-center text-neutral-400 max-w-md mx-auto shadow-xl">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-white">No Team or Event Found</p>
        <p className="text-xs text-neutral-400 mt-1">Unable to load attendance records for the selected team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/35 backdrop-blur-md p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <h2 className="text-xl font-bold tracking-tight text-white">Event Attendance</h2>
            </div>
            <p className="text-sm text-neutral-400 mt-1">
              Mark attendance with a snapshot (sessions are managed by the Event Manager).
            </p>
            {eventLive?.title ? (
              <p className="text-xs text-blue-300 font-medium mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Event: {eventLive.title}
              </p>
            ) : null}
          </div>
          <button
            onClick={async () => {
              if (onRefresh) {
                try {
                  await onRefresh();
                } catch {
                  // ignore
                }
              } else {
                try {
                  await reloadEvent();
                } catch {
                  // ignore
                }
              }
              await loadRecords();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/60 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/10 text-neutral-300 hover:text-blue-300 text-xs font-semibold transition-all duration-300 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 p-4 text-sm text-rose-200 flex items-center gap-2.5 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Attendance Records Card Container */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/35 backdrop-blur-md p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Attendance Record
          </h3>
        </div>

        {sessions.length === 0 && (
          <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4 text-sm text-yellow-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p>
              No Student Sessions are configured for this event
              {eventLive?.title ? ` (${eventLive.title})` : ""}. Ask the Event
              Manager/Admin to add sessions in the Sessions page under the
              "Student Sessions" tab.
            </p>
          </div>
        )}

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-neutral-900/90 backdrop-blur border-b border-white/5 px-4 py-3 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                  Member
                </th>
                <th className="sticky left-65 z-20 bg-neutral-900/90 backdrop-blur border-b border-white/5 px-4 py-3 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                  Role
                </th>
                {sessions.map((s) => (
                  <th
                    key={s.name}
                    className="border-b border-white/5 px-4 py-3 text-left text-xs font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    Session {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => {
                const sid = String(m?._id || m);
                const fullName = String(m?.name || "Member");
                const initial = (fullName.trim()[0] || "M").toUpperCase();
                const isLeader = leaderId && sid === leaderId;
                const role = isLeader ? "Team Lead" : "Member";
                return (
                  <tr key={sid} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                    <td className="sticky left-0 z-10 bg-neutral-950/80 backdrop-blur border-b border-white/5 px-4 py-4 align-middle min-w-65">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-linear-to-br from-blue-500/30 to-cyan-400/20 border border-white/10 flex items-center justify-center text-neutral-100 font-bold text-sm">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-bold truncate">
                            {fullName}
                          </p>
                          {m?.regno ? (
                            <p className="text-xs text-neutral-500 truncate">
                              {m.regno}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="sticky left-65 z-10 bg-neutral-950/80 backdrop-blur border-b border-white/5 px-4 py-4 align-middle min-w-37.5">
                      <span
                        className={
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider " +
                          roleBadge(role)
                        }
                      >
                        {role}
                      </span>
                    </td>

                    {sessions.map((s) => {
                      const rec = recordByStudentAndSession.get(
                        `${sid}__${s.name}`,
                      );
                      const status = rec?.status || "not_marked";
                      const allowResubmit = Boolean(rec?.allowResubmit);
                      const showClosed = !s.isActive && status === "not_marked";
                      const canMarkHere = s.isActive && status === "not_marked";
                      const canReMarkHere =
                        s.isActive && status === "rejected" && allowResubmit;

                      return (
                        <td
                          key={`${sid}__${s.name}`}
                          className="border-b border-white/5 px-4 py-4 align-middle min-w-45"
                        >
                          {status === "approved" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Present</span>
                            </span>
                          ) : showClosed ? (
                            <span className="text-xs text-neutral-500 italic bg-neutral-800/40 border border-white/5 px-2.5 py-0.5 rounded-full">
                              Closed
                            </span>
                          ) : status === "pending" ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </span>
                          ) : canMarkHere ? (
                            <button
                              onClick={() =>
                                openMarkModalFor({
                                  studentId: sid,
                                  preferredSessionName: s.name,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-xs text-white font-semibold transition-all cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-green-500"
                            >
                              Mark
                            </button>
                          ) : canReMarkHere ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-xs">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rejected</span>
                              </span>
                              <button
                                onClick={() =>
                                  openMarkModalFor({
                                    studentId: sid,
                                    preferredSessionName: s.name,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-xs text-white font-semibold transition-all cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-green-500"
                              >
                                Mark
                              </button>
                            </div>
                          ) : status === "rejected" ? (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-xs">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400 bg-neutral-800/40 border border-white/5 px-2.5 py-0.5 rounded-full">
                              Not marked
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {teamMembers.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(1, sessions.length + 2)}
                    className="py-10 text-center text-neutral-400 text-sm"
                  >
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Layout */}
        <div className="mt-4 block md:hidden space-y-4">
          {teamMembers.map((m) => {
            const sid = String(m?._id || m);
            const fullName = String(m?.name || "Member");
            const initial = (fullName.trim()[0] || "M").toUpperCase();
            const isLeader = leaderId && sid === leaderId;
            const role = isLeader ? "Team Lead" : "Member";

            return (
              <div 
                key={sid} 
                className="bg-neutral-900/20 border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg backdrop-blur-md hover:border-white/10 transition-all duration-300"
              >
                {/* Member Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-linear-to-br from-blue-500/30 to-cyan-400/20 border border-white/10 flex items-center justify-center text-neutral-100 font-bold">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white truncate">{fullName}</h4>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${roleBadge(role)}`}>
                        {role}
                      </span>
                    </div>
                    {m?.regno && <p className="text-xs text-neutral-400 mt-0.5">{m.regno}</p>}
                  </div>
                </div>

                {/* Sessions Status List */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Sessions Status</span>
                  {sessions.map((s) => {
                    const rec = recordByStudentAndSession.get(`${sid}__${s.name}`);
                    const status = rec?.status || "not_marked";
                    const allowResubmit = Boolean(rec?.allowResubmit);
                    const showClosed = !s.isActive && status === "not_marked";
                    const canMarkHere = s.isActive && status === "not_marked";
                    const canReMarkHere = s.isActive && status === "rejected" && allowResubmit;

                    return (
                      <div 
                        key={s.name} 
                        className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/40 border border-white/5 text-xs gap-3"
                      >
                        <span className="font-semibold text-neutral-300">Session {s.name}</span>
                        <div className="shrink-0">
                          {status === "approved" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Present</span>
                            </span>
                          ) : showClosed ? (
                            <span className="text-neutral-500 italic bg-neutral-800/40 border border-white/5 px-2 py-0.5 rounded-full">
                              Closed
                            </span>
                          ) : status === "pending" ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          ) : canMarkHere ? (
                            <button
                              onClick={() =>
                                openMarkModalFor({
                                  studentId: sid,
                                  preferredSessionName: s.name,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-[11px] font-semibold text-white transition-all cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-green-500"
                            >
                              Mark
                            </button>
                          ) : canReMarkHere ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" />
                                <span>Rejected</span>
                              </span>
                              <button
                                onClick={() =>
                                  openMarkModalFor({
                                    studentId: sid,
                                    preferredSessionName: s.name,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-[11px] font-semibold text-white transition-all cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-green-500"
                              >
                                Mark
                              </button>
                            </div>
                          ) : status === "rejected" ? (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400 bg-neutral-800/40 border border-white/5 px-2 py-0.5 rounded-full">
                              Not marked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {teamMembers.length === 0 && (
            <div className="py-10 text-center text-neutral-500 text-sm bg-neutral-900/10 rounded-2xl border border-dashed border-white/5">
              No team members found.
            </div>
          )}
        </div>
      </div>

      {/* Snap Modal */}
      {markModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => {
              setMarkModalOpen(false);
              setSelectedStudentId(null);
              setSnapshotDataUrl(null);
            }}
          />

          <div className="relative w-full max-w-2xl rounded-3xl border border-white/5 bg-neutral-950/90 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Background radial glows */}
            <div className="absolute top-0 -left-12 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 -right-12 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
              <div>
                <h4 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-400 shrink-0" />
                  Mark Attendance
                </h4>
                <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-neutral-200">{selectedMember?.name || "Member"}</span>
                  {selectedSessionName && (
                    <>
                      <span className="text-neutral-600">•</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                        Session {selectedSessionName}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setMarkModalOpen(false);
                  setSelectedStudentId(null);
                  setSnapshotDataUrl(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-neutral-900/60 border border-white/5 hover:border-white/10 hover:bg-neutral-900 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1"><Video className="w-3 h-3 text-blue-400" /> Live Camera Feed</span>
                  <div className="rounded-2xl border border-white/5 bg-neutral-950 overflow-hidden aspect-video flex items-center justify-center relative shadow-inner">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    {!cameraOn && (
                      <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center text-neutral-500 text-xs p-4 text-center">
                        <Video className="w-8 h-8 text-neutral-700 mb-2 animate-pulse" />
                        Camera is initializing or disabled
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1"><LucideImage className="w-3 h-3 text-emerald-400" /> Captured Snapshot</span>
                  <div className="rounded-2xl border border-white/5 bg-neutral-950 overflow-hidden aspect-video flex items-center justify-center relative shadow-inner">
                    {snapshotDataUrl ? (
                      <img
                        src={snapshotDataUrl}
                        alt="Snapshot preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center text-neutral-500 text-xs p-4 text-center">
                        <LucideImage className="w-8 h-8 text-neutral-700 mb-2" />
                        Take a snap to preview here
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-neutral-900/30 border border-white/5 text-xs text-neutral-400">
                <MapPin className={cn("w-4 h-4 shrink-0 mt-0.5", coords ? "text-emerald-400" : "text-blue-400 animate-pulse")} />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-neutral-300 block">Verified Location:</span>
                  {coords ? (
                    <span className="truncate block mt-0.5" title={coords.locationName}>
                      {coords.locationName}
                    </span>
                  ) : (
                    <span className="block mt-0.5 text-neutral-500 animate-pulse">Verifying location...</span>
                  )}
                </div>
              </div>

              {(!cameraOn || !coords) && activeSessions.length > 0 && (
                <div className="text-xs text-rose-300 bg-rose-950/20 border border-rose-900/20 rounded-xl p-4 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
                    Permissions Required
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-rose-300/80">
                    {!cameraOn && <li>Camera access is required to take a snapshot.</li>}
                    {!coords && <li>Location access is required to mark attendance.</li>}
                  </ul>
                  <p className="text-[10px] text-neutral-500 font-medium">Please grant permissions in your browser settings to proceed.</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 flex-col sm:flex-row pt-4 border-t border-white/5">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={captureSnapshot}
                    disabled={!cameraOn || !coords || !coords.locationName || coords.locationName === "Fetching address..." || activeSessions.length === 0}
                    className={
                      "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer " +
                      (!cameraOn || !coords || !coords.locationName || coords.locationName === "Fetching address..." || activeSessions.length === 0
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 focus-visible:ring-2 focus-visible:ring-blue-500")
                    }
                  >
                    Take Snap
                  </button>
                  <button
                    onClick={() => {
                      setSnapshotDataUrl(null);
                    }}
                    disabled={!snapshotDataUrl}
                    className={
                      "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer " +
                      (!snapshotDataUrl
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5"
                        : "bg-neutral-900/60 border border-white/5 hover:border-white/10 hover:bg-neutral-900 text-white shadow-md")
                    }
                  >
                    Retake
                  </button>
                </div>

                <button
                  disabled={
                    !selectedStudentId ||
                    !selectedSessionName ||
                    !snapshotDataUrl ||
                    submitting ||
                    activeSessions.length === 0
                  }
                  onClick={submit}
                  className={
                    "w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer " +
                    (!selectedStudentId ||
                      !selectedSessionName ||
                      !snapshotDataUrl ||
                      submitting ||
                      activeSessions.length === 0
                      ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5"
                      : "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/10 focus-visible:ring-2 focus-visible:ring-green-500")
                  }
                >
                  {submitting ? "Submitting..." : "Submit Attendance"}
                </button>
              </div>

              {loadingRecords && (
                <p className="text-xs text-neutral-500 animate-pulse text-right">Loading records...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
