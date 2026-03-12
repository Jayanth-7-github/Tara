import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconArrowLeft,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconFileDescription,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import { checkLogin } from "../services/auth";
import {
  createProblemStatement,
  deleteProblemStatement,
  fetchEvents,
  fetchProblemStatements,
  fetchTeams,
  resetTeamProblemStatementSelection,
  toggleAllProblemStatements,
  updateProblemStatement,
} from "../services/api";
import { cn } from "../lib/utils";

function createEmptyForm() {
  return {
    title: "",
    description: "",
  };
}

function formatEventDate(value) {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date not set";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDescriptionPreview(value, limit = 72) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
}

function getMemberCount(team) {
  const leaderCount = team?.leader ? 1 : 0;
  const membersCount = Array.isArray(team?.members) ? team.members.length : 0;
  return leaderCount + membersCount;
}

function getManagedEvents(allEvents, auth) {
  const user = auth?.user || {};
  const role = String(user.role || "").toLowerCase();
  const userEmail = String(user.email || "")
    .toLowerCase()
    .trim();
  const managersByEvent = auth?.roles?.eventManagersByEvent || {};

  if (role === "admin") {
    return allEvents;
  }

  return allEvents.filter((event) => {
    const directManager =
      String(event?.managerEmail || "")
        .toLowerCase()
        .trim() === userEmail;
    if (directManager) return true;

    const keys = [
      String(event?._id || event?.id || ""),
      String(event?.title || ""),
    ];
    return keys.some((key) => {
      const list = Array.isArray(managersByEvent?.[key])
        ? managersByEvent[key]
        : [];
      return list
        .map((value) =>
          String(value || "")
            .toLowerCase()
            .trim(),
        )
        .includes(userEmail);
    });
  });
}

function SummaryCard({ title, value, subtitle, tone = "blue" }) {
  const toneClasses = {
    blue: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-200",
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-2.5 shadow-lg shadow-black/10 backdrop-blur">
      <div
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium",
          toneClasses[tone] || toneClasses.blue,
        )}
      >
        {title}
      </div>
      <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-neutral-400">{subtitle}</p>
    </div>
  );
}

