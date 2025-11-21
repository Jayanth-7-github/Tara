import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkLogin } from "../services/auth";
import {
  getMyContacts,
  updateContactStatus,
  addContactAsStudent,
} from "../services/api";

export default function EventContacts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [filter, setFilter] = useState("all"); // all, unread, read, handled
  const [selectedContact, setSelectedContact] = useState(null);
  const [updating, setUpdating] = useState(false);

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
        const user = res.user || {};
        const role = user.role;
        // Only admins, members, and event managers can access
        if (role === "admin" || role === "member") {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (mounted) navigate("/login", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    verify();
    return () => (mounted = false);
  }, [navigate]);

  useEffect(() => {
    if (!authorized) return;
    let mounted = true;
    const load = async () => {
      try {
        const data = await getMyContacts();
        if (mounted) setContacts(data.contacts || []);
      } catch (err) {
        console.error("Failed to load contacts:", err);
        if (mounted) setContacts([]);
      }
    };
    load();
    return () => (mounted = false);
  }, [authorized]);

  const handleStatusChange = async (contactId, newStatus) => {
    try {
      setUpdating(true);
      await updateContactStatus(contactId, newStatus);
      // Update local state
      setContacts((prev) =>
        prev.map((c) => (c._id === contactId ? { ...c, status: newStatus } : c))
      );
      if (selectedContact && selectedContact._id === contactId) {
        setSelectedContact({ ...selectedContact, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert(err.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddAsStudent = async (contactId) => {
    const contact = contacts.find((c) => c._id === contactId);
    if (!contact) return;

    if (
      !confirm(
        `Add ${contact.name} (${contact.regno}) as a student for "${contact.eventTitle}"?`
      )
    ) {
      return;
    }

    try {
      setUpdating(true);
      const result = await addContactAsStudent(contactId);
      alert(result.message || "Student added successfully");
      // Update contact status to handled
      setContacts((prev) =>
        prev.map((c) => (c._id === contactId ? { ...c, status: "handled" } : c))
      );
      if (selectedContact && selectedContact._id === contactId) {
        setSelectedContact({ ...selectedContact, status: "handled" });
      }
    } catch (err) {
      console.error("Failed to add student:", err);
      alert(err.message || "Failed to add student");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4">Unauthorized</h2>
          <p className="text-gray-400">
            You must be an event manager or admin to view contacts.
          </p>
        </div>
      </div>
    );
  }

  const filteredContacts =
    filter === "all" ? contacts : contacts.filter((c) => c.status === filter);

  const unreadCount = contacts.filter((c) => c.status === "unread").length;
  const readCount = contacts.filter((c) => c.status === "read").length;
  const handledCount = contacts.filter((c) => c.status === "handled").length;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Event Contact Messages
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            View and manage contact messages for your events
          </p>
        </header>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: "All", value: "all", count: contacts.length },
            { label: "Unread", value: "unread", count: unreadCount },
            { label: "Read", value: "read", count: readCount },
            { label: "Handled", value: "handled", count: handledCount },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === tab.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tab.label} <span className="opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        {filteredContacts.length === 0 ? (
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">No contact messages found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contacts list */}
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => setSelectedContact(contact)}
                  className={`bg-gray-900/70 border rounded-xl p-4 cursor-pointer transition ${
                    selectedContact?._id === contact._id
                      ? "border-blue-500 shadow-lg shadow-blue-500/20"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        {contact.name}
                        {contact.status === "unread" && (
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-400">{contact.email}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        contact.status === "unread"
                          ? "bg-blue-900/50 text-blue-300"
                          : contact.status === "read"
                          ? "bg-yellow-900/50 text-yellow-300"
                          : "bg-green-900/50 text-green-300"
                      }`}
                    >
                      {contact.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    Event:{" "}
                    <span className="text-gray-300">{contact.eventTitle}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(contact.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Contact details */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 sticky top-6">
              {selectedContact ? (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">
                        {selectedContact.name}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {selectedContact.email}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedContact(null)}
                      className="text-gray-400 hover:text-white"
                      aria-label="Close details"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 mb-6">
                    {selectedContact.regno && (
                      <div>
                        <span className="text-xs text-gray-500">Regno:</span>
                        <p className="text-white">{selectedContact.regno}</p>
                      </div>
                    )}
                    {selectedContact.branch && (
                      <div>
                        <span className="text-xs text-gray-500">Branch:</span>
                        <p className="text-white">{selectedContact.branch}</p>
                      </div>
                    )}
                    {selectedContact.college && (
                      <div>
                        <span className="text-xs text-gray-500">College:</span>
                        <p className="text-white">{selectedContact.college}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-500">Event:</span>
                      <p className="text-white">{selectedContact.eventTitle}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Received:</span>
                      <p className="text-white">
                        {new Date(selectedContact.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <span className="text-xs text-gray-500 block mb-2">
                      Message:
                    </span>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap border border-gray-700">
                      {selectedContact.message || "(No message provided)"}
                    </div>
                  </div>

                  {/* Status update buttons */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-2">Update status:</p>
                    <div className="flex gap-2">
                      {["unread", "read", "handled"].map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            handleStatusChange(selectedContact._id, status)
                          }
                          disabled={
                            updating || selectedContact.status === status
                          }
                          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                            selectedContact.status === status
                              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          } ${updating ? "opacity-50 cursor-wait" : ""}`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact actions */}
                  <div className="mt-6 pt-6 border-t border-gray-700 space-y-3">
                    <button
                      onClick={() => handleAddAsStudent(selectedContact._id)}
                      disabled={
                        updating ||
                        !selectedContact.regno ||
                        !selectedContact.name
                      }
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition ${
                        updating ||
                        !selectedContact.regno ||
                        !selectedContact.name
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                      title={
                        !selectedContact.regno || !selectedContact.name
                          ? "Contact missing regno or name"
                          : "Add this contact as a student for the event"
                      }
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          />
                        </svg>
                        Add as Student for Event
                      </div>
                    </button>
                    <a
                      href={`mailto:${
                        selectedContact.email
                      }?subject=Re: ${encodeURIComponent(
                        selectedContact.eventTitle
                      )}`}
                      className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Reply via Email
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <p className="text-gray-400">
                    Select a contact to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
