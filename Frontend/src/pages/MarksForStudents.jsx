import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { checkLogin } from "../services/auth";
import {
  fetchEvents,
  fetchTeamMarks,
  fetchTeams,
  getRoles,
  saveTeamMark,
  updateEvent,
} from "../services/api";

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatUpdatedAt(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function cloneTeamMarksConfig(config) {
  return (Array.isArray(config) ? config : []).map((round) => ({
    roundName: String(round?.roundName || ""),
    categories: (Array.isArray(round?.categories) ? round.categories : []).map(
      (category) => ({
        name: String(category?.name || ""),
        maxScore: String(category?.maxScore ?? 10),
      }),
    ),
  }));
}

function normalizeTeamMarksConfig(config) {
  if (!Array.isArray(config)) {
    return [];
  }

  const seenRounds = new Set();
  const normalized = [];

  for (const round of config) {
    const roundName = String(round?.roundName || "").trim();
    const roundKey = normalizeKey(roundName);
    if (!roundName || seenRounds.has(roundKey)) {
      continue;
    }

    seenRounds.add(roundKey);

    const seenCategories = new Set();
    const categories = Array.isArray(round?.categories)
      ? round.categories
          .map((category) => {
            const name = String(category?.name || "").trim();
            const categoryKey = normalizeKey(name);
            if (!name || seenCategories.has(categoryKey)) {
              return null;
            }

            seenCategories.add(categoryKey);

            const parsedMaxScore = Number(category?.maxScore);
            return {
              name,
              maxScore:
                Number.isFinite(parsedMaxScore) && parsedMaxScore > 0
                  ? parsedMaxScore
                  : 10,
            };
          })
          .filter(Boolean)
      : [];

    normalized.push({ roundName, categories });
  }

  return normalized;
}

function buildConfigFromMarks(marks) {
  const map = new Map();

  for (const mark of Array.isArray(marks) ? marks : []) {
    const roundName = String(mark?.roundName || "").trim();
    const criteriaType = String(mark?.criteriaType || "").trim();
    if (!roundName || !criteriaType) continue;

    const roundKey = normalizeKey(roundName);
    if (!map.has(roundKey)) {
      map.set(roundKey, {
        roundName,
        categories: new Map(),
      });
    }

    const round = map.get(roundKey);
    const categoryKey = normalizeKey(criteriaType);
    if (!round.categories.has(categoryKey)) {
      round.categories.set(categoryKey, {
        name: criteriaType,
        maxScore: Number(mark?.maxScore) > 0 ? Number(mark.maxScore) : 10,
      });
    }
  }

  return Array.from(map.values())
    .map((round) => ({
      roundName: round.roundName,
      categories: Array.from(round.categories.values()),
    }))
    .sort((left, right) =>
      left.roundName.localeCompare(right.roundName, undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );
}

function mergeTeamMarksConfig(config, marks) {
  const merged = normalizeTeamMarksConfig(config);
  const roundMap = new Map(
    merged.map((round) => [
      normalizeKey(round.roundName),
      {
        roundName: round.roundName,
        categories: [...round.categories],
      },
    ]),
  );

  for (const round of buildConfigFromMarks(marks)) {
    const roundKey = normalizeKey(round.roundName);
    if (!roundMap.has(roundKey)) {
      roundMap.set(roundKey, {
        roundName: round.roundName,
        categories: [...round.categories],
      });
      continue;
    }

    const existingRound = roundMap.get(roundKey);
    const categoryMap = new Map(
      existingRound.categories.map((category) => [
        normalizeKey(category.name),
        category,
      ]),
    );

    for (const category of round.categories) {
      const categoryKey = normalizeKey(category.name);
      if (!categoryMap.has(categoryKey)) {
        existingRound.categories.push(category);
      }
    }
  }

  return Array.from(roundMap.values()).sort((left, right) =>
    left.roundName.localeCompare(right.roundName, undefined, {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

function findRoundConfig(config, roundName) {
  const key = normalizeKey(roundName);
  return (Array.isArray(config) ? config : []).find(
    (round) => normalizeKey(round.roundName) === key,
  );
}

function findCategoryConfig(round, categoryName) {
  const key = normalizeKey(categoryName);
  return (Array.isArray(round?.categories) ? round.categories : []).find(
    (category) => normalizeKey(category.name) === key,
  );
}

function createEmptyConfigDraft() {
  return [
    {
      roundName: "",
      categories: [{ name: "", maxScore: "10" }],
    },
  ];
}

function createCategoryDraftEntries(roundConfig, teamMarks = []) {
  if (!roundConfig) {
    return [];
  }

  const marksByCategory = new Map(
    (Array.isArray(teamMarks) ? teamMarks : [])
      .filter(
        (mark) =>
          normalizeKey(mark?.roundName) === normalizeKey(roundConfig.roundName),
      )
      .map((mark) => [normalizeKey(mark?.criteriaType), mark]),
  );

  return (
    Array.isArray(roundConfig.categories) ? roundConfig.categories : []
  ).map((category) => {
    const existingMark = marksByCategory.get(normalizeKey(category.name));
    return {
      id: String(existingMark?._id || ""),
      name: String(category?.name || ""),
      maxScore: String(category?.maxScore ?? existingMark?.maxScore ?? 10),
      score: String(existingMark?.score ?? ""),
    };
  });
}

function createEmptyDraft(
  config = [],
  teamMarks = [],
  preferredRoundName = "",
) {
  const firstRound =
    Array.isArray(config) && config.length > 0 ? config[0] : null;
  const selectedRoundConfig =
    findRoundConfig(config, preferredRoundName) || firstRound || null;

  return {
    selectedRound: selectedRoundConfig?.roundName || "",
    categoryEntries: createCategoryDraftEntries(selectedRoundConfig, teamMarks),
    notes: String(
      (Array.isArray(teamMarks) ? teamMarks : []).find(
        (mark) =>
          normalizeKey(mark?.roundName) ===
            normalizeKey(selectedRoundConfig?.roundName) &&
          String(mark?.notes || "").trim(),
      )?.notes || "",
    ),
  };
}

function TeamCard({ teamId, teamName, stats, active, onSelect }) {
  const totalScore = Number(stats?.totalScore || 0);
  const totalMaxScore = Number(stats?.totalMaxScore || 0);
  const totalEntries = Number(stats?.totalEntries || 0);
  const roundsCount = Number(stats?.roundsCount || 0);
  const initial = (String(teamName || "T").trim()[0] || "T").toUpperCase();

  return (
    <button
      onClick={onSelect}
      className={
        "w-full text-left rounded-lg border p-3 transition-all duration-200 " +
        (active
          ? "border-blue-500/40 bg-blue-500/10"
          : "border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900/50 hover:border-neutral-700")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-linear-to-br from-blue-500/30 to-cyan-400/20 border border-neutral-800 flex items-center justify-center text-neutral-100 text-xs font-bold">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate sm:text-sm">
              {teamName}
            </p>
            <p className="text-[11px] text-neutral-500 sm:text-xs">
              {totalEntries} marks across {roundsCount} rounds
            </p>
          </div>
        </div>
        <span className="text-[11px] text-neutral-600 sm:text-xs">
          #{String(teamId).slice(-4)}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-neutral-400 sm:text-xs">
        <span>Total score</span>
        <span className="font-semibold text-cyan-200">
          {totalScore} / {totalMaxScore}
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
    <aside className="hidden md:flex w-56 shrink-0 self-start border-r border-neutral-800 bg-neutral-950/60">
      <div className="w-full p-2.5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:text-xs">
          Teams
        </p>

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search team name"
          aria-label="Search team name"
          className="mb-4 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-blue-500/60 sm:text-sm"
        />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 animate-pulse"
              >
                <div className="h-4 w-32 bg-neutral-800 rounded" />
                <div className="mt-2 h-3 w-24 bg-neutral-800 rounded" />
                <div className="mt-3 h-3 w-28 bg-neutral-800 rounded" />
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
            {teams.map((team) => (
              <TeamCard
                key={team.teamId}
                teamId={team.teamId}
                teamName={team.teamName}
                stats={statsById.get(team.teamId)}
                active={team.teamId === selectedTeamId}
                onSelect={() => onSelect(team.teamId)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function RoundConfigModal({
  open,
  configDraft,
  saving,
  onClose,
  onConfigChange,
  onSave,
}) {
  if (!open) {
    return null;
  }

  const updateRound = (roundIndex, patch) => {
    onConfigChange((current) =>
      current.map((round, index) =>
        index === roundIndex ? { ...round, ...patch } : round,
      ),
    );
  };

  const removeRound = (roundIndex) => {
    onConfigChange((current) =>
      current.filter((_, index) => index !== roundIndex),
    );
  };

  const addRound = () => {
    onConfigChange((current) => [
      ...current,
      { roundName: "", categories: [{ name: "", maxScore: "10" }] },
    ]);
  };

  const updateCategory = (roundIndex, categoryIndex, patch) => {
    onConfigChange((current) =>
      current.map((round, index) => {
        if (index !== roundIndex) return round;

        return {
          ...round,
          categories: round.categories.map((category, innerIndex) =>
            innerIndex === categoryIndex ? { ...category, ...patch } : category,
          ),
        };
      }),
    );
  };

  const addCategory = (roundIndex) => {
    onConfigChange((current) =>
      current.map((round, index) =>
        index === roundIndex
          ? {
              ...round,
              categories: [...round.categories, { name: "", maxScore: "10" }],
            }
          : round,
      ),
    );
  };

  const removeCategory = (roundIndex, categoryIndex) => {
    onConfigChange((current) =>
      current.map((round, index) => {
        if (index !== roundIndex) return round;

        return {
          ...round,
          categories: round.categories.filter(
            (_, innerIndex) => innerIndex !== categoryIndex,
          ),
        };
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-800 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Create or Edit Rounds and Categories
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Add each round once and place multiple categories under it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 transition hover:border-neutral-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="scrollbar-hidden max-h-[80vh] overflow-y-auto px-6 py-6 space-y-5">
          {(Array.isArray(configDraft) ? configDraft : []).map(
            (round, roundIndex) => (
              <div
                key={`round-${roundIndex}`}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5"
              >
                <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
                  <div className="w-full sm:max-w-sm">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Round name
                    </label>
                    <input
                      type="text"
                      value={round.roundName}
                      onChange={(event) =>
                        updateRound(roundIndex, {
                          roundName: event.target.value,
                        })
                      }
                      placeholder="Round 1"
                      className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-blue-500/60"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRound(roundIndex)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                  >
                    Remove round
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {(Array.isArray(round.categories)
                    ? round.categories
                    : []
                  ).map((category, categoryIndex) => (
                    <div
                      key={`category-${roundIndex}-${categoryIndex}`}
                      className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 md:grid-cols-[minmax(0,1fr)_160px_auto]"
                    >
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Category name
                        </label>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(event) =>
                            updateCategory(roundIndex, categoryIndex, {
                              name: event.target.value,
                            })
                          }
                          placeholder="Behaviour"
                          className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-blue-500/60"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Max score
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={category.maxScore}
                          onChange={(event) =>
                            updateCategory(roundIndex, categoryIndex, {
                              maxScore: event.target.value,
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500/60"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            removeCategory(roundIndex, categoryIndex)
                          }
                          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addCategory(roundIndex)}
                  className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                >
                  Add category
                </button>
              </div>
            ),
          )}

          <button
            type="button"
            onClick={addRound}
            className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/30 px-5 py-4 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900/50"
          >
            Add round
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-800 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={
              "rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors " +
              (saving
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : "bg-cyan-400 text-neutral-950 hover:bg-cyan-300")
            }
          >
            {saving ? "Saving..." : "Save rounds and categories"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkEditor({
  draft,
  hasConfig,
  saving,
  onCategoryDraftChange,
  onNotesChange,
  onSave,
  onCancel,
  onOpenConfig,
}) {
  const editing = Array.isArray(draft.categoryEntries)
    ? draft.categoryEntries.some((entry) => Boolean(entry.id))
    : false;

  if (!hasConfig) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/30 p-6 text-center">
        <h3 className="text-lg font-semibold text-white">
          Create rounds and categories first
        </h3>
        <p className="mt-2 text-sm text-neutral-400">
          Use the button below to define rounds and add multiple categories
          under each round.
        </p>
        <button
          type="button"
          onClick={onOpenConfig}
          className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300"
        >
          Create rounds and categories
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h3 className="text-base font-semibold text-white sm:text-lg">
            {editing ? "Edit team mark" : "Add team mark"}
          </h3>
          <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
            Score this team by round and category, then save it for later
            review.
          </p>
        </div>

        {editing && (
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-900 sm:text-sm"
          >
            Cancel edit
          </button>
        )}
      </div>

      {draft.categoryEntries.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-5 text-sm text-neutral-400">
          No categories available for this round.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {draft.categoryEntries.map((entry, index) => (
            <div
              key={`${draft.selectedRound}-${entry.name || index}`}
              className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-xs font-semibold text-white sm:text-sm">
                    {entry.name}
                  </h4>
                  <p className="mt-1 text-[11px] text-neutral-500 sm:text-xs">
                    Max score {entry.maxScore}
                  </p>
                </div>
                {entry.id ? (
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-100 sm:text-[11px]">
                    Saved
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:text-xs">
                    Score
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={entry.score}
                    onChange={(event) =>
                      onCategoryDraftChange(entry.name, {
                        score: event.target.value,
                      })
                    }
                    placeholder="8"
                    className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none transition focus:border-blue-500/60 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:text-xs">
          Note
        </label>
        <textarea
          value={draft.notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Optional note about this team's performance, e.g. strengths, weaknesses, or anything worth mentioning."
          className="mt-2 h-24 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none transition focus:border-blue-500/60 sm:text-sm"
        />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className={
            "rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors sm:text-sm " +
            (saving
              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              : "bg-cyan-400 text-neutral-950 hover:bg-cyan-300")
          }
        >
          {saving ? "Saving..." : editing ? "Update mark" : "Save mark"}
        </button>
      </div>
    </div>
  );
}

function DashboardStatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-white sm:text-2xl">{value}</p>
    </div>
  );
}

function RoundTabs({ roundOptions, selectedRound, onRoundChange }) {
  if (!Array.isArray(roundOptions) || roundOptions.length === 0) {
    return null;
  }

  return (
    <div className="scrollbar-hidden overflow-x-auto">
      <div className="inline-flex min-w-full gap-3">
        {roundOptions.map((roundName) => {
          const active =
            normalizeKey(selectedRound) === normalizeKey(roundName);
          return (
            <button
              key={roundName}
              type="button"
              onClick={() => onRoundChange(roundName)}
              className={
                "rounded-lg border px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition-all sm:text-xs " +
                (active
                  ? "border-cyan-400/50 bg-cyan-400 text-neutral-950 shadow-lg shadow-cyan-500/10"
                  : "border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/70")
              }
            >
              {roundName}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ViewModeSwitch({ viewMode, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-950 p-1">
      {[
        { value: "grading", label: "Grading" },
        { value: "results", label: "Results" },
      ].map((item) => {
        const active = viewMode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={
              "rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs " +
              (active
                ? "bg-cyan-400 text-neutral-950"
                : "text-neutral-300 hover:bg-neutral-900")
            }
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function ResultsPanel({
  loading,
  rows,
  totalCount,
  roundOptions,
  selectedEventTitle,
  searchTerm,
  onSearchChange,
  topLimitValue,
  customTopLimit,
  onTopLimitValueChange,
  onCustomTopLimitChange,
  orderValue,
  onOrderValueChange,
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-3 sm:p-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 animate-pulse">
          <div className="h-4 w-40 rounded bg-neutral-800" />
          <div className="mt-3 h-24 rounded bg-neutral-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
        <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <h2 className="text-sm font-semibold text-white sm:text-base">
              Results
            </h2>
            <p className="mt-1 text-[11px] text-neutral-500 sm:text-xs">
              Round total scores for {selectedEventTitle || "this event"}.
            </p>
          </div>
          <div className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[11px] text-neutral-300 sm:text-xs">
            {searchTerm || Number(topLimitValue) > 0
              ? `${rows.length} of ${totalCount} teams`
              : `${rows.length} teams`}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search team name"
            aria-label="Search results team name"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-blue-500/60 sm:max-w-xs sm:text-sm"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:text-xs">
                Order
              </label>
              <select
                value={orderValue}
                onChange={(event) => onOrderValueChange(event.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60 sm:text-sm"
              >
                <option value="score-desc">Highest score</option>
                <option value="score-asc">Lowest score</option>
                <option value="name-asc">Team A-Z</option>
                <option value="name-desc">Team Z-A</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:text-xs">
                Top teams
              </label>
              <select
                value={topLimitValue}
                onChange={(event) => onTopLimitValueChange(event.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60 sm:text-sm"
              >
                <option value="">All</option>
                <option value="1">Top 1</option>
                <option value="3">Top 3</option>
                <option value="5">Top 5</option>
                <option value="10">Top 10</option>
                <option value="custom">Custom</option>
              </select>

              {topLimitValue === "custom" ? (
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customTopLimit}
                  onChange={(event) =>
                    onCustomTopLimitChange(event.target.value)
                  }
                  placeholder="Enter number"
                  aria-label="Custom top results count"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-blue-500/60 sm:w-32 sm:text-sm"
                />
              ) : null}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/50 p-6 text-center text-xs text-neutral-400">
            {String(searchTerm || "").trim() || Number(topLimitValue) > 0
              ? "No teams match your search."
              : "No results saved yet."}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-[11px] sm:text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500">
                  <th className="px-3 py-2 font-semibold">Team</th>
                  {roundOptions.map((roundName) => (
                    <th key={roundName} className="px-3 py-2 font-semibold">
                      {roundName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.teamId}
                    className="border-b border-neutral-900 text-neutral-200 last:border-b-0"
                  >
                    <td className="px-3 py-2.5 font-medium text-white">
                      {row.teamName}
                    </td>
                    {roundOptions.map((roundName) => {
                      const roundValue =
                        row.roundTotals[normalizeKey(roundName)];
                      return (
                        <td
                          key={`${row.teamId}-${roundName}`}
                          className={
                            "px-3 py-2.5 " +
                            (roundValue === "-"
                              ? "text-neutral-500"
                              : "font-medium text-cyan-200")
                          }
                        >
                          {roundValue || "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamDetailsPanel({
  loading,
  selectedTeam,
  selectedEventTitle,
  teamOptions,
  selectedTeamId,
  onSelectTeam,
  onSelectNextTeam,
  searchTerm,
  summary,
  selectedRound,
  currentRoundScore,
  currentRoundMaxScore,
  draft,
  hasConfig,
  saving,
  onCategoryDraftChange,
  onNotesChange,
  onSave,
  onCancelEdit,
  onOpenConfig,
}) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 animate-pulse">
          <div className="h-5 w-40 bg-neutral-800 rounded" />
          <div className="mt-3 h-3 w-64 bg-neutral-800 rounded" />
          <div className="mt-6 h-56 rounded-2xl bg-neutral-900" />
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

  if (!selectedTeamId || !selectedTeam || !summary) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-10 text-center text-sm text-neutral-400">
          Select a team to start scoring rounds.
        </div>
      </div>
    );
  }

  const avatar = (
    String(selectedTeam.teamName || "T").trim()[0] || "T"
  ).toUpperCase();

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-3 sm:p-4 md:p-4.5">
        <div className="flex items-start justify-between gap-3 flex-col md:flex-row">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-linear-to-br from-blue-500/30 to-cyan-400/20 text-base font-bold text-white sm:h-11 sm:w-11">
                {avatar}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-bold text-white sm:text-2xl">
                    {selectedTeam.teamName}
                  </h2>
                  {selectedRound ? (
                    <span className="rounded-full border border-neutral-700 bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-300">
                      {selectedRound}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-neutral-400 sm:text-xs">
                  {selectedEventTitle || "Selected event"} •{" "}
                  {summary.totalEntries} saved marks across{" "}
                  {summary.roundsCount} rounds
                </p>
              </div>
            </div>

            <div className="mt-3 h-px w-full bg-neutral-800" />

            <div className="mt-4 md:hidden">
              <label className="text-[11px] uppercase tracking-wider text-neutral-400 sm:text-xs">
                Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(event) => onSelectTeam(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs sm:text-sm"
              >
                {teamOptions.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName} ({team.totalEntries} marks)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full md:w-auto md:self-start">
            <button
              type="button"
              onClick={onSelectNextTeam}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-neutral-900 sm:text-xs"
            >
              Next Team
            </button>
          </div>
        </div>
      </div>

      <MarkEditor
        draft={draft}
        hasConfig={hasConfig}
        saving={saving}
        onCategoryDraftChange={onCategoryDraftChange}
        onNotesChange={onNotesChange}
        onSave={onSave}
        onCancel={onCancelEdit}
        onOpenConfig={onOpenConfig}
      />

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 px-3 py-2.5 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 sm:text-[11px]">
            Current Score
          </p>
          <p className="mt-1 text-xl font-bold text-cyan-200 sm:text-2xl">
            {currentRoundScore}
            <span className="ml-1.5 text-xs font-medium text-neutral-500 sm:text-sm">
              / {currentRoundMaxScore}
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 px-3 py-2.5 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 sm:text-[11px]">
            Overall Score
          </p>
          <p className="mt-1 text-lg font-bold text-white sm:text-xl">
            {summary.totalScore}
            <span className="ml-1.5 text-xs font-medium text-neutral-500 sm:text-sm">
              / {summary.totalMaxScore}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function TopBar({
  events,
  selectedEventId,
  selectedEventTitle,
  onChangeEvent,
  hasConfig,
  onOpenConfig,
  onRefresh,
  loading,
  error,
  stats,
  viewMode,
  onViewModeChange,
  roundOptions,
  selectedRound,
  onRoundChange,
}) {
  return (
    <header className="shrink-0 border-b border-neutral-800 bg-neutral-950/70 backdrop-blur">
      <div className="max-w-350 mx-auto space-y-3 px-3 sm:px-4 py-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-start justify-between gap-4 flex-col xl:flex-row xl:items-center">
            <div>
              <h1 className="bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-xl font-bold text-transparent sm:text-3xl">
                Team Scores
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 sm:text-xs">
                <span>
                  Scoring panel for {selectedEventTitle || "selected event"}
                </span>
                <span className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-0.5 text-neutral-200">
                  Total marks: {stats.totalMarks}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
              <ViewModeSwitch viewMode={viewMode} onChange={onViewModeChange} />
              <select
                value={selectedEventId}
                onChange={(event) => onChangeEvent(event.target.value)}
                className="min-w-40 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] text-white sm:text-xs xl:flex-none"
              >
                {events.map((event) => (
                  <option
                    key={event._id || event.id}
                    value={event._id || event.id}
                  >
                    {event.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className={
                  "rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors sm:text-xs " +
                  (loading
                    ? "bg-neutral-900/30 border-neutral-800 text-neutral-500 cursor-not-allowed"
                    : "bg-neutral-900/40 hover:bg-neutral-900/60 border-neutral-800 text-white")
                }
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={onOpenConfig}
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[11px] font-semibold text-blue-200 transition hover:bg-blue-500/20 sm:text-xs"
              >
                {hasConfig
                  ? "Edit rounds & categories"
                  : "Create rounds & categories"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <DashboardStatCard label="Total Teams" value={stats.totalTeams} />
          <DashboardStatCard label="Graded" value={stats.gradedTeams} />
          <DashboardStatCard label="Pending" value={stats.pendingTeams} />
          <DashboardStatCard label="Avg Score" value={stats.averageScore} />
        </div>

        {viewMode === "grading" && roundOptions.length > 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-2">
            <RoundTabs
              roundOptions={roundOptions}
              selectedRound={selectedRound}
              onRoundChange={onRoundChange}
            />
          </div>
        ) : null}

        {error && (
          <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </header>
  );
}

function MarksLayout({ topBar, sidebar, children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {topBar}
      <div className="w-full max-w-350 mx-auto flex items-start">
        {sidebar}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function MarksForStudentsSection({ events }) {
  const [eventItems, setEventItems] = useState(() =>
    Array.isArray(events) ? events : [],
  );
  const [selectedEventId, setSelectedEventId] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [resultsSearchTerm, setResultsSearchTerm] = useState("");
  const [resultsOrder, setResultsOrder] = useState("score-desc");
  const [resultsTopLimit, setResultsTopLimit] = useState("");
  const [resultsCustomTopLimit, setResultsCustomTopLimit] = useState("");
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("grading");
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState(() =>
    createEmptyConfigDraft(),
  );

  useEffect(() => {
    setEventItems(Array.isArray(events) ? events : []);
  }, [events]);

  useEffect(() => {
    if (
      !selectedEventId &&
      Array.isArray(eventItems) &&
      eventItems.length > 0
    ) {
      setSelectedEventId(String(eventItems[0]._id || eventItems[0].id || ""));
    }
  }, [eventItems, selectedEventId]);

  const selectedEvent = useMemo(
    () =>
      (Array.isArray(eventItems) ? eventItems : []).find(
        (event) =>
          String(event._id || event.id || "") === String(selectedEventId),
      ) || null,
    [eventItems, selectedEventId],
  );

  const orderedTeams = useMemo(() => {
    return (Array.isArray(teams) ? teams : [])
      .map((team) => ({
        teamId: String(team?._id || team?.id || ""),
        teamName: team?.name || "Team",
      }))
      .filter((team) => Boolean(team.teamId))
      .sort((left, right) =>
        left.teamName.localeCompare(right.teamName, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      );
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const query = String(teamSearchTerm || "")
      .trim()
      .toLowerCase();
    if (!query) return orderedTeams;

    return orderedTeams.filter((team) =>
      String(team.teamName || "")
        .toLowerCase()
        .includes(query),
    );
  }, [orderedTeams, teamSearchTerm]);

  const statsById = useMemo(() => {
    const configuredTotalMaxScore = normalizeTeamMarksConfig(
      selectedEvent?.teamMarksConfig,
    ).reduce(
      (roundTotal, round) =>
        roundTotal +
        (Array.isArray(round.categories) ? round.categories : []).reduce(
          (categoryTotal, category) =>
            categoryTotal + Number(category?.maxScore || 0),
          0,
        ),
      0,
    );

    const map = new Map();

    const ensure = (teamId, teamName) => {
      if (!map.has(teamId)) {
        map.set(teamId, {
          teamId,
          teamName: teamName || "Team",
          totalEntries: 0,
          totalScore: 0,
          totalMaxScore: configuredTotalMaxScore,
          roundsMap: new Map(),
        });
      }
      return map.get(teamId);
    };

    for (const mark of Array.isArray(marks) ? marks : []) {
      const teamId = String(mark?.team?._id || mark?.team || "");
      if (!teamId) continue;

      const summary = ensure(teamId, mark?.team?.name || "Team");
      summary.totalEntries += 1;
      summary.totalScore += Number(mark?.score || 0);
      if (!configuredTotalMaxScore) {
        summary.totalMaxScore += Number(mark?.maxScore || 0);
      }

      const roundName = String(mark?.roundName || "Round").trim() || "Round";
      if (!summary.roundsMap.has(roundName)) {
        summary.roundsMap.set(roundName, []);
      }
      summary.roundsMap.get(roundName).push(mark);
    }

    for (const team of orderedTeams) {
      ensure(team.teamId, team.teamName);
    }

    for (const summary of map.values()) {
      summary.roundsCount = summary.roundsMap.size;
    }

    return map;
  }, [marks, orderedTeams, selectedEvent]);

  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return filteredTeams.find((team) => team.teamId === selectedTeamId) || null;
  }, [filteredTeams, selectedTeamId]);

  const selectedSummary = useMemo(() => {
    if (!selectedTeamId) return null;
    return statsById.get(selectedTeamId) || null;
  }, [statsById, selectedTeamId]);

  const selectedTeamMarks = useMemo(() => {
    if (!selectedTeamId) return [];
    return (Array.isArray(marks) ? marks : []).filter(
      (mark) => String(mark?.team?._id || mark?.team || "") === selectedTeamId,
    );
  }, [marks, selectedTeamId]);

  const teamMarksConfig = useMemo(() => {
    const savedConfig = normalizeTeamMarksConfig(
      selectedEvent?.teamMarksConfig,
    );
    if (savedConfig.length > 0) {
      return savedConfig;
    }

    return buildConfigFromMarks(marks);
  }, [selectedEvent, marks]);

  const roundOptions = useMemo(
    () => teamMarksConfig.map((round) => round.roundName),
    [teamMarksConfig],
  );

  const dashboardStats = useMemo(() => {
    const summaries = Array.from(statsById.values());
    const totalTeams = orderedTeams.length;
    const gradedTeams = summaries.filter(
      (summary) => Number(summary?.totalEntries || 0) > 0,
    ).length;
    const pendingTeams = Math.max(totalTeams - gradedTeams, 0);
    const totalScore = summaries.reduce(
      (sum, summary) => sum + Number(summary?.totalScore || 0),
      0,
    );
    const averageScore = gradedTeams
      ? (totalScore / gradedTeams).toFixed(1)
      : "0.0";

    return {
      totalTeams,
      gradedTeams,
      pendingTeams,
      averageScore,
      totalMarks: Array.isArray(marks) ? marks.length : 0,
    };
  }, [statsById, orderedTeams, marks]);

  const resultsRows = useMemo(() => {
    const roundMaxScores = new Map(
      teamMarksConfig.map((round) => [
        normalizeKey(round.roundName),
        (Array.isArray(round.categories) ? round.categories : []).reduce(
          (sum, category) => sum + Number(category?.maxScore || 0),
          0,
        ),
      ]),
    );

    return orderedTeams.map((team) => {
      const summary = statsById.get(team.teamId);
      const roundTotals = {};

      roundOptions.forEach((roundName) => {
        const configuredMaxScore = Number(
          roundMaxScores.get(normalizeKey(roundName)) || 0,
        );
        const roundMarks = summary?.roundsMap?.get(roundName) || [];
        const totalScore = roundMarks.reduce(
          (sum, mark) => sum + Number(mark?.score || 0),
          0,
        );
        const savedMaxScore = roundMarks.reduce(
          (sum, mark) => sum + Number(mark?.maxScore || 0),
          0,
        );
        const totalMaxScore =
          configuredMaxScore > 0 ? configuredMaxScore : savedMaxScore;

        roundTotals[normalizeKey(roundName)] =
          `${totalScore} / ${totalMaxScore}`;
      });

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        totalScore: Number(summary?.totalScore || 0),
        roundTotals,
      };
    });
  }, [orderedTeams, roundOptions, statsById, teamMarksConfig]);

  const filteredResultsRows = useMemo(() => {
    const query = String(resultsSearchTerm || "")
      .trim()
      .toLowerCase();

    const searchedRows = !query
      ? resultsRows
      : resultsRows.filter((row) =>
          String(row.teamName || "")
            .toLowerCase()
            .includes(query),
        );

    const sortedRows = [...searchedRows].sort((left, right) => {
      if (resultsOrder === "score-asc") {
        const scoreCompare = left.totalScore - right.totalScore;
        if (scoreCompare !== 0) {
          return scoreCompare;
        }
      } else if (resultsOrder === "name-asc") {
        const nameCompare = String(left.teamName || "").localeCompare(
          String(right.teamName || ""),
          undefined,
          {
            sensitivity: "base",
            numeric: true,
          },
        );
        if (nameCompare !== 0) {
          return nameCompare;
        }
      } else if (resultsOrder === "name-desc") {
        const nameCompare = String(right.teamName || "").localeCompare(
          String(left.teamName || ""),
          undefined,
          {
            sensitivity: "base",
            numeric: true,
          },
        );
        if (nameCompare !== 0) {
          return nameCompare;
        }
      } else {
        const scoreCompare = right.totalScore - left.totalScore;
        if (scoreCompare !== 0) {
          return scoreCompare;
        }
      }

      return String(left.teamName || "").localeCompare(
        String(right.teamName || ""),
        undefined,
        {
          sensitivity: "base",
          numeric: true,
        },
      );
    });

    const resolvedTopLimit =
      resultsTopLimit === "custom"
        ? Number(resultsCustomTopLimit)
        : Number(resultsTopLimit);

    if (!Number.isFinite(resolvedTopLimit) || resolvedTopLimit <= 0) {
      return sortedRows;
    }

    return sortedRows.slice(0, resolvedTopLimit);
  }, [
    resultsRows,
    resultsSearchTerm,
    resultsOrder,
    resultsTopLimit,
    resultsCustomTopLimit,
  ]);

  const [draft, setDraft] = useState(() =>
    createEmptyDraft(teamMarksConfig, selectedTeamMarks),
  );

  const currentRoundTotals = useMemo(() => {
    const entries = Array.isArray(draft.categoryEntries)
      ? draft.categoryEntries
      : [];
    const score = entries.reduce((sum, entry) => {
      const value = Number(entry?.score);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    const maxScore = entries.reduce((sum, entry) => {
      const value = Number(entry?.maxScore);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return {
      score,
      maxScore,
    };
  }, [draft.categoryEntries]);

  useEffect(() => {
    setDraft((current) => {
      const nextDraft = createEmptyDraft(
        teamMarksConfig,
        selectedTeamMarks,
        current.selectedRound,
      );

      return JSON.stringify(current) === JSON.stringify(nextDraft)
        ? current
        : nextDraft;
    });
  }, [teamMarksConfig, selectedTeamMarks]);

  const teamOptionsForMobile = useMemo(() => {
    return filteredTeams.map((team) => {
      const summary = statsById.get(team.teamId);
      return {
        ...team,
        totalEntries: Number(summary?.totalEntries || 0),
      };
    });
  }, [filteredTeams, statsById]);

  const resetDraft = (roundName = "") => {
    setDraft(createEmptyDraft(teamMarksConfig, selectedTeamMarks, roundName));
  };

  const openConfigModal = () => {
    setConfigDraft(
      cloneTeamMarksConfig(teamMarksConfig).length
        ? cloneTeamMarksConfig(teamMarksConfig)
        : createEmptyConfigDraft(),
    );
    setConfigModalOpen(true);
  };

  const handleConfigSave = async () => {
    const normalizedConfig = normalizeTeamMarksConfig(configDraft);

    if (!normalizedConfig.length) {
      setError("Add at least one round.");
      return;
    }

    const invalidRound = normalizedConfig.find(
      (round) =>
        !Array.isArray(round.categories) || round.categories.length === 0,
    );
    if (invalidRound) {
      setError("Each round needs at least one category.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateEvent(selectedEventId, {
        teamMarksConfig: normalizedConfig,
      });

      setEventItems((current) =>
        current.map((event) =>
          String(event._id || event.id || "") === String(selectedEventId)
            ? { ...event, teamMarksConfig: normalizedConfig }
            : event,
        ),
      );
      setConfigModalOpen(false);
      resetDraft();
    } catch (configError) {
      setError(configError?.message || "Failed to save rounds and categories");
    } finally {
      setSaving(false);
    }
  };

  const loadData = async ({ keepTeamSelection = true } = {}) => {
    if (!selectedEventId) return;

    setLoading(true);
    setError(null);

    const [teamsResult, marksResult] = await Promise.allSettled([
      fetchTeams(selectedEventId),
      fetchTeamMarks({ eventId: selectedEventId }),
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

    let nextMarks = [];
    if (marksResult.status === "fulfilled") {
      const body = marksResult.value;
      nextMarks = Array.isArray(body?.marks) ? body.marks : [];
    }

    if (
      teamsResult.status === "rejected" &&
      marksResult.status === "rejected"
    ) {
      setError(
        teamsResult.reason?.message ||
          marksResult.reason?.message ||
          "Failed to load team marks",
      );
    } else if (teamsResult.status === "rejected") {
      setError(teamsResult.reason?.message || "Failed to load teams");
    } else if (marksResult.status === "rejected") {
      setError(marksResult.reason?.message || "Failed to load team marks");
    }

    if (!nextTeams.length && nextMarks.length) {
      const derivedTeams = new Map();
      for (const mark of nextMarks) {
        const teamId = String(mark?.team?._id || mark?.team || "");
        if (!teamId || derivedTeams.has(teamId)) continue;
        derivedTeams.set(teamId, {
          _id: teamId,
          name: mark?.team?.name || "Team",
        });
      }
      nextTeams = Array.from(derivedTeams.values());
    }

    setTeams(nextTeams);
    setMarks(nextMarks);
    if (!keepTeamSelection) setSelectedTeamId("");
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedEventId) return;
    loadData({ keepTeamSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  useEffect(() => {
    setResultsSearchTerm("");
    setResultsOrder("score-desc");
    setResultsTopLimit("");
    setResultsCustomTopLimit("");
  }, [selectedEventId]);

  useEffect(() => {
    if (!filteredTeams.length) {
      setSelectedTeamId("");
      return;
    }

    setSelectedTeamId((current) => {
      if (current && filteredTeams.some((team) => team.teamId === current)) {
        return current;
      }
      return filteredTeams[0].teamId;
    });
  }, [filteredTeams]);

  useEffect(() => {
    resetDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, selectedEventId]);

  const handleCategoryDraftChange = (categoryName, patch) => {
    setDraft((current) => ({
      ...current,
      categoryEntries: current.categoryEntries.map((entry) =>
        normalizeKey(entry.name) === normalizeKey(categoryName)
          ? { ...entry, ...patch }
          : entry,
      ),
    }));
  };

  const handleNotesChange = (value) => {
    setDraft((current) => ({
      ...current,
      notes: value,
    }));
  };

  const handleRoundChange = (roundName) => {
    resetDraft(roundName);
  };

  const handleSelectNextTeam = () => {
    if (!filteredTeams.length) return;

    setSelectedTeamId((current) => {
      const index = filteredTeams.findIndex((team) => team.teamId === current);
      if (index === -1) {
        return filteredTeams[0].teamId;
      }
      return filteredTeams[(index + 1) % filteredTeams.length].teamId;
    });
  };

  const handleSave = async () => {
    if (!selectedEventId || !selectedTeamId) return;

    const roundName = String(draft.selectedRound || "").trim();

    if (!teamMarksConfig.length) {
      setError("Create rounds and categories first.");
      return;
    }
    if (!roundName) {
      setError("Choose a round.");
      return;
    }

    const entriesToProcess = (
      Array.isArray(draft.categoryEntries) ? draft.categoryEntries : []
    ).filter((entry) => String(entry.score || "").trim());

    if (!entriesToProcess.length) {
      setError("Enter at least one score for this round.");
      return;
    }

    for (const entry of entriesToProcess) {
      const categoryName = String(entry.name || "").trim();
      const scoreValue = String(entry.score || "").trim();
      const maxScore = Number(entry.maxScore);

      if (!categoryName) {
        setError("Each category needs a name.");
        return;
      }

      const score = Number(scoreValue);
      if (!Number.isFinite(score) || score < 0) {
        setError(`Enter a valid score for ${categoryName}.`);
        return;
      }
      if (!Number.isFinite(maxScore) || maxScore <= 0) {
        setError(`Invalid max score for ${categoryName}.`);
        return;
      }
      if (score > maxScore) {
        setError(`${categoryName} score cannot be greater than max score.`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      await saveTeamMark({
        eventId: selectedEventId,
        teamId: selectedTeamId,
        roundName,
        notes: String(draft.notes || "").trim(),
        categories: entriesToProcess.map((entry) => ({
          criteriaType: entry.name,
          score: Number(entry.score),
          maxScore: Number(entry.maxScore),
        })),
      });

      await loadData();
      resetDraft(roundName);
    } catch (saveError) {
      setError(saveError?.message || "Failed to save mark");
    } finally {
      setSaving(false);
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
    <MarksLayout
      topBar={
        <TopBar
          events={eventItems}
          selectedEventId={selectedEventId}
          selectedEventTitle={selectedEvent?.title || ""}
          onChangeEvent={setSelectedEventId}
          hasConfig={teamMarksConfig.length > 0}
          onOpenConfig={openConfigModal}
          onRefresh={() => loadData()}
          loading={loading}
          error={error}
          stats={dashboardStats}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          roundOptions={roundOptions}
          selectedRound={draft.selectedRound}
          onRoundChange={handleRoundChange}
        />
      }
      sidebar={
        viewMode === "grading" ? (
          <TeamsSidebar
            teams={filteredTeams}
            selectedTeamId={selectedTeamId}
            statsById={statsById}
            loading={loading}
            onSelect={setSelectedTeamId}
            searchTerm={teamSearchTerm}
            onSearchChange={setTeamSearchTerm}
          />
        ) : null
      }
    >
      <div className="transition-opacity duration-200">
        {viewMode === "results" ? (
          <ResultsPanel
            loading={loading}
            rows={filteredResultsRows}
            totalCount={resultsRows.length}
            roundOptions={roundOptions}
            selectedEventTitle={selectedEvent?.title || ""}
            searchTerm={resultsSearchTerm}
            onSearchChange={setResultsSearchTerm}
            orderValue={resultsOrder}
            onOrderValueChange={setResultsOrder}
            topLimitValue={resultsTopLimit}
            customTopLimit={resultsCustomTopLimit}
            onTopLimitValueChange={setResultsTopLimit}
            onCustomTopLimitChange={setResultsCustomTopLimit}
          />
        ) : (
          <TeamDetailsPanel
            loading={loading}
            selectedTeam={selectedTeam}
            selectedEventTitle={selectedEvent?.title || ""}
            teamOptions={teamOptionsForMobile}
            selectedTeamId={selectedTeamId}
            onSelectTeam={setSelectedTeamId}
            onSelectNextTeam={handleSelectNextTeam}
            searchTerm={teamSearchTerm}
            summary={selectedSummary}
            selectedRound={draft.selectedRound}
            currentRoundScore={currentRoundTotals.score}
            currentRoundMaxScore={currentRoundTotals.maxScore}
            draft={draft}
            hasConfig={teamMarksConfig.length > 0}
            saving={saving}
            onCategoryDraftChange={handleCategoryDraftChange}
            onNotesChange={handleNotesChange}
            onSave={handleSave}
            onCancelEdit={resetDraft}
            onOpenConfig={openConfigModal}
          />
        )}

        <RoundConfigModal
          open={configModalOpen}
          configDraft={configDraft}
          saving={saving}
          onClose={() => setConfigModalOpen(false)}
          onConfigChange={setConfigDraft}
          onSave={handleConfigSave}
        />
      </div>
    </MarksLayout>
  );
}

export default function MarksForStudents() {
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
        const response = await checkLogin();
        if (!mounted) return;

        if (!response?.authenticated || !response?.user) {
          navigate("/login", { replace: true });
          return;
        }

        const currentUser = response.user;
        if (currentUser.role !== "admin" && currentUser.role !== "member") {
          navigate("/main", { replace: true });
          return;
        }

        setUser(currentUser);
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
        const response = await fetchEvents();
        const allEvents = response?.events || response || [];
        const rolesConfig = await getRoles().catch(() => null);
        const eventManagersByEvent = rolesConfig?.eventManagersByEvent || {};
        const userEmail = String(user?.email || "")
          .toLowerCase()
          .trim();

        const isConfiguredManagerFor = (event) => {
          const titleKey = event?.title ? String(event.title).trim() : "";
          const idKey = event?._id ? String(event._id).trim() : "";
          const keys = [titleKey, idKey].filter(Boolean);

          for (const key of keys) {
            const list = Array.isArray(eventManagersByEvent?.[key])
              ? eventManagersByEvent[key]
              : [];
            const normalized = list.map((value) =>
              String(value).toLowerCase().trim(),
            );
            if (normalized.includes(userEmail)) return true;
          }
          return false;
        };

        const managedEvents = (
          Array.isArray(allEvents) ? allEvents : []
        ).filter((event) => {
          if (user?.role === "admin") return true;
          const managerEmail = String(event?.managerEmail || "")
            .toLowerCase()
            .trim();
          return managerEmail === userEmail || isConfiguredManagerFor(event);
        });

        setEvents(managedEvents);
      } catch (loadError) {
        setEvents([]);
        setEventsError(loadError?.message || "Failed to load events");
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
          <p className="text-neutral-400 text-sm">Loading Team Marks...</p>
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
            You do not have permission to view team marks.
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
        <MarksForStudentsSection events={events} />
      )}
    </div>
  );
}
