import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkLogin } from "../services/auth";
import {
  getMyContacts,
  getOrganizerApplications,
  updateContactStatus,
  addContactAsStudent,
  promoteToMember,
} from "../services/api";

// ─────────────────────────────────────────
// Small utilities
// ─────────────────────────────────────────
function Badge({ color, children }) {
  const colors = {
    blue: "bg-blue-900/50 text-blue-300 border-blue-700/30",
    yellow: "bg-yellow-900/50 text-yellow-300 border-yellow-700/30",
    green: "bg-green-900/50 text-green-300 border-green-700/30",
    purple: "bg-purple-900/50 text-purple-300 border-purple-700/30",
    red: "bg-red-900/50 text-red-300 border-red-700/30",
  };
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium uppercase tracking-wider ${colors[color]}`}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <Badge color={status === "unread" ? "blue" : status === "read" ? "yellow" : "green"}>
      {status}
    </Badge>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">{label}</span>
      <span className="text-sm text-white break-words">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────
// Main component
// ─────────────────────────────────────────
export default function EventContacts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Tab: "events" | "applications"
  const [activeTab, setActiveTab] = useState("events");

  // Event contacts state
  const [contacts, setContacts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState(null);

  // Organizer applications state
  const [applications, setApplications] = useState([]);
  const [appFilter, setAppFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState(null);

  const [updating, setUpdating] = useState(false);

  // ── Auth ──
  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      try {
        const res = await checkLogin();
        if (!mounted) return;
        if (!res.authenticated) { navigate("/login", { replace: true }); return; }
        const role = (res.user || {}).role;
        const admin = role === "admin";
        setIsAdmin(admin);
        if (role === "admin" || role === "member") setAuthorized(true);
        else setAuthorized(false);
      } catch {
        if (mounted) navigate("/login", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    verify();
    return () => { mounted = false; };
  }, [navigate]);

  // ── Load event contacts ──
  useEffect(() => {
    if (!authorized) return;
    let mounted = true;
    getMyContacts()
      .then((d) => { if (mounted) setContacts(d.contacts || []); })
      .catch(() => { if (mounted) setContacts([]); });
    return () => { mounted = false; };
  }, [authorized]);

  // ── Load organizer applications (admin only) ──
  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    getOrganizerApplications()
      .then((d) => { if (mounted) setApplications(d.applications || []); })
      .catch(() => { if (mounted) setApplications([]); });
    return () => { mounted = false; };
  }, [isAdmin]);

  // ── Handlers ──
  const handleStatusChange = async (contactId, newStatus, isApp = false) => {
    try {
      setUpdating(true);
      await updateContactStatus(contactId, newStatus);
      if (isApp) {
        setApplications(prev => prev.map(c => c._id === contactId ? { ...c, status: newStatus } : c));
        if (selectedApp?._id === contactId) setSelectedApp(p => ({ ...p, status: newStatus }));
      } else {
        setContacts(prev => prev.map(c => c._id === contactId ? { ...c, status: newStatus } : c));
        if (selectedContact?._id === contactId) setSelectedContact(p => ({ ...p, status: newStatus }));
      }
    } catch (err) { alert(err.message || "Failed to update status"); }
    finally { setUpdating(false); }
  };

  const handleAddAsStudent = async (contactId) => {
    const contact = contacts.find(c => c._id === contactId);
    if (!contact || !confirm(`Add ${contact.name} (${contact.regno}) as a student for "${contact.eventTitle}"?`)) return;
    try {
      setUpdating(true);
      const result = await addContactAsStudent(contactId);
      alert(result.message || "Student added successfully");
      setContacts(prev => prev.map(c => c._id === contactId ? { ...c, status: "handled" } : c));
      if (selectedContact?._id === contactId) setSelectedContact(p => ({ ...p, status: "handled" }));
    } catch (err) { alert(err.message || "Failed to add student"); }
    finally { setUpdating(false); }
  };

  const handlePromote = async (appId) => {
    const app = applications.find(a => a._id === appId);
    if (!app || !confirm(`Promote ${app.name} to Member? They will be able to manage events.`)) return;
    try {
      setUpdating(true);
      const result = await promoteToMember(appId);
      alert(result.message || "User promoted successfully!");
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status: "handled" } : a));
      if (selectedApp?._id === appId) setSelectedApp(p => ({ ...p, status: "handled" }));
    } catch (err) { alert(err.message || "Failed to promote user"); }
    finally { setUpdating(false); }
  };

  // ── Derived ──
  const filteredContacts = filter === "all" ? contacts : contacts.filter(c => c.status === filter);
  const filteredApps = appFilter === "all" ? applications : applications.filter(a => a.status === appFilter);

  const counts = {
    contacts: contacts.length,
    unread: contacts.filter(c => c.status === "unread").length,
    read: contacts.filter(c => c.status === "read").length,
    handled: contacts.filter(c => c.status === "handled").length,
    apps: applications.length,
    appsPending: applications.filter(a => a.status !== "handled").length,
  };

  // ── States ──
  if (loading) return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading contacts...</p>
      </div>
    </div>
  );

  if (!authorized) return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Unauthorized</h2>
        <p className="text-slate-400">You must be an event manager or admin to view contacts.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Contacts & Applications
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage inbound event inquiries and organizer applications
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit mb-8">
          <button
            onClick={() => { setActiveTab("events"); setSelectedContact(null); }}
            className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "events"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
              : "text-slate-400 hover:text-white"}`}
          >
            Event Contacts
            {counts.unread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] bg-blue-400 text-blue-950 font-bold rounded-full">
                {counts.unread}
              </span>
            )}
          </button>
          {isAdmin && (
            <button
              onClick={() => { setActiveTab("applications"); setSelectedApp(null); }}
              className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "applications"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                : "text-slate-400 hover:text-white"}`}
            >
              Organizer Applications
              {counts.appsPending > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] bg-purple-400 text-purple-950 font-bold rounded-full">
                  {counts.appsPending}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ══════════════════════════════════════════ */}
        {/* TAB: EVENT CONTACTS                        */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === "events" && (
          <div>
            {/* Sub-filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { label: "All", value: "all", count: counts.contacts },
                { label: "Unread", value: "unread", count: counts.unread },
                { label: "Read", value: "read", count: counts.read },
                { label: "Handled", value: "handled", count: counts.handled },
              ].map(tab => (
                <button key={tab.value} onClick={() => setFilter(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === tab.value
                    ? "bg-blue-600 text-white shadow shadow-blue-900/40"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"}`}>
                  {tab.label} <span className="opacity-60">({tab.count})</span>
                </button>
              ))}
            </div>

            {filteredContacts.length === 0 ? (
              <EmptyState message="No event contact messages found." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* List */}
                <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                  {filteredContacts.map(contact => (
                    <ContactCard
                      key={contact._id}
                      contact={contact}
                      selected={selectedContact?._id === contact._id}
                      onClick={() => { setSelectedContact(contact); handleStatusChange(contact._id, "read"); }}
                    />
                  ))}
                </div>

                {/* Detail */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-6 sticky top-6 min-h-56">
                  {selectedContact ? (
                    <EventContactDetail
                      contact={selectedContact}
                      updating={updating}
                      onStatusChange={(s) => handleStatusChange(selectedContact._id, s)}
                      onAddStudent={() => handleAddAsStudent(selectedContact._id)}
                      onClose={() => setSelectedContact(null)}
                    />
                  ) : (
                    <SelectHint message="Select a contact to view its details" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* TAB: ORGANIZER APPLICATIONS (admin only)   */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === "applications" && isAdmin && (
          <div>
            {/* Sub-filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { label: "All", value: "all", count: applications.length },
                { label: "Pending", value: "unread", count: applications.filter(a => a.status === "unread").length },
                { label: "Reviewed", value: "read", count: applications.filter(a => a.status === "read").length },
                { label: "Handled", value: "handled", count: applications.filter(a => a.status === "handled").length },
              ].map(tab => (
                <button key={tab.value} onClick={() => setAppFilter(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${appFilter === tab.value
                    ? "bg-purple-600 text-white shadow shadow-purple-900/40"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"}`}>
                  {tab.label} <span className="opacity-60">({tab.count})</span>
                </button>
              ))}
            </div>

            {filteredApps.length === 0 ? (
              <EmptyState message="No organizer applications found." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Application list */}
                <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                  {filteredApps.map(app => (
                    <ApplicationCard
                      key={app._id}
                      app={app}
                      selected={selectedApp?._id === app._id}
                      onClick={() => { setSelectedApp(app); if (app.status === "unread") handleStatusChange(app._id, "read", true); }}
                    />
                  ))}
                </div>

                {/* Application detail */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-6 sticky top-6 min-h-56">
                  {selectedApp ? (
                    <ApplicationDetail
                      app={selectedApp}
                      updating={updating}
                      onStatusChange={(s) => handleStatusChange(selectedApp._id, s, true)}
                      onPromote={() => handlePromote(selectedApp._id)}
                      onClose={() => setSelectedApp(null)}
                    />
                  ) : (
                    <SelectHint message="Select an application to review it" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function ContactCard({ contact, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white/3 border rounded-xl p-4 cursor-pointer transition-all duration-150 ${selected
        ? "border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-900/10"
        : "border-white/10 hover:border-blue-900/50 hover:bg-white/5"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white flex items-center gap-2 truncate">
            {contact.name}
            {contact.status === "unread" && <span className="inline-block w-2 h-2 bg-blue-400 rounded-full shrink-0" />}
          </h3>
          <p className="text-sm text-slate-400 truncate">{contact.email}</p>
        </div>
        <StatusBadge status={contact.status} />
      </div>
      <p className="text-xs text-slate-500 truncate">
        <span className="text-slate-400">{contact.eventTitle}</span>
      </p>
      <p className="text-xs text-slate-600 mt-1">{new Date(contact.createdAt).toLocaleString()}</p>
    </div>
  );
}

function EventContactDetail({ contact, updating, onStatusChange, onAddStudent, onClose }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white">{contact.name}</h2>
          <p className="text-sm text-slate-400">{contact.email}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <InfoRow label="Reg. No" value={contact.regno} />
        <InfoRow label="Branch" value={contact.branch} />
        <InfoRow label="College" value={contact.college} />
        <InfoRow label="Event" value={contact.eventTitle} />
        <InfoRow label="Received" value={new Date(contact.createdAt).toLocaleString()} />
        <InfoRow label="Status" value={contact.status} />
      </div>

      {contact.message && (
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">Message</p>
          <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
            {contact.message}
          </div>
        </div>
      )}

      <div className="mt-auto space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Update Status</p>
          <div className="flex gap-2">
            {["unread", "read", "handled"].map(s => (
              <button key={s} onClick={() => onStatusChange(s)} disabled={updating || contact.status === s}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${contact.status === s
                  ? "bg-white/5 text-slate-600 cursor-not-allowed"
                  : "bg-blue-600/80 hover:bg-blue-600 text-white"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onAddStudent}
          disabled={updating || !contact.regno || !contact.name}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${(updating || !contact.regno) ? "bg-white/5 text-slate-600 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-500 text-white"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add as Student
        </button>

        <a href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.eventTitle || "")}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Reply via Email
        </a>
      </div>
    </div>
  );
}

function ApplicationCard({ app, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white/3 border rounded-xl p-4 cursor-pointer transition-all duration-150 ${selected
        ? "border-purple-500 shadow-lg shadow-purple-500/20 bg-purple-900/10"
        : "border-white/10 hover:border-purple-900/50 hover:bg-white/5"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate flex items-center gap-2">
            {app.name}
            {app.status === "unread" && <span className="inline-block w-2 h-2 bg-purple-400 rounded-full shrink-0" />}
          </h3>
          <p className="text-sm text-slate-400 truncate">{app.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={app.status} />
          {app.status !== "handled" && <Badge color="purple">Pending</Badge>}
        </div>
      </div>
      {app.college && <p className="text-xs text-slate-500">{app.college}</p>}
      <p className="text-xs text-slate-600 mt-1">{new Date(app.createdAt).toLocaleString()}</p>
    </div>
  );
}

function ApplicationDetail({ app, updating, onStatusChange, onPromote, onClose }) {
  // Parse message back into key-value pairs if possible
  const parseMessage = (msg = "") => {
    const lines = msg.split("\n");
    const fields = {};
    let reasonLines = [];
    let inReason = false;
    for (const line of lines) {
      if (inReason) { reasonLines.push(line); continue; }
      if (line.startsWith("Why I want")) { inReason = true; continue; }
      const colon = line.indexOf(":");
      if (colon > -1) {
        const key = line.slice(0, colon).trim();
        const val = line.slice(colon + 1).trim();
        if (val && val !== "N/A") fields[key] = val;
      }
    }
    return { fields, reason: reasonLines.join("\n").trim() };
  };

  const { fields, reason } = parseMessage(app.message);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white">{app.name}</h2>
            {app.status !== "handled" && <Badge color="purple">Pending Review</Badge>}
            {app.status === "handled" && <Badge color="green">Approved</Badge>}
          </div>
          <p className="text-sm text-slate-400">{app.email}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">✕</button>
      </div>

      {/* Application fields */}
      <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-4">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-3 font-medium">Applicant Details</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <InfoRow label="College" value={app.college} />
          <InfoRow label="Department" value={app.branch} />
          <InfoRow label="Submitted" value={new Date(app.createdAt).toLocaleString()} />
          {fields["Phone"] && <InfoRow label="Phone" value={fields["Phone"]} />}
          {fields["LinkedIn"] && <InfoRow label="LinkedIn" value={fields["LinkedIn"]} />}
          {fields["Years of Experience"] && <InfoRow label="Experience" value={fields["Years of Experience"]} />}
          {fields["Events Planned to Host"] && <InfoRow label="Plans to Host" value={fields["Events Planned to Host"]} />}
        </div>
      </div>

      {/* Motivation */}
      {reason && (
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">Motivation</p>
          <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-sm text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed">
            {reason}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Update Status</p>
          <div className="flex gap-2">
            {["unread", "read", "handled"].map(s => (
              <button key={s} onClick={() => onStatusChange(s)} disabled={updating || app.status === s}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${app.status === s
                  ? "bg-white/5 text-slate-600 cursor-not-allowed"
                  : "bg-purple-700/70 hover:bg-purple-600 text-white"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onPromote}
          disabled={updating || app.status === "handled"}
          className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${(updating || app.status === "handled")
            ? "bg-white/5 text-slate-600 cursor-not-allowed"
            : "bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-lg shadow-green-900/30"}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {app.status === "handled" ? "Already Approved" : "Approve & Promote to Member"}
        </button>

        <a href={`mailto:${app.email}?subject=Re: Your Organizer Application`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Reply via Email
        </a>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl p-12 text-center">
      <svg className="w-14 h-14 mx-auto mb-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <p className="text-slate-500">{message}</p>
    </div>
  );
}

function SelectHint({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}
