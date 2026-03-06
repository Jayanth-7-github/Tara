import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import { IconClipboardList, IconLogout, IconHome } from "@tabler/icons-react";
import { cn } from "../lib/utils";
import { getMe, logout } from "../services/auth";
import TeamPanel from "../components/TeamPanel";
import {
  fetchStudent,
  fetchEventById,
  fetchTeams,
  fetchStudentAttendanceRecords,
  submitStudentAttendance,
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

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const profile = await getMe();
        const u = profile?.user || profile;
        setUser(u);

        // If the user logged in with regno, use it to find student + team.
        if (u?.regno) {
          const s = await fetchStudent(u.regno);
          setStudent(s);

          const regs = Array.isArray(s?.registrations) ? s.registrations : [];
          const latest = regs
            .slice()
            .sort(
              (a, b) =>
                new Date(b?.registeredAt || 0) - new Date(a?.registeredAt || 0),
            )[0];

          const evId = latest?.event || null;
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
      } catch (err) {
        setUser(null);
        setStudent(null);
        setTeam(null);
        setEvent(null);
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

      setLoading(false);
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
      label: "Attendance",
      section: "attendance",
      icon: (
        <IconClipboardList size={20} className="text-neutral-300 shrink-0" />
      ),
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
      case "attendance":
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <StudentAttendanceSection team={team} event={event} />
          </div>
        );
      case "overview":
      default:
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TeamPanel team={team} event={event} />
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
            <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-linear-to-br from-blue-500 to-cyan-400 mb-4" />
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

function StudentAttendanceSection({ team, event }) {
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
    const members = Array.isArray(team.members) ? team.members : [];
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
      setError("Camera permission denied or unavailable");
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
    setSubmitting(true);
    setError(null);
    try {
      await submitStudentAttendance({
        eventId: event._id,
        teamId: team._id,
        studentId: selectedStudentId,
        sessionName: selectedSessionName,
        photoDataUrl: snapshotDataUrl,
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
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-neutral-300">
        No team/event found for attendance.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div>
            <h2 className="text-lg font-semibold text-white">Attendance</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Mark attendance with a snapshot (sessions are managed by the Event
              Manager).
            </p>
            {eventLive?.title ? (
              <p className="text-xs text-neutral-500 mt-1">
                Event: {eventLive.title}
              </p>
            ) : null}
          </div>
          <button
            onClick={async () => {
              try {
                await reloadEvent();
              } catch {
                // ignore
              }
              await loadRecords();
            }}
            className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h3 className="text-base font-semibold text-white">
          Attendance Record
        </h3>

        {sessions.length === 0 && (
          <div className="mt-4 rounded-lg border border-yellow-900/40 bg-yellow-950/20 p-4 text-sm text-yellow-200">
            No Student Sessions are configured for this event
            {eventLive?.title ? ` (${eventLive.title})` : ""}. Ask the Event
            Manager/Admin to add sessions in the Sessions page under the
            "Student Sessions" tab.
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-4 py-3 text-left text-sm font-semibold text-neutral-200 whitespace-nowrap">
                  Member
                </th>
                <th className="sticky left-65 z-20 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-4 py-3 text-left text-sm font-semibold text-neutral-200 whitespace-nowrap">
                  Role
                </th>
                {sessions.map((s) => (
                  <th
                    key={s.name}
                    className="border-b border-neutral-800 px-4 py-3 text-left text-sm font-semibold text-neutral-200 whitespace-nowrap"
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
                  <tr key={sid} className="border-b border-neutral-800">
                    <td className="sticky left-0 z-10 bg-neutral-950 border-b border-neutral-800 px-4 py-5 align-middle min-w-65">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500/30 to-cyan-400/20 border border-neutral-800 flex items-center justify-center text-neutral-100 font-semibold">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base text-white font-semibold truncate">
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

                    <td className="sticky left-65 z-10 bg-neutral-950 border-b border-neutral-800 px-4 py-5 align-middle min-w-37.5">
                      <span
                        className={
                          "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium " +
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
                          className="border-b border-neutral-800 px-4 py-5 align-middle min-w-45"
                        >
                          {status === "approved" ? (
                            <div className="flex items-center gap-2 text-green-400 font-semibold">
                              <span className="text-xl leading-none">✓</span>
                              <span className="text-base">Present</span>
                            </div>
                          ) : showClosed ? (
                            <span className="text-base text-neutral-500 italic">
                              Closed
                            </span>
                          ) : status === "pending" ? (
                            <span className="text-base text-yellow-300 font-semibold">
                              Pending
                            </span>
                          ) : canMarkHere ? (
                            <button
                              onClick={() =>
                                openMarkModalFor({
                                  studentId: sid,
                                  preferredSessionName: s.name,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-xs text-white"
                            >
                              Mark
                            </button>
                          ) : canReMarkHere ? (
                            <div className="flex items-center gap-3">
                              <span className="text-base text-red-300 font-semibold">
                                Rejected
                              </span>
                              <button
                                onClick={() =>
                                  openMarkModalFor({
                                    studentId: sid,
                                    preferredSessionName: s.name,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-xs text-white"
                              >
                                Mark
                              </button>
                            </div>
                          ) : status === "rejected" ? (
                            <span className="text-base text-red-300 font-semibold">
                              Rejected
                            </span>
                          ) : (
                            <span className="text-base text-neutral-400">
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

              {teamMembers.length > 0 && sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={1}
                    className="py-10 text-center text-neutral-400 text-sm"
                  >
                    No sessions configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {markModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setMarkModalOpen(false);
              setSelectedStudentId(null);
              setSnapshotDataUrl(null);
            }}
          />

          <div className="relative w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-800">
              <div>
                <h4 className="text-lg font-semibold text-white">
                  Mark Attendance
                </h4>
                <p className="text-sm text-neutral-400 mt-1">
                  {selectedMember?.name || "Member"}
                  {selectedSessionName ? (
                    <span className="text-neutral-500">
                      {" "}
                      • {selectedSessionName}
                    </span>
                  ) : null}
                </p>
              </div>
              <button
                onClick={() => {
                  setMarkModalOpen(false);
                  setSelectedStudentId(null);
                  setSnapshotDataUrl(null);
                }}
                className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              {activeSessions.length === 0 ? (
                <div className="rounded-lg border border-yellow-900/40 bg-yellow-950/20 p-4 text-sm text-yellow-200">
                  No active sessions right now. Ask the Event Manager to open a
                  session.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <label className="text-sm text-neutral-300 whitespace-nowrap">
                    Session
                  </label>
                  <select
                    value={selectedSessionName}
                    onChange={(e) => {
                      setSelectedSessionName(e.target.value);
                      setSnapshotDataUrl(null);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm"
                  >
                    {activeSessions.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full aspect-video"
                    playsInline
                    muted
                  />
                </div>
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden flex items-center justify-center">
                  {snapshotDataUrl ? (
                    <img
                      src={snapshotDataUrl}
                      alt="Snapshot preview"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-sm text-neutral-500">
                      No snapshot captured
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
                <div className="flex gap-2">
                  <button
                    onClick={captureSnapshot}
                    disabled={!cameraOn || activeSessions.length === 0}
                    className={
                      "px-4 py-2 rounded-lg text-sm " +
                      (!cameraOn || activeSessions.length === 0
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white")
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
                      "px-4 py-2 rounded-lg text-sm " +
                      (!snapshotDataUrl
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : "bg-neutral-800 hover:bg-neutral-700 text-white")
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
                    "px-4 py-2 rounded-lg text-sm " +
                    (!selectedStudentId ||
                    !selectedSessionName ||
                    !snapshotDataUrl ||
                    submitting ||
                    activeSessions.length === 0
                      ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white")
                  }
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>

              {loadingRecords && (
                <p className="text-xs text-neutral-500">Loading records...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