function ProblemStatementModal({
  open,
  form,
  saving,
  editing,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const inputClassName =
    "w-full rounded-xl border border-neutral-800 bg-neutral-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60";
  const labelClassName = "text-sm font-medium text-neutral-200";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          className="mx-auto my-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/40 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                Problem statement
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {editing ? "Edit challenge" : "Create challenge"}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                Add the problem title and description for this event.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-800 p-2 text-neutral-400 transition hover:border-neutral-700 hover:text-white"
            >
              <IconX size={18} />
            </button>
          </div>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
              <div>
                <label className={labelClassName}>Title</label>
                <input
                  value={form.title}
                  onChange={(event) => onChange("title", event.target.value)}
                  className={`${inputClassName} mt-2`}
                  placeholder="Two Sum on Event Scores"
                />
              </div>

              <div>
                <label className={labelClassName}>Description</label>
                <textarea
                  rows={10}
                  value={form.description}
                  onChange={(event) =>
                    onChange("description", event.target.value)
                  }
                  className={`${inputClassName} mt-2 min-h-40 resize-y`}
                  placeholder="Describe the problem clearly for participants."
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-800 px-5 py-3 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Create problem"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function TeamSelectionDetailModal({ team, onClose }) {
  if (!team?.selectedProblemStatement) return null;

  const selectedProblem = team.selectedProblemStatement;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          className="mx-auto my-4 flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/40 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                Team selection
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {team.name || "Unnamed team"}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                Full selected problem statement for this team.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-800 p-2 text-neutral-400 transition hover:border-neutral-700 hover:text-white"
            >
              <IconX size={18} />
            </button>
          </div>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Problem title
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  {selectedProblem.title || "Untitled problem"}
                </h3>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Description
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-300">
                  {selectedProblem.description ||
                    selectedProblem.statement ||
                    "No description available."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-neutral-800 px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-800 px-5 py-3 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ProblemStatements() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [statements, setStatements] = useState([]);
  const [teams, setTeams] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("problems");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState(null);
  const [resettingTeamId, setResettingTeamId] = useState("");
  const [form, setForm] = useState(createEmptyForm());

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const auth = await checkLogin();
        if (
          !auth?.authenticated ||
          !auth?.user ||
          !["admin", "member"].includes(
            String(auth.user.role || "").toLowerCase(),
          )
        ) {
          navigate("/main", { replace: true });
          return;
        }

        const data = await fetchEvents();
        if (!mounted) return;

        const allEvents = Array.isArray(data?.events)
          ? data.events
          : Array.isArray(data)
            ? data
            : [];
        const managedEvents = getManagedEvents(allEvents, auth).sort(
          (left, right) => new Date(right.date) - new Date(left.date),
        );

        setUser(auth.user);
        setEvents(managedEvents);
        setSelectedEventId((current) => {
          if (
            current &&
            managedEvents.some(
              (event) => String(event._id || event.id) === current,
            )
          ) {
            return current;
          }
          return managedEvents[0]
            ? String(managedEvents[0]._id || managedEvents[0].id)
            : "";
        });
      } catch (err) {
        if (mounted) {
          setMessage({
            text:
              err?.message ||
              "We could not prepare the problem statement workspace.",
            type: "error",
          });
        }
      } finally {
        if (mounted) setPageLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const selectedEvent = useMemo(
    () =>
      events.find(
        (event) =>
          String(event._id || event.id || "") === String(selectedEventId),
      ) || null,
    [events, selectedEventId],
  );

  const loadStatements = async (eventId = selectedEventId) => {
    if (!eventId) {
      setStatements([]);
      return;
    }

    setStatementsLoading(true);
    try {
      const data = await fetchProblemStatements(eventId);
      const items = Array.isArray(data?.items) ? data.items : [];
      setStatements(items);
    } catch (err) {
      setMessage({
        text: err?.message || "Failed to load problem statements.",
        type: "error",
      });
    } finally {
      setStatementsLoading(false);
    }
  };

  const loadTeams = async (eventId = selectedEventId) => {
    if (!eventId) {
      setTeams([]);
      return;
    }

    setTeamsLoading(true);
    try {
      const data = await fetchTeams(eventId);
      const items = Array.isArray(data?.teams) ? data.teams : [];
      setTeams(items);
    } catch (err) {
      setMessage({
        text: err?.message || "Failed to load teams for this event.",
        type: "error",
      });
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    setMessage({ text: "", type: "" });
    loadStatements(selectedEventId);
    loadTeams(selectedEventId);
  }, [selectedEventId]);

  const stats = useMemo(() => {
    const active = statements.filter((item) => item.isActive).length;
    return {
      total: statements.length,
      active,
      inactive: Math.max(statements.length - active, 0),
    };
  }, [statements]);

  const filteredStatements = useMemo(() => {
    const query = String(searchTerm || "")
      .trim()
      .toLowerCase();

    return statements.filter((item) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? item.isActive
            : !item.isActive;

      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [item.title, item.description].join(" ").toLowerCase();

      return haystack.includes(query);
    });
  }, [searchTerm, statements, statusFilter]);

  const selectedTeams = useMemo(() => {
    return teams.filter((team) => team?.selectedProblemStatement?._id);
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const query = String(searchTerm || "")
      .trim()
      .toLowerCase();

    return teams.filter((team) => {
      if (!query) return true;

      const members = [
        team?.leader,
        ...(Array.isArray(team?.members) ? team.members : []),
      ]
        .map((member) => `${member?.name || ""} ${member?.regno || ""}`.trim())
        .join(" ");

      const haystack = [
        team?.name,
        team?.selectedProblemStatement?.title,
        team?.selectedProblemStatement?.description,
        team?.selectedProblemStatementBy?.name,
        team?.selectedProblemStatementBy?.regno,
        members,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [searchTerm, teams]);

  const teamStats = useMemo(() => {
    return {
      total: teams.length,
      selected: selectedTeams.length,
      pending: Math.max(teams.length - selectedTeams.length, 0),
      members: selectedTeams.reduce(
        (count, team) => count + getMemberCount(team),
        0,
      ),
    };
  }, [selectedTeams, teams]);

  const dashboardPath =
    String(user?.role || "").toLowerCase() === "admin"
      ? "/dashboard/admin"
      : "/events/dashboard";

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(createEmptyForm());
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || "",
      description: item.description || item.statement || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingItem(null);
    setForm(createEmptyForm());
  };

  const updateFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedEventId) {
      setMessage({ text: "Choose an event first.", type: "error" });
      return;
    }

    if (!String(form.title || "").trim()) {
      setMessage({ text: "Title is required.", type: "error" });
      return;
    }

    if (!String(form.description || "").trim()) {
      setMessage({ text: "Description is required.", type: "error" });
      return;
    }

    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      const payload = {
        eventId: selectedEventId,
        title: form.title,
        description: form.description,
      };

      if (editingItem?._id) {
        await updateProblemStatement(editingItem._id, payload);
        setMessage({ text: "Problem statement updated.", type: "success" });
      } else {
        await createProblemStatement(payload);
        setMessage({ text: "Problem statement created.", type: "success" });
      }

      setModalOpen(false);
      setEditingItem(null);
      setForm(createEmptyForm());
      await loadStatements(selectedEventId);
    } catch (err) {
      setMessage({
        text: err?.message || "We could not save the problem statement.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete \"${item.title}\"?`)) {
      return;
    }

    setMessage({ text: "", type: "" });
    try {
      await deleteProblemStatement(item._id);
      setStatements((current) =>
        current.filter((entry) => entry._id !== item._id),
      );
      setMessage({ text: "Problem statement deleted.", type: "success" });
    } catch (err) {
      setMessage({
        text: err?.message || "Failed to delete problem statement.",
        type: "error",
      });
    }
  };

  const handleToggleSingle = async (item) => {
    try {
      const response = await updateProblemStatement(item._id, {
        isActive: !item.isActive,
      });
      setStatements((current) =>
        current.map((entry) =>
          entry._id === item._id
            ? response.item || { ...entry, isActive: !item.isActive }
            : entry,
        ),
      );
      setMessage({
        text: `${item.title} ${item.isActive ? "disabled" : "enabled"}.`,
        type: "success",
      });
    } catch (err) {
      setMessage({
        text: err?.message || "Failed to update problem statement status.",
        type: "error",
      });
    }
  };

  const handleToggleAll = async () => {
    if (!selectedEventId) return;

    const nextStatus = stats.active === 0;
    setBulkLoading(true);
    setMessage({ text: "", type: "" });
    try {
      await toggleAllProblemStatements(selectedEventId, nextStatus);
      await loadStatements(selectedEventId);
      setMessage({
        text: nextStatus
          ? "All problem statements are active now."
          : "All problem statements have been turned off.",
        type: "success",
      });
    } catch (err) {
      setMessage({
        text: err?.message || "Failed to update all problem statements.",
        type: "error",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleGiveAnotherChance = async (team) => {
    const teamId = String(team?._id || "");
    if (!teamId || !team?.selectedProblemStatement?._id) return;

    if (
      !window.confirm(
        `Give another chance to ${team.name || "this team"}? Their selected problem statement will be cleared.`,
      )
    ) {
      return;
    }

    setResettingTeamId(teamId);
    setMessage({ text: "", type: "" });
    try {
      await resetTeamProblemStatementSelection(teamId);
      if (String(selectedTeamDetail?._id || "") === teamId) {
        setSelectedTeamDetail(null);
      }
      await loadTeams(selectedEventId);
      setMessage({
        text: `${team.name || "Team"} can select a problem statement again.`,
        type: "success",
      });
    } catch (err) {
      setMessage({
        text: err?.message || "Failed to give another chance for this team.",
        type: "error",
      });
    } finally {
      setResettingTeamId("");
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
            <p className="text-sm text-neutral-400">
              Loading problem statement workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-800 bg-neutral-900/80 p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <button
            onClick={() => navigate(dashboardPath)}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:text-white"
          >
            <IconArrowLeft size={16} /> Back to dashboard
          </button>
          <div className="mt-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300/80">
              Problem statements
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-white">
              No managed events are available yet
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-400">
              This workspace is event-scoped. Once you manage or create an
              event, you can prepare coding prompts, update them, and disable
              them in one place.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[28px] border border-neutral-800 bg-neutral-900/70 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="border-b border-neutral-800 bg-linear-to-r from-cyan-500/12 via-transparent to-transparent px-6 py-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <button
                  onClick={() => navigate(dashboardPath)}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                >
                  <IconArrowLeft size={16} /> Back to dashboard
                </button>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300/80">
                  Event coding workspace
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Problem statements with proper event ownership
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
                  Create, edit, delete, and control every coding prompt linked
                  to a specific event. You can also disable or enable the full
                  set in one action.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex min-w-[240px] flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-300">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                    Select event
                  </span>
                  <select
                    value={selectedEventId}
                    onChange={(event) => setSelectedEventId(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    {events.map((event) => {
                      const value = String(event._id || event.id || "");
                      return (
                        <option
                          key={value}
                          value={value}
                          className="bg-neutral-900"
                        >
                          {event.title}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <button
                  onClick={() => {
                    if (viewMode === "teams") {
                      loadTeams(selectedEventId);
                      return;
                    }

                    loadStatements(selectedEventId);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                >
                  <IconRefresh size={16} /> Refresh
                </button>
                <button
                  onClick={handleToggleAll}
                  disabled={
                    viewMode === "teams" ||
                    bulkLoading ||
                    !selectedEventId ||
                    !statements.length
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {stats.active === 0 ? (
                    <IconEye size={16} />
                  ) : (
                    <IconEyeOff size={16} />
                  )}
                  {bulkLoading
                    ? "Updating..."
                    : stats.active === 0
                      ? "Enable all"
                      : "Disable all"}
                </button>
                <button
                  onClick={openCreateModal}
                  disabled={viewMode === "teams"}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconPlus size={16} /> New problem
                </button>
                <button
                  onClick={() => {
                    setViewMode((current) =>
                      current === "teams" ? "problems" : "teams",
                    );
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition",
                    viewMode === "teams"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
                      : "border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white",
                  )}
                >
                  <IconFileDescription size={16} />
                  {viewMode === "teams" ? "Problems" : "Teams"}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 lg:px-8">
            <div
              className={cn(
                "grid gap-2.5",
                viewMode === "teams"
                  ? "md:grid-cols-2 xl:grid-cols-5"
                  : "md:grid-cols-2 xl:grid-cols-4",
              )}
            >
              <SummaryCard
                title="Selected event"
                value={
                  selectedEvent
                    ? formatEventDate(selectedEvent.date)
                    : "No event"
                }
                subtitle={selectedEvent?.title || "Choose an event to begin"}
                tone="blue"
              />
              <SummaryCard
                title={viewMode === "teams" ? "All teams" : "Total problems"}
                value={viewMode === "teams" ? teamStats.total : stats.total}
                subtitle={
                  viewMode === "teams"
                    ? "Teams registered in the selected event"
                    : "All statements in the selected event"
                }
                tone="emerald"
              />
              <SummaryCard
                title={viewMode === "teams" ? "With selection" : "Active now"}
                value={viewMode === "teams" ? teamStats.selected : stats.active}
                subtitle={
                  viewMode === "teams"
                    ? "Teams that already picked a problem"
                    : "Visible and ready to use"
                }
                tone="amber"
              />
              <SummaryCard
                title={viewMode === "teams" ? "Pending teams" : "Inactive"}
                value={
                  viewMode === "teams" ? teamStats.pending : stats.inactive
                }
                subtitle={
                  viewMode === "teams"
                    ? "Teams that have not selected yet"
                    : "Currently turned off"
                }
                tone="rose"
              />
              {viewMode === "teams" && (
                <SummaryCard
                  title="Members covered"
                  value={teamStats.members}
                  subtitle="Students inside teams that already have a selected problem statement"
                  tone="blue"
                />
              )}
            </div>

            <div className="mt-6">
              <section className="rounded-3xl border border-neutral-800 bg-neutral-950/50 p-5 sm:p-6 xl:flex xl:min-h-[30rem] xl:max-h-[calc(100vh-12rem)] xl:flex-col">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
                        <IconFileDescription size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          {viewMode === "teams"
                            ? "Team selections"
                            : "Problem statement library"}
                        </h2>
                        <p className="text-sm text-neutral-400">
                          {viewMode === "teams"
                            ? "See only teams that already selected a problem statement for this event."
                            : "Review the active set, search quickly, and manage visibility."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="relative block min-w-[220px]">
                      <IconSearch
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={
                          viewMode === "teams"
                            ? "Search team or selected problem"
                            : "Search title or description"
                        }
                        className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-500/60"
                      />
                    </label>
                    {viewMode === "problems" && (
                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value)
                        }
                        className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
                      >
                        <option value="all">All statuses</option>
                        <option value="active">Active only</option>
                        <option value="inactive">Inactive only</option>
                      </select>
                    )}
                  </div>
                </div>

                {message.text && (
                  <div
                    className={cn(
                      "mt-5 rounded-2xl border px-4 py-3 text-sm",
                      message.type === "error"
                        ? "border-red-900/40 bg-red-950/30 text-red-200"
                        : "border-emerald-900/40 bg-emerald-950/30 text-emerald-200",
                    )}
                  >
                    {message.text}
                  </div>
                )}

                <div className="mt-6 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 scrollbar-hidden">
                  {viewMode === "problems" && statementsLoading ? (
                    <div className="flex justify-center py-16">
                      <div className="h-10 w-10 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
                    </div>
                  ) : viewMode === "teams" && teamsLoading ? (
                    <div className="flex justify-center py-16">
                      <div className="h-10 w-10 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
                    </div>
                  ) : viewMode === "problems" &&
                    filteredStatements.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/50 px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                        <IconFileDescription size={24} />
                      </div>
                      <h3 className="mt-5 text-xl font-semibold text-white">
                        {statements.length === 0
                          ? "No problem statements yet"
                          : "No items match this filter"}
                      </h3>
                      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-400">
                        {statements.length === 0
                          ? "Create the first challenge for this event. Each item is linked to the selected event and can be controlled independently or all at once."
                          : "Try adjusting the search text or the status filter to see the rest of the set."}
                      </p>
                      {statements.length === 0 && (
                        <button
                          onClick={openCreateModal}
                          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                        >
                          <IconPlus size={16} /> Create first problem
                        </button>
                      )}
                    </div>
                  ) : viewMode === "teams" && filteredTeams.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/50 px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                        <IconFileDescription size={24} />
                      </div>
                      <h3 className="mt-5 text-xl font-semibold text-white">
                        {teams.length === 0
                          ? "No teams are available for this event"
                          : "No teams match this search"}
                      </h3>
                      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-400">
                        {teams.length === 0
                          ? "Teams registered for the selected event will appear here with their current problem-selection status."
                          : "Try adjusting the search text to find the team or selected problem statement."}
                      </p>
                    </div>
                  ) : viewMode === "problems" ? (
                    <div className="grid gap-4">
                      {filteredStatements.map((item, index) => (
                        <article
                          key={item._id}
                          className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg shadow-black/10 transition hover:border-neutral-700"
                        >
                          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300">
                                  Problem {index + 1}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-xs font-medium",
                                    item.isActive
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                      : "border-neutral-700 bg-neutral-800 text-neutral-300",
                                  )}
                                >
                                  {item.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>

                              <h3 className="mt-4 text-xl font-semibold text-white">
                                {item.title}
                              </h3>
                              <p className="mt-3 max-w-2xl truncate text-sm text-neutral-400">
                                {getDescriptionPreview(
                                  item.description || item.statement,
                                )}
                              </p>
                            </div>

                            <div className="flex w-full flex-col gap-2 sm:w-auto xl:min-w-[220px]">
                              <button
                                onClick={() => openEditModal(item)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-800 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-700 hover:text-white"
                              >
                                <IconEdit size={16} /> Edit
                              </button>
                              <button
                                onClick={() => handleToggleSingle(item)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-800 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-700 hover:text-white"
                              >
                                {item.isActive ? (
                                  <IconEyeOff size={16} />
                                ) : (
                                  <IconEye size={16} />
                                )}
                                {item.isActive ? "Turn off" : "Turn on"}
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-900/30 bg-red-950/20 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-950/30"
                              >
                                <IconTrash size={16} /> Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="scrollbar-hidden grid max-h-[32rem] gap-4 overflow-y-auto pr-1 xl:max-h-none xl:min-h-0 xl:flex-1"
                      style={{
                        msOverflowStyle: "none",
                        scrollbarWidth: "none",
                      }}
                    >
                      {filteredTeams.map((team, index) => {
                        const selectedItem = team.selectedProblemStatement;
                        const members = [
                          team?.leader,
                          ...(Array.isArray(team?.members) ? team.members : []),
                        ].filter(Boolean);
                        const hasSelectedProblem = Boolean(selectedItem?._id);

                        return (
                          <article
                            key={team._id}
                            onClick={() => {
                              if (hasSelectedProblem) {
                                setSelectedTeamDetail(team);
                              }
                            }}
                            className={cn(
                              "group rounded-3xl border bg-neutral-900/80 p-5 shadow-lg shadow-black/10 transition",
                              hasSelectedProblem
                                ? "cursor-pointer border-neutral-800 hover:border-cyan-500/40 hover:bg-neutral-900"
                                : "border-neutral-800/80",
                            )}
                          >
                            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300">
                                    Team {index + 1}
                                  </span>
                                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                                    {getMemberCount(team)} members
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded-full border px-3 py-1 text-xs font-medium",
                                      hasSelectedProblem
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                        : "border-amber-500/30 bg-amber-500/10 text-amber-200",
                                    )}
                                  >
                                    {hasSelectedProblem
                                      ? "Selected"
                                      : "Not yet selected"}
                                  </span>
                                </div>

                                <h3 className="mt-4 text-xl font-semibold text-white">
                                  {team.name || "Unnamed team"}
                                </h3>
                                <p className="mt-2 text-sm text-neutral-400">
                                  {hasSelectedProblem
                                    ? `Selected problem: ${selectedItem?.title || "Unknown"}`
                                    : "Problem statement has not been selected yet."}
                                </p>

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                                      {hasSelectedProblem
                                        ? "Selected by"
                                        : "Selection status"}
                                    </p>
                                    {hasSelectedProblem ? (
                                      <>
                                        <p className="mt-2 text-sm font-semibold text-white">
                                          {team?.selectedProblemStatementBy
                                            ?.name || "Unknown"}
                                        </p>
                                        <p className="mt-1 text-xs text-neutral-500">
                                          {team?.selectedProblemStatementBy
                                            ?.regno || "Regno unavailable"}
                                        </p>
                                        <p className="mt-3 text-xs text-neutral-500">
                                          {team?.selectedProblemStatementAt
                                            ? `Locked on ${new Date(team.selectedProblemStatementAt).toLocaleString()}`
                                            : "Lock time unavailable"}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="mt-2 text-sm font-semibold text-white">
                                          Waiting for team choice
                                        </p>
                                        <p className="mt-3 text-xs text-neutral-500">
                                          Any student in this team can select
                                          one problem statement, and after that
                                          it will be locked.
                                        </p>
                                      </>
                                    )}
                                  </div>

                                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                                      Team members
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {members.map((member) => (
                                        <span
                                          key={`${team._id}_${member._id || member.regno}`}
                                          className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300"
                                        >
                                          {member?.name || "Member"}
                                          {member?.regno
                                            ? ` • ${member.regno}`
                                            : ""}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {hasSelectedProblem ? (
                                <div className="flex w-full items-start justify-end sm:w-auto xl:min-w-[220px]">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleGiveAnotherChance(team);
                                    }}
                                    disabled={
                                      resettingTeamId === String(team._id)
                                    }
                                    className={cn(
                                      "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition",
                                      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                                      resettingTeamId === String(team._id)
                                        ? "cursor-not-allowed opacity-60"
                                        : "hover:bg-amber-500/15",
                                    )}
                                  >
                                    {resettingTeamId === String(team._id)
                                      ? "Updating..."
                                      : "Give another chance"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <ProblemStatementModal
        open={modalOpen}
        form={form}
        saving={saving}
        editing={Boolean(editingItem)}
        onChange={updateFormField}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <TeamSelectionDetailModal
        team={selectedTeamDetail}
        onClose={() => setSelectedTeamDetail(null)}
      />
    </div>
  );
}
