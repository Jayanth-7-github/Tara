import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { checkLogin } from "../services/auth";
import {
  allowStudentAttendanceResubmit,
  fetchEvents,
  fetchManagerAttendanceSubmissions,
  fetchTeams,
  getRoles,
  reviewStudentAttendance,
} from "../services/api";

function StatusBadge({ status }) {
  const s = String(status || "pending");
  const cls =
    s === "approved"
      ? "bg-emerald-900/30 text-emerald-200 border-emerald-800/50"
      : s === "rejected"
        ? "bg-red-900/30 text-red-200 border-red-800/50"
        : "bg-yellow-900/30 text-yellow-200 border-yellow-800/50";

  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide " +
        cls
      }
    >
      {s.toUpperCase()}
    </span>
  );
}

function TeamCard({ teamId, teamName, stats, active, onSelect }) {
  const pending = stats?.pending || 0;
  const approved = stats?.approved || 0;
  const rejected = stats?.rejected || 0;
  const total = stats?.total || 0;
  const initial = (String(teamName || "T").trim()[0] || "T").toUpperCase();

  return (
    <button
      onClick={onSelect}
      className={
        "w-full text-left rounded-xl border p-4 transition-all duration-200 " +
        (active
          ? "border-blue-500/40 bg-blue-500/10"
          : "border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900/50 hover:border-neutral-700")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-linear-to-br from-blue-500/30 to-cyan-400/20 border border-neutral-800 flex items-center justify-center text-neutral-100 text-sm font-bold">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {teamName}
            </p>
            <p className="text-xs text-neutral-500">{total} submissions</p>
          </div>
        </div>
        <span className="text-xs text-neutral-600">
          #{String(teamId).slice(-4)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-400/80" />
          {pending}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
          {approved}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400/80" />
          {rejected}
        </span>
      </div>
    </button>
  );
}

function TeamsSidebar({
  teams,
  selectedTeamId,
  statsById,
  loading,
  onSelect,
  searchTerm,
  onSearchChange,
}) {
  return (
    <aside className="hidden md:flex w-70 shrink-0 border-r border-neutral-800 bg-neutral-950/60">
      <div className="scrollbar-hidden w-full h-full overflow-y-auto p-4">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Teams
        </p>

        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search team name"
          aria-label="Search team name"
          className="mb-4 w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500/60"
        />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 animate-pulse"
              >
                <div className="h-4 w-32 bg-neutral-800 rounded" />
                <div className="mt-2 h-3 w-24 bg-neutral-800 rounded" />
                <div className="mt-3 h-3 w-40 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 text-sm text-neutral-400">
            {String(searchTerm || "").trim()
              ? "No teams match your search."
              : "No teams found for this event."}
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((t) => (
              <TeamCard
                key={t.teamId}
                teamId={t.teamId}
                teamName={t.teamName}
                stats={statsById.get(t.teamId)}
                active={t.teamId === selectedTeamId}
                onSelect={() => onSelect(t.teamId)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function StudentAttendanceCard({
  record,
  busy,
  onApprove,
  onReject,
  onAllowRemark,
}) {
  const st = record?.student;
  const status = record?.status || "pending";

  const canAllowRemark =
    status === "rejected" && !Boolean(record?.allowResubmit);
  const remarkEnabled = status === "rejected" && Boolean(record?.allowResubmit);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden hover:border-neutral-700 transition-colors">
      <div className="aspect-video bg-black border-b border-neutral-800">
        {record?.photoDataUrl ? (
          <img
            src={record.photoDataUrl}
            alt="Student snapshot"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
            No photo
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {st?.name || "Student"}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {st?.regno || ""}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {status === "pending" && (
          <div className="mt-4 flex gap-2">
            <button
              disabled={busy}
              onClick={onApprove}
              className={
                "flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors " +
                (busy
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white")
              }
            >
              {busy ? "Working..." : "Approve"}
            </button>
            <button
              disabled={busy}
              onClick={onReject}
              className={
                "flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors " +
                (busy
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 text-white")
              }
            >
              {busy ? "Working..." : "Reject"}
            </button>
          </div>
        )}

        {canAllowRemark && (
          <div className="mt-4">
            <button
              disabled={busy}
              onClick={onAllowRemark}
              className={
                "w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors " +
                (busy
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white")
              }
            >
              {busy ? "Enabling..." : "Allow Re-mark"}
            </button>
          </div>
        )}

        {remarkEnabled && (
          <p className="mt-3 text-xs text-emerald-300">
            Re-mark enabled for student
          </p>
        )}
      </div>
    </div>
  );
}

function SessionSection({ sessionName, records, renderCard }) {
  const list = Array.isArray(records) ? records : [];

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{sessionName}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {list.length} records
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
          No submissions in this session.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((r) => renderCard(r))}
        </div>
      )}
    </section>
  );
}

function TeamDetailsPanel({
  loading,
  selectedTeam,
  stats,
  sessions,
  teamOptions,
  selectedTeamId,
  onSelectTeam,
  searchTerm,
  renderCard,
}) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 animate-pulse">
          <div className="h-5 w-40 bg-neutral-800 rounded" />
          <div className="mt-3 h-3 w-64 bg-neutral-800 rounded" />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 bg-neutral-950/40 overflow-hidden"
              >
                <div className="aspect-video bg-neutral-900" />
                <div className="p-4">
                  <div className="h-4 w-32 bg-neutral-800 rounded" />
                  <div className="mt-2 h-3 w-20 bg-neutral-800 rounded" />
                  <div className="mt-4 h-9 w-full bg-neutral-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!teamOptions.length) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-10 text-center text-sm text-neutral-400">
          {String(searchTerm || "").trim()
            ? "No teams match your search."
            : "No teams available for this event."}
        </div>
      </div>
    );
  }

  if (!selectedTeamId || !selectedTeam || !stats) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-10 text-center text-sm text-neutral-400">
          Select a team to view submissions.
        </div>
      </div>
    );
  }

  const sessionsCount = sessions.length;
  const avatar = (
    String(selectedTeam.teamName || "T").trim()[0] || "T"
  ).toUpperCase();

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-linear-to-br from-blue-500/30 to-cyan-400/20 border border-neutral-800 flex items-center justify-center text-white font-bold">
              {avatar}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">
                {selectedTeam.teamName}
              </h2>
              <p className="text-sm text-neutral-400 mt-0.5">
                {stats.total} submissions • {sessionsCount} sessions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400/80" />
              {stats.pending}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              {stats.approved}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400/80" />
              {stats.rejected}
            </span>
          </div>
        </div>

        {/* Mobile team selector (sidebar collapses) */}
        <div className="mt-4 md:hidden">
          <label className="text-xs text-neutral-400 uppercase tracking-wider">
            Team
          </label>
          <select
            value={selectedTeamId}
            onChange={(e) => onSelectTeam(e.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
          >
            {teamOptions.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.teamName} ({t.total})
              </option>
            ))}
          </select>
        </div>
      </div>

      {sessionsCount === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-10 text-center text-sm text-neutral-400">
          No submissions for this team yet.
        </div>
      ) : (
        <div className="space-y-5">
          {sessions.map((s) => (
            <SessionSection
              key={s.sessionName}
              sessionName={s.sessionName}
              records={s.records}
              renderCard={renderCard}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar({
  events,
  selectedEventId,
  onChangeEvent,
  onRefresh,
  loading,
  error,
}) {
  return (
    <header className="shrink-0 border-b border-neutral-800 bg-neutral-950/70 backdrop-blur">
      <div className="max-w-350 mx-auto px-4 sm:px-6 py-4 flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Student Snap
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Review student attendance submissions
          </p>
        </div>

        <div className="flex gap-2 items-center w-full md:w-auto">
          <select
            value={selectedEventId}
            onChange={(e) => onChangeEvent(e.target.value)}
            className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
          >
            {events.map((ev) => (
              <option key={ev._id || ev.id} value={ev._id || ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          <button
            onClick={onRefresh}
            disabled={loading}
            className={
              "px-3 py-2 rounded-xl text-sm font-semibold transition-colors border " +
              (loading
                ? "bg-neutral-900/30 border-neutral-800 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-900/40 hover:bg-neutral-900/60 border-neutral-800 text-white")
            }
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-350 mx-auto px-4 sm:px-6 pb-4">
          <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
            {error}
          </div>
        </div>
      )}
    </header>
  );
}

function StudentSnapLayout({ topBar, sidebar, children }) {
  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-white">
      {topBar}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-350 mx-auto flex overflow-hidden">
          {sidebar}
          <main className="scrollbar-hidden flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function StudentSnapSection({ events }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamSearchTerm, setTeamSearchTerm] = useState("");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!selectedEventId && Array.isArray(events) && events.length > 0) {
      setSelectedEventId(String(events[0]._id || events[0].id || ""));
    }
  }, [events, selectedEventId]);

  const orderedTeams = useMemo(() => {
    return (Array.isArray(teams) ? teams : [])
      .map((t) => ({
        teamId: String(t?._id || t?.id || ""),
        teamName: t?.name || "Team",
      }))
      .filter((t) => Boolean(t.teamId))
      .sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const query = String(teamSearchTerm || "")
      .trim()
      .toLowerCase();
    if (!query) return orderedTeams;

    return orderedTeams.filter((team) =>
      String(team?.teamName || "")
        .toLowerCase()
        .includes(query),
    );
  }, [orderedTeams, teamSearchTerm]);

  const statsById = useMemo(() => {
    const map = new Map();

    const ensure = (teamId, teamName) => {
      if (!map.has(teamId)) {
        map.set(teamId, {
          teamId,
          teamName: teamName || "Team",
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          sessions: new Map(),
        });
      }
      return map.get(teamId);
    };

    for (const r of Array.isArray(records) ? records : []) {
      const teamId = String(r?.team?._id || r?.team || "");
      if (!teamId) continue;
      const teamName = r?.team?.name || "Team";
      const sessionName = String(r?.sessionName || "default");
      const status = String(r?.status || "pending");

      const t = ensure(teamId, teamName);
      t.total += 1;
      if (status === "approved") t.approved += 1;
      else if (status === "rejected") t.rejected += 1;
      else t.pending += 1;

      if (!t.sessions.has(sessionName)) t.sessions.set(sessionName, []);
      t.sessions.get(sessionName).push(r);
    }

    for (const t of orderedTeams) {
      ensure(t.teamId, t.teamName);
    }

    return map;
  }, [records, orderedTeams]);

  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return filteredTeams.find((t) => t.teamId === selectedTeamId) || null;
  }, [filteredTeams, selectedTeamId]);

  const selectedStats = useMemo(() => {
    if (!selectedTeamId) return null;
    return statsById.get(selectedTeamId) || null;
  }, [statsById, selectedTeamId]);

  const sessionsForSelectedTeam = useMemo(() => {
    if (!selectedStats?.sessions) return [];
    return Array.from(selectedStats.sessions.entries())
      .map(([sessionName, recs]) => ({
        sessionName,
        records: Array.isArray(recs) ? recs : [],
      }))
      .sort((a, b) => a.sessionName.localeCompare(b.sessionName));
  }, [selectedStats]);

  const teamOptionsForMobile = useMemo(() => {
    return filteredTeams.map((t) => ({
      ...t,
      total: statsById.get(t.teamId)?.total || 0,
    }));
  }, [filteredTeams, statsById]);

  const loadData = async ({ keepTeamSelection = true } = {}) => {
    if (!selectedEventId) return;

    setLoading(true);
    setError(null);

    const [teamsResult, submissionsResult] = await Promise.allSettled([
      fetchTeams(selectedEventId),
      fetchManagerAttendanceSubmissions({ eventId: selectedEventId }),
    ]);

    let nextTeams = [];
    if (teamsResult.status === "fulfilled") {
      const body = teamsResult.value;
      nextTeams = Array.isArray(body?.teams)
        ? body.teams
        : Array.isArray(body)
          ? body
          : [];
    }

    let nextRecords = [];
    if (submissionsResult.status === "fulfilled") {
      const body = submissionsResult.value;
      nextRecords = Array.isArray(body?.records) ? body.records : [];
    }

    if (
      teamsResult.status === "rejected" &&
      submissionsResult.status === "rejected"
    ) {
      setError(
        teamsResult.reason?.message ||
          submissionsResult.reason?.message ||
          "Failed to load data",
      );
    } else if (teamsResult.status === "rejected") {
      setError(teamsResult.reason?.message || "Failed to load teams");
    } else if (submissionsResult.status === "rejected") {
      setError(
        submissionsResult.reason?.message || "Failed to load submissions",
      );
    }

    if (!nextTeams.length && nextRecords.length) {
      const byId = new Map();
      for (const r of nextRecords) {
        const id = String(r?.team?._id || r?.team || "");
        if (!id) continue;
        if (!byId.has(id))
          byId.set(id, { _id: id, name: r?.team?.name || "Team" });
      }
      nextTeams = Array.from(byId.values());
    }

    setTeams(nextTeams);
    setRecords(nextRecords);

    if (!keepTeamSelection) setSelectedTeamId("");

    setLoading(false);
  };

  useEffect(() => {
    if (!selectedEventId) return;
    loadData({ keepTeamSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  useEffect(() => {
    if (!filteredTeams.length) {
      setSelectedTeamId("");
      return;
    }

    setSelectedTeamId((prev) => {
      if (prev && filteredTeams.some((t) => t.teamId === prev)) return prev;
      return filteredTeams[0].teamId;
    });
  }, [filteredTeams]);

  const decide = async (attendanceId, decision) => {
    setActionLoading((p) => ({ ...p, [attendanceId]: true }));
    setError(null);
    try {
      await reviewStudentAttendance({ attendanceId, decision });
      await loadData();
    } catch (e) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading((p) => ({ ...p, [attendanceId]: false }));
    }
  };

  const allowRemark = async (attendanceId) => {
    setActionLoading((p) => ({ ...p, [attendanceId]: true }));
    setError(null);
    try {
      await allowStudentAttendanceResubmit({ attendanceId });
      await loadData();
    } catch (e) {
      setError(e?.message || "Failed to allow re-marking");
    } finally {
      setActionLoading((p) => ({ ...p, [attendanceId]: false }));
    }
  };

  if (!Array.isArray(events) || events.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center text-sm text-neutral-400">No events.</div>
      </div>
    );
  }

  return (
    <StudentSnapLayout
      topBar={
        <TopBar
          events={events}
          selectedEventId={selectedEventId}
          onChangeEvent={setSelectedEventId}
          onRefresh={() => loadData()}
          loading={loading}
          error={error}
        />
      }
      sidebar={
        <TeamsSidebar
          teams={filteredTeams}
          selectedTeamId={selectedTeamId}
          statsById={statsById}
          loading={loading}
          onSelect={setSelectedTeamId}
          searchTerm={teamSearchTerm}
          onSearchChange={setTeamSearchTerm}
        />
      }
    >
      <div className="transition-opacity duration-200">
        <TeamDetailsPanel
          key={selectedTeamId || "no-team"}
          loading={loading}
          selectedTeam={selectedTeam}
          stats={selectedStats}
          sessions={sessionsForSelectedTeam}
          teamOptions={teamOptionsForMobile}
          selectedTeamId={selectedTeamId}
          onSelectTeam={setSelectedTeamId}
          searchTerm={teamSearchTerm}
          renderCard={(r) => {
            const id = r?._id;
            const busy = Boolean(actionLoading?.[id]);
            return (
              <StudentAttendanceCard
                key={id}
                record={r}
                busy={busy}
                onApprove={() => decide(id, "approved")}
                onReject={() => decide(id, "rejected")}
                onAllowRemark={() => allowRemark(id)}
              />
            );
          }}
        />
      </div>
    </StudentSnapLayout>
  );
}

export default function StudentSnap() {
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState(null);

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

  useEffect(() => {
    if (!authorized || !user) return;

    const loadEvents = async () => {
      setLoadingEvents(true);
      setEventsError(null);
      try {
        const res = await fetchEvents();
        const allEvents = res?.events || res || [];

        const rc = await getRoles().catch(() => null);
        const eventManagersByEvent = rc?.eventManagersByEvent || {};

        const userEmail = (user?.email || "").toLowerCase().trim();

        const isConfiguredManagerFor = (ev) => {
          const titleKey = ev?.title ? String(ev.title).trim() : "";
          const idKey = ev?._id ? String(ev._id).trim() : "";
          const keys = [titleKey, idKey].filter(Boolean);

          for (const k of keys) {
            const list = Array.isArray(eventManagersByEvent?.[k])
              ? eventManagersByEvent[k]
              : [];
            const normalized = list.map((x) => String(x).toLowerCase().trim());
            if (normalized.includes(userEmail)) return true;
          }
          return false;
        };

        const managedEvents = (
          Array.isArray(allEvents) ? allEvents : []
        ).filter((ev) => {
          if (user?.role === "admin") return true;
          const managerEmail = (ev?.managerEmail || "").toLowerCase().trim();
          return managerEmail === userEmail || isConfiguredManagerFor(ev);
        });

        setEvents(managedEvents);
      } catch (e) {
        setEvents([]);
        setEventsError(e?.message || "Failed to load events");
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, [authorized, user]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Loading Student Snap...</p>
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
            You do not have permission to view Student Snap.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {eventsError && (
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
            {eventsError}
          </div>
        </div>
      )}

      {loadingEvents ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-10 text-center text-neutral-400 text-sm">
            No managed events found.
          </div>
        </div>
      ) : (
        <StudentSnapSection events={events} />
      )}
    </div>
  );
}
