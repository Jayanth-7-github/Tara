import React, { useState, useEffect } from "react";
import { getMyContacts, approveContact, rejectContact } from "../services/api";
import { getMe } from "../services/auth";

export default function ManageApprovals() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending"); // pending, approved, rejected
  const [actionInProgress, setActionInProgress] = useState({});

  // Check if user is logged in and is admin/event manager
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const role = me?.user?.role || me?.role || "";
        setUserRole(role);
        if (role !== "admin") {
          // Non-admins can still see their own managed events' contacts
        }
      } catch (err) {
        setError("Please log in to manage approvals");
      }
    })();
  }, []);

  // Load contacts
  useEffect(() => {
    if (!userRole) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await getMyContacts();
        if (mounted) {
          setContacts(resp.contacts || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load contacts");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => (mounted = false);
  }, [userRole]);

  const handleApprove = async (contactId) => {
    setActionInProgress((prev) => ({ ...prev, [contactId]: "approving" }));
    try {
      await approveContact(contactId);
      setContacts((prev) =>
        prev.map((c) =>
          c._id === contactId ? { ...c, approved: true, status: "read" } : c,
        ),
      );
    } catch (err) {
      setError(err.message || "Failed to approve contact");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [contactId]: null }));
    }
  };

  const handleReject = async (contactId) => {
    setActionInProgress((prev) => ({ ...prev, [contactId]: "rejecting" }));
    try {
      await rejectContact(contactId);
      setContacts((prev) =>
        prev.map((c) =>
          c._id === contactId
            ? { ...c, approved: false, status: "handled" }
            : c,
        ),
      );
    } catch (err) {
      setError(err.message || "Failed to reject contact");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [contactId]: null }));
    }
  };

  // Filter contacts based on approval status
  const filteredContacts = contacts.filter((c) => {
    if (filterStatus === "pending")
      return c.status === "unread" || c.status === "read";
    if (filterStatus === "approved") return c.approved === true;
    if (filterStatus === "rejected")
      return c.approved === false && c.status === "handled";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Manage Approvals</h1>
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading requests...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Manage Approvals</h1>
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-200">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Manage Event Registration Requests
        </h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 font-semibold transition ${
              filterStatus === "pending"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Pending (
            {
              contacts.filter(
                (c) => c.status === "unread" || c.status === "read",
              ).length
            }
            )
          </button>
          <button
            onClick={() => setFilterStatus("approved")}
            className={`px-4 py-2 font-semibold transition ${
              filterStatus === "approved"
                ? "border-b-2 border-green-500 text-green-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Approved ({contacts.filter((c) => c.approved === true).length})
          </button>
          <button
            onClick={() => setFilterStatus("rejected")}
            className={`px-4 py-2 font-semibold transition ${
              filterStatus === "rejected"
                ? "border-b-2 border-red-500 text-red-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Rejected (
            {
              contacts.filter(
                (c) => c.approved === false && c.status === "handled",
              ).length
            }
            )
          </button>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {filterStatus === "pending" && "No pending requests"}
              {filterStatus === "approved" && "No approved requests"}
              {filterStatus === "rejected" && "No rejected requests"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact._id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:bg-gray-800 transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-blue-400 mb-1">
                      {contact.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2">
                      {contact.eventTitle}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                      {contact.regno && (
                        <p>
                          <span className="text-gray-500">Reg No:</span>{" "}
                          {contact.regno}
                        </p>
                      )}
                      <p>
                        <span className="text-gray-500">Email:</span>{" "}
                        {contact.email}
                      </p>
                      {contact.branch && (
                        <p>
                          <span className="text-gray-500">Branch:</span>{" "}
                          {contact.branch}
                        </p>
                      )}
                      {contact.college && (
                        <p>
                          <span className="text-gray-500">College:</span>{" "}
                          {contact.college}
                        </p>
                      )}
                    </div>
                    {contact.message && (
                      <div className="mt-3 p-3 bg-gray-800 rounded text-sm text-gray-300 border-l-2 border-blue-500">
                        <p className="text-gray-500 text-xs uppercase font-semibold mb-1">
                          Message
                        </p>
                        <p>{contact.message}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-3">
                      Requested on{" "}
                      {new Date(contact.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {contact.approved ? (
                      <span className="px-3 py-1 bg-green-700 text-green-100 rounded text-sm font-semibold">
                        ✓ Approved
                      </span>
                    ) : contact.status === "handled" ? (
                      <span className="px-3 py-1 bg-red-700 text-red-100 rounded text-sm font-semibold">
                        ✕ Rejected
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(contact._id)}
                          disabled={actionInProgress[contact._id]}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded text-sm font-semibold transition"
                        >
                          {actionInProgress[contact._id] === "approving"
                            ? "Approving..."
                            : "Approve"}
                        </button>
                        <button
                          onClick={() => handleReject(contact._id)}
                          disabled={actionInProgress[contact._id]}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded text-sm font-semibold transition"
                        >
                          {actionInProgress[contact._id] === "rejecting"
                            ? "Rejecting..."
                            : "Reject"}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {contact.approved ? (
                      <span className="px-3 py-1 bg-green-700 text-green-100 rounded text-sm font-semibold">
                        Approved
                      </span>
                    ) : contact.status === "handled" ? (
                      <>
                        <span className="px-3 py-1 bg-red-700 text-red-100 rounded text-sm font-semibold">
                          Rejected
                        </span>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "This request was previously rejected. Do you want to change it to approved?",
                              )
                            ) {
                              handleApprove(contact._id);
                            }
                          }}
                          disabled={actionInProgress[contact._id]}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded text-sm font-semibold transition"
                        >
                          {actionInProgress[contact._id] === "approving"
                            ? "Changing..."
                            : "Change to Approved"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(contact._id)}
                          disabled={actionInProgress[contact._id]}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded text-sm font-semibold transition"
                        >
                          {actionInProgress[contact._id] === "approving"
                            ? "Approving..."
                            : "Approve"}
                        </button>
                        <button
                          onClick={() => handleReject(contact._id)}
                          disabled={actionInProgress[contact._id]}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded text-sm font-semibold transition"
                        >
                          {actionInProgress[contact._id] === "rejecting"
                            ? "Rejecting..."
                            : "Reject"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
