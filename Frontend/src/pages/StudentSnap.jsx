import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { checkLogin } from "../services/auth";
import {
  allowStudentAttendanceResubmit,
  fetchEvents,
  fetchManagerAttendanceSubmissions,
  fetchTeams,
  getRoles,
  reviewStudentAttendance,
} from "../services/api";

import {
  IconCheck,
  IconX,
  IconMapPin,
  IconChevronDown,
  IconRefresh,
  IconUsers,
  IconCalendarEvent,
  IconSearch,
  IconClock,
  IconCamera,
  IconBrandTabler,
} from "@tabler/icons-react";

function StatusBadge({ status }) {
  const s = String(status || "pending");
  const cls =
    s === "approved"
      ? "bg-emerald-900/30 text-emerald-250 border-emerald-800/50"
      : s === "rejected"
        ? "bg-red-900/30 text-red-250 border-red-800/50"
        : "bg-yellow-900/30 text-yellow-250 border-yellow-800/50";

  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase " +
        cls
      }
    >
      {s}
    </span>
  );
}

function TeamCard({ team, stats, active, onSelect }) {
  const pending = stats?.pending || 0;
  const approved = stats?.approved || 0;
  const rejected = stats?.rejected || 0;
  const total = stats?.total || 0;
  
  const teamName = team.teamName;
  const leaderName = team.leader?.name || "No Leader";
  const studentCount = (team.members?.length || 0) + 1;
  const initial = (String(teamName || "T").trim()[0] || "T").toUpperCase();
  
  // Simulated online indicator based on teamId hash code
  const isOnline = (String(team.teamId).charCodeAt(String(team.teamId).length - 1) % 3) !== 0;

  return (
    <button
      onClick={onSelect}
      className={
        "w-full text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer block relative overflow-hidden group " +
        (active
          ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
          : "border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900/50 hover:border-neutral-700")
      }
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
      )}
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-linear-to-br from-blue-500/30 to-cyan-400/20 border border-neutral-850 flex items-center justify-center text-neutral-100 text-sm font-bold relative">
            {initial}
            <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-neutral-950 ${isOnline ? "bg-emerald-500" : "bg-neutral-500"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
              {teamName}
            </p>
            <p className="text-xs text-neutral-450 truncate">
              Lead: {leaderName}
            </p>
          </div>
        </div>
        <span className="text-[10px] text-neutral-600 font-mono shrink-0">
          #{String(team.teamId).slice(-4)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-400 border-t border-neutral-800/60 pt-2">
        <span>{studentCount} students</span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-450" />
            {approved}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-450 animate-pulse" />
            {pending}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-450" />
            {rejected}
          </span>
        </div>
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
    <div className="scrollbar-hidden w-full h-full overflow-y-auto p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <IconUsers className="h-4 w-4 text-blue-450" />
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Teams ({teams.length})
        </p>
      </div>

      <div className="relative mb-4 shrink-0">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search team name"
          aria-label="Search team name"
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-blue-500/60"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
          <IconSearch className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="scrollbar-hidden flex-1 overflow-y-auto space-y-3 pb-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 animate-pulse"
              >
                <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse" />
                <div className="mt-2 h-3 w-24 bg-neutral-800 rounded animate-pulse" />
                <div className="mt-3 h-3 w-40 bg-neutral-800 rounded animate-pulse" />
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
                team={t}
                stats={statsById.get(t.teamId)}
                active={t.teamId === selectedTeamId}
                onSelect={() => onSelect(t.teamId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LocationDisplay({ latitude, longitude, locationName, accuracy }) {
  const [resolvedName, setResolvedName] = useState(locationName || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resolvedName) return; // Already resolved or loaded from DB
    if (latitude == null || longitude == null) return;

    let active = true;
    (async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
        const resp = await fetch(url, {
          headers: {
            "Accept-Language": "en"
          }
        });
        if (resp.ok && active) {
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

          let locName = "";
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

          // Fetch nearest named POI (building, college, amenity, etc.) from OSM Overpass API dynamically
          let poiName = "";
          try {
            const query = `[out:json];(
              node(around:500, ${latitude}, ${longitude})["amenity"];
              way(around:500, ${latitude}, ${longitude})["amenity"];
              node(around:500, ${latitude}, ${longitude})["building"];
              way(around:500, ${latitude}, ${longitude})["building"];
              node(around:500, ${latitude}, ${longitude})["office"];
              way(around:500, ${latitude}, ${longitude})["office"];
            );out tags;`;
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
            const overpassResp = await fetch(overpassUrl);
            if (overpassResp.ok) {
              const overpassData = await overpassResp.json();
              const elements = overpassData.elements || [];
              const named = elements.filter(el => el.tags && el.tags.name);
              if (named.length > 0) {
                // Sort to prioritize university/college, then library, then others
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

          setResolvedName(locName);
        }
      } catch (err) {
        console.error("Reverse geocoding failed", err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [latitude, longitude, resolvedName]);

  if (latitude == null || longitude == null) {
    return (
      <p className="text-[11px] text-neutral-600 mt-1.5 italic">
        No location recorded
      </p>
    );
  }

  const cleanDisplayAddress = (addressStr) => {
    if (!addressStr) return "";
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
    const parts = addressStr.split(",").map(p => p.trim());
    const filtered = parts.filter(part => {
      const lower = part.toLowerCase();
      if (/^\d{5,6}$/.test(lower)) return false;
      return !excludedKeywords.some(keyword => lower.includes(keyword));
    });
    
    let base = filtered.join(", ") || addressStr;
    return base;
  };

  const displayAddress = cleanDisplayAddress(resolvedName);
  const accuracyText = accuracy != null ? ` (±${Math.round(accuracy)}m)` : "";

  return (
    <a
      href={`https://www.google.com/maps?q=${latitude},${longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline mt-1.5 inline-flex items-center gap-1 font-medium transition-colors line-clamp-2 text-left cursor-pointer"
      title={(displayAddress || "View location on Google Maps") + accuracyText}
    >
      📍 {loading ? "Resolving location..." : (displayAddress || `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`) + accuracyText}
    </a>
  );
}

function LightboxModal({ record, onClose }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!record) return null;

  const dateStr = record.createdAt ? new Date(record.createdAt).toLocaleString() : "";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <div className="relative max-w-4xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Photo Container */}
        <div className="flex-1 bg-black flex items-center justify-center relative min-h-[320px] md:min-h-[520px]">
          <img
            src={record.photoDataUrl}
            alt="Attendance snapshot full view"
            onContextMenu={(e) => e.preventDefault()}
            draggable="false"
            className={`max-h-[70vh] max-w-full object-contain transition-transform duration-300 select-none ${zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"}`}
            onClick={() => setZoomed(!zoomed)}
          />
          <button
            onClick={() => setZoomed(!zoomed)}
            className="absolute bottom-4 right-4 px-3 py-1.5 bg-neutral-950/80 text-xs text-white rounded-lg border border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {zoomed ? "Zoom Out" : "Zoom In"}
          </button>
        </div>

        {/* Details Panel */}
        <div className="w-full md:w-80 p-6 border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col justify-between bg-neutral-900">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white">
                {record.sessionName || "Attendance Snap"}
              </h3>
              <button
                onClick={onClose}
                className="text-neutral-450 hover:text-white transition-colors cursor-pointer text-base p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs text-neutral-400">
              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Student</p>
                <p className="text-white text-sm font-semibold mt-0.5">{record.student?.name || "Student"}</p>
                <p className="mt-0.5 font-mono">{record.student?.regno || ""}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Date & Time</p>
                <p className="text-neutral-200 mt-0.5">{dateStr}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">GPS Location</p>
                <div className="mt-0.5">
                  <LocationDisplay
                    latitude={record.latitude}
                    longitude={record.longitude}
                    locationName={record.locationName}
                    accuracy={record.accuracy}
                  />
                </div>
              </div>

              {record.accuracy != null && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">GPS Accuracy</p>
                  <p className="text-neutral-200 mt-0.5">±{Math.round(record.accuracy)} meters</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full py-2 bg-neutral-800 hover:bg-neutral-755 text-white rounded-xl text-xs font-semibold transition-colors border border-neutral-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentCard({
  student,
  isLeader,
  allSessions,
  currentSessionName,
  recordBySession,
  busyRecords,
  onApprove,
  onReject,
  onAllowRemark,
  onOpenLightbox,
}) {
  const [activeSessionName, setActiveSessionName] = useState(
    currentSessionName || allSessions[allSessions.length - 1] || "default"
  );

  useEffect(() => {
    if (allSessions.length && !allSessions.includes(activeSessionName)) {
      setActiveSessionName(allSessions[allSessions.length - 1]);
    }
  }, [allSessions, activeSessionName]);

  const activeRecord = recordBySession.get(activeSessionName);
  const status = activeRecord?.status;
  const isBusy = activeRecord ? Boolean(busyRecords[activeRecord._id]) : false;

  const handleCircleClick = (sessionName) => {
    if (activeSessionName === sessionName) {
      const rec = recordBySession.get(sessionName);
      if (rec) {
        onOpenLightbox(rec);
      }
    } else {
      setActiveSessionName(sessionName);
    }
  };

  const nameInitial = (student.name || "S").trim()[0].toUpperCase();

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-5 relative overflow-hidden flex flex-col gap-4">
      {/* Student Profile details */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-linear-to-br from-indigo-500/20 to-blue-500/20 border border-neutral-850 flex items-center justify-center text-white text-sm font-bold shadow-inner">
            {nameInitial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white leading-none">
                {student.name}
              </h4>
              {isLeader && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                  Leader
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1 font-mono">{student.regno}</p>
          </div>
        </div>
      </div>

      {/* Session Circles horizontal row */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Attendance Sessions</p>
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hidden whitespace-nowrap">
          {allSessions.map((sessionName) => {
            const rec = recordBySession.get(sessionName);
            const isCurrent = sessionName === currentSessionName;
            const isSelected = sessionName === activeSessionName;

            let borderCls = "border-neutral-800";
            let bgCls = "bg-neutral-950";
            
            if (rec) {
              if (rec.status === "approved") borderCls = "border-emerald-500/60";
              else if (rec.status === "rejected") borderCls = "border-red-500/60";
              else borderCls = "border-yellow-500/60";
            }

            return (
              <button
                key={sessionName}
                onClick={() => handleCircleClick(sessionName)}
                title={`${sessionName}${rec ? ` (${rec.status})` : " (Not submitted)"}`}
                className={
                  "h-8 w-8 rounded-full border-2 shrink-0 flex items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer relative " +
                  borderCls + " " + bgCls + " " +
                  (isSelected ? " scale-110 ring-1 ring-blue-500" : " hover:scale-105") +
                  (isCurrent ? " ring-2 ring-offset-2 ring-offset-neutral-900 ring-blue-500/40" : "")
                }
              >
                {rec?.photoDataUrl ? (
                  <img
                    src={rec.photoDataUrl}
                    alt={sessionName}
                    className="h-full w-full object-cover"
                    onContextMenu={(e) => e.preventDefault()}
                    draggable="false"
                  />
                ) : (
                  <span className="text-[9px] text-neutral-600 font-bold">○</span>
                )}
                
                {isCurrent && (
                  <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Session Details & Preview area */}
      <div className="border-t border-neutral-800/60 pt-3 flex-grow flex flex-col justify-between gap-3 min-h-[250px]">
        <div className="flex-grow flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-neutral-450 uppercase font-semibold">
              Selected: <span className="text-white normal-case font-bold">{activeSessionName}</span>
            </span>
            {activeRecord && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                activeRecord.status === "approved"
                  ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                  : activeRecord.status === "rejected"
                    ? "bg-red-950/20 text-red-400 border-red-900/50"
                    : "bg-yellow-950/20 text-yellow-450 border-yellow-900/50"
              }`}>
                {activeRecord.status}
              </span>
            )}
          </div>

          {activeRecord ? (
            <div className="mt-2 space-y-2 flex-grow flex flex-col justify-between">
              {/* Image Preview */}
              <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative border border-neutral-800/80 group">
                <img
                  src={activeRecord.photoDataUrl}
                  alt={`${student.name} snap`}
                  className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  onContextMenu={(e) => e.preventDefault()}
                  draggable="false"
                  loading="lazy"
                />
                <button
                  onClick={() => onOpenLightbox(activeRecord)}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-white font-medium cursor-pointer"
                >
                  Click to Expand
                </button>
              </div>

              {/* Location & timestamp details */}
              <div className="text-[11px] space-y-1 mt-2">
                <div className="flex items-start gap-1.5 text-neutral-400">
                  <LocationDisplay
                    latitude={activeRecord.latitude}
                    longitude={activeRecord.longitude}
                    locationName={activeRecord.locationName}
                    accuracy={activeRecord.accuracy}
                  />
                </div>
                {activeRecord.createdAt && (
                  <p className="text-neutral-500 flex items-center gap-1.5">
                    🕒 {new Date(activeRecord.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 py-10 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/30 text-center text-xs text-neutral-500 flex items-center justify-center flex-grow">
              No submission for this session
            </div>
          )}
        </div>

        {/* Action button controls */}
        {activeRecord && (
          <div className="space-y-2 mt-auto pt-2 border-t border-neutral-850/40">
            <div className="flex gap-2">
              <button
                disabled={isBusy}
                onClick={() => onApprove(activeRecord._id)}
                className={
                  "flex-grow flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer " +
                  (isBusy
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    : status === "approved"
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-neutral-900 border border-neutral-800 text-emerald-400 hover:bg-emerald-600 hover:text-white")
                }
              >
                <IconCheck className="h-3 w-3" />
                {isBusy ? "Updating..." : "Present"}
              </button>
              <button
                disabled={isBusy}
                onClick={() => onReject(activeRecord._id)}
                className={
                  "flex-grow flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer " +
                  (isBusy
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    : status === "rejected"
                      ? "bg-rose-600 text-white font-bold"
                      : "bg-neutral-900 border border-neutral-800 text-rose-455 hover:bg-rose-600 hover:text-white")
                }
              >
                <IconX className="h-3 w-3" />
                {isBusy ? "Updating..." : "Absent"}
              </button>
            </div>

            {status === "rejected" && !Boolean(activeRecord.allowResubmit) && (
              <button
                disabled={isBusy}
                onClick={() => onAllowRemark(activeRecord._id)}
                className={
                  "w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all cursor-pointer bg-neutral-900 border border-neutral-800 text-blue-400 hover:bg-blue-600 hover:text-white"
                }
              >
                Allow Re-submit
              </button>
            )}

            {status === "rejected" && Boolean(activeRecord.allowResubmit) && (
              <p className="text-[10px] text-emerald-400 font-semibold text-center mt-1 animate-pulse">
                Re-submit enabled for student
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamDetailsPanel({
  loading,
  selectedTeam,
  stats,
  allSessions,
  currentSessionName,
  records,
  teamOptions,
  selectedTeamId,
  onSelectTeam,
  searchTerm,
  onPrevTeam,
  onNextTeam,
  onRefresh,
  eventName,
  onApprove,
  onReject,
  onAllowRemark,
  busyRecords,
  onOpenLightbox,
}) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 animate-pulse">
          <div className="h-5 w-40 bg-neutral-800 rounded animate-pulse" />
          <div className="mt-3 h-3 w-64 bg-neutral-800 rounded animate-pulse" />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 bg-neutral-950/40 overflow-hidden"
              >
                <div className="aspect-video bg-neutral-900 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-neutral-850 rounded w-28 animate-pulse" />
                  <div className="h-3 bg-neutral-850 rounded w-20 animate-pulse" />
                  <div className="h-8 bg-neutral-850 rounded w-full mt-2 animate-pulse" />
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
      <div className="p-6 h-[75vh] flex items-center justify-center">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-10 text-center text-sm text-neutral-400 max-w-sm flex flex-col items-center gap-3">
          <IconUsers className="h-8 w-8 text-neutral-600 animate-bounce" />
          <p className="font-semibold text-white">No Team Selected</p>
          <p className="text-xs text-neutral-500">
            Select a team from the left sidebar to view submissions.
          </p>
        </div>
      </div>
    );
  }

  const students = [
    selectedTeam.leader,
    ...(selectedTeam.members || []),
  ].filter(Boolean);

  const totalMembers = students.length;

  return (
    <motion.div
      key={selectedTeamId}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 space-y-6"
    >
      {/* Top Header Panel */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded">
              {eventName || "Event"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5">
            {selectedTeam.teamName}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Leader: <span className="text-white font-semibold">{selectedTeam.leader?.name || "None"}</span> • {totalMembers} members
          </p>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevTeam}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              ← Prev Team
            </button>
            <button
              onClick={onNextTeam}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Next Team →
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Student Attendance List */}
      <div>
        <h3 className="text-xs font-bold text-neutral-450 uppercase tracking-wider mb-4">
          Student Attendance
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {students.map((st) => {
            const isLead = String(st._id || st.id || "") === String(selectedTeam.leader?._id || selectedTeam.leader || "");
            
            const studentRecords = (Array.isArray(records) ? records : []).filter(
              (r) => String(r?.student?._id || r?.student || "") === String(st._id || st.id || "")
            );
            
            const recordBySession = new Map();
            for (const r of studentRecords) {
              if (r.sessionName) {
                recordBySession.set(r.sessionName, r);
              }
            }

            return (
              <StudentCard
                key={st._id || st.id || st.regno}
                student={st}
                isLeader={isLead}
                allSessions={allSessions}
                currentSessionName={currentSessionName}
                recordBySession={recordBySession}
                busyRecords={busyRecords}
                onApprove={onApprove}
                onReject={onReject}
                onAllowRemark={onAllowRemark}
                onOpenLightbox={onOpenLightbox}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function TopBar({
  events,
  selectedEventId,
  onChangeEvent,
  onRefresh,
  loading,
  error,
  onToggleSidebar,
}) {
  return (
    <header className="shrink-0 border-b border-neutral-800 bg-neutral-950/70 backdrop-blur relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        {/* Left Side menu toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors md:hidden cursor-pointer"
            aria-label="Toggle sidebar menu"
          >
            <IconBrandTabler className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Student Snap
            </h1>
            <p className="text-xs text-neutral-500">
              Review student attendance submissions
            </p>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex gap-2 items-center">
          <select
            value={selectedEventId}
            onChange={(e) => onChangeEvent(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs sm:text-sm text-neutral-300 outline-none focus:border-blue-500/60 cursor-pointer"
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
              "px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors border cursor-pointer flex items-center gap-1.5 " +
              (loading
                ? "bg-neutral-900/30 border-neutral-800 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-900/40 hover:bg-neutral-900/60 border-neutral-800 text-white")
            }
          >
            <IconRefresh className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-4 text-xs text-red-200">
            {error}
          </div>
        </div>
      )}
    </header>
  );
}

function StudentSnapLayout({ topBar, sidebar, sidebarOpen, setSidebarOpen, children }) {
  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-white font-sans overflow-hidden">
      {topBar}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar backdrop overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden cursor-pointer"
            />
          )}
        </AnimatePresence>

        {/* Slide-out sidebar drawer on Mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-neutral-950 border-r border-neutral-900 flex md:hidden"
            >
              {sidebar}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Desktop Fixed Sidebar */}
        <aside className="hidden md:flex w-72 shrink-0 border-r border-neutral-800 bg-neutral-950/60">
          {sidebar}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-hidden bg-neutral-950">
          {children}
        </main>
      </div>
    </div>
  );
}

export function StudentSnapSection({ events }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [lightboxRecord, setLightboxRecord] = useState(null);

  useEffect(() => {
    if (!selectedEventId && Array.isArray(events) && events.length > 0) {
      setSelectedEventId(String(events[0]._id || events[0].id || ""));
    }
  }, [events, selectedEventId]);

  const selectedEvent = useMemo(() => {
    return events.find((ev) => String(ev._id || ev.id) === String(selectedEventId));
  }, [events, selectedEventId]);

  const eventName = selectedEvent?.title || "";

  const orderedTeams = useMemo(() => {
    return (Array.isArray(teams) ? teams : [])
      .map((t) => ({
        teamId: String(t?._id || t?.id || ""),
        teamName: t?.name || "Team",
        leader: t?.leader,
        members: t?.members || [],
        event: t?.event,
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

  // Extract all unique session names for this event from submissions records
  const allSessions = useMemo(() => {
    const set = new Set();
    for (const r of Array.isArray(records) ? records : []) {
      if (r?.sessionName) set.add(r.sessionName);
    }
    const list = Array.from(set).sort();
    if (!list.length) return ["Session 1"]; // fallback
    return list;
  }, [records]);

  // The latest session is considered the current session
  const currentSessionName = useMemo(() => {
    return allSessions[allSessions.length - 1] || "Session 1";
  }, [allSessions]);

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

  const handlePrevTeam = () => {
    if (!filteredTeams.length) return;
    const index = filteredTeams.findIndex((t) => t.teamId === selectedTeamId);
    if (index === -1) {
      setSelectedTeamId(filteredTeams[0].teamId);
    } else {
      const prevIndex = (index - 1 + filteredTeams.length) % filteredTeams.length;
      setSelectedTeamId(filteredTeams[prevIndex].teamId);
    }
  };

  const handleNextTeam = () => {
    if (!filteredTeams.length) return;
    const index = filteredTeams.findIndex((t) => t.teamId === selectedTeamId);
    if (index === -1) {
      setSelectedTeamId(filteredTeams[0].teamId);
    } else {
      const nextIndex = (index + 1) % filteredTeams.length;
      setSelectedTeamId(filteredTeams[nextIndex].teamId);
    }
  };

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
        <div className="text-center text-sm text-neutral-450">No managed events.</div>
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
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      }
      sidebar={
        <TeamsSidebar
          teams={filteredTeams}
          selectedTeamId={selectedTeamId}
          statsById={statsById}
          loading={loading}
          onSelect={(teamId) => {
            setSelectedTeamId(teamId);
            setSidebarOpen(false);
          }}
          searchTerm={teamSearchTerm}
          onSearchChange={setTeamSearchTerm}
        />
      }
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    >
      <div className="transition-opacity duration-200">
        <TeamDetailsPanel
          key={selectedTeamId || "no-team"}
          loading={loading}
          selectedTeam={selectedTeam}
          stats={selectedStats}
          allSessions={allSessions}
          currentSessionName={currentSessionName}
          records={records}
          teamOptions={teamOptionsForMobile}
          selectedTeamId={selectedTeamId}
          onSelectTeam={(teamId) => {
            setSelectedTeamId(teamId);
            setSidebarOpen(false);
          }}
          searchTerm={teamSearchTerm}
          onPrevTeam={handlePrevTeam}
          onNextTeam={handleNextTeam}
          onRefresh={() => loadData()}
          eventName={eventName}
          onApprove={(id) => decide(id, "approved")}
          onReject={(id) => decide(id, "rejected")}
          onAllowRemark={allowRemark}
          busyRecords={actionLoading}
          onOpenLightbox={setLightboxRecord}
        />
      </div>

      <AnimatePresence>
        {lightboxRecord && (
          <LightboxModal
            record={lightboxRecord}
            onClose={() => setLightboxRecord(null)}
          />
        )}
      </AnimatePresence>
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
