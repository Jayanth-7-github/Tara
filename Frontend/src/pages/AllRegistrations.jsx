import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEvents } from "../services/api";
import { checkLogin } from "../services/auth";
import toast, { Toaster } from "react-hot-toast";
import {
  softDeleteRegistration,
  undoDeleteRegistration,
  permanentDeleteRegistration,
  getDeletedRegistrations,
} from "../services/api";

export default function AllRegistrations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [managedEvents, setManagedEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [selectedRegs, setSelectedRegs] = useState([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [deletedRegs, setDeletedRegs] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [selectedDeletedRegs, setSelectedDeletedRegs] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletedSearchTerm, setDeletedSearchTerm] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const auth = await checkLogin();
        if (!auth.authenticated) {
          navigate("/login");
          return;
        }

        // Fetch events
        const evData = await fetchEvents();
        if (!mounted) return;

        const allEvents = evData.events || evData || [];
        const userEmail = (auth.user.email || "").toLowerCase().trim();
        // Filter events managed by this user
        const myEvents = allEvents.filter((ev) => {
          const managerEmail = (ev.managerEmail || "").toLowerCase().trim();
          return managerEmail === userEmail;
        });
        setManagedEvents(myEvents);
        setSelectedEventId("all");

        const list = [];
        // Iterate only my events
        myEvents.forEach((ev) => {
          if (ev.registeredStudents && Array.isArray(ev.registeredStudents)) {
            ev.registeredStudents.forEach((student) => {
              list.push({
                studentId: student._id,
                regNo: student.regno,
                name: student.name,
                email: student.email,
                department: student.department,
                year: student.year,
                college: student.college,
                eventTitle: ev.title,
                eventId: ev._id || ev.id,
                registeredAt: student.registeredAt,
              });
            });
          }
        });

        setRegistrations(list);
      } catch (err) {
        console.error("Failed to load registrations:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, [navigate]);

  const handleSoftDelete = async (studentId, eventId, name) => {
    toast(
      (t) => (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
          <p className="text-gray-100 mb-2 font-medium">
            Delete student <strong className="text-white">{name}</strong>?
          </p>
          <p className="text-gray-300 text-sm mb-3">
            They will be moved to Deleted Students and can be restored later.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                performSoftDelete(studentId, eventId, name);
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-gray-200 rounded text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: "top-center",
        style: {
          background: "transparent",
          boxShadow: "none",
        },
      },
    );
  };

  const performSoftDelete = async (studentId, eventId, name) => {
    try {
      setDeleting(true);
      await softDeleteRegistration(studentId, eventId);
      // Remove from current list
      setRegistrations((prev) =>
        prev.filter(
          (r) => !(r.studentId === studentId && r.eventId === eventId),
        ),
      );
      // Show success toast with undo
      toast.success(`Student ${name} moved to Deleted Students`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => handleUndoDelete(studentId, eventId, name),
        },
      });
    } catch (err) {
      toast.error("Failed to delete student");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleUndoDelete = async (studentId, eventId, name) => {
    try {
      await undoDeleteRegistration(studentId, eventId);
      // Refresh the list
      window.location.reload(); // Simple way, or refetch
      toast.success(`Student ${name} restored`);
    } catch (err) {
      toast.error("Failed to restore student");
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRegs.length === 0) return;
    toast(
      (t) => (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
          <p className="text-gray-100 mb-2 font-medium">
            Delete {selectedRegs.length} selected student
            {selectedRegs.length > 1 ? "s" : ""}?
          </p>
          <p className="text-gray-300 text-sm mb-3">
            They will be moved to Deleted Students and can be restored later.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                performBulkDelete();
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
            >
              Delete All
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-gray-200 rounded text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: "top-center",
        style: {
          background: "transparent",
          boxShadow: "none",
        },
      },
    );
  };

  const performBulkDelete = async () => {
    if (selectedRegs.length === 0) return;
    try {
      setDeleting(true);
      const promises = selectedRegs.map(({ studentId, eventId }) =>
        softDeleteRegistration(studentId, eventId),
      );
      await Promise.all(promises);
      // Remove from list
      setRegistrations((prev) =>
        prev.filter(
          (r) =>
            !selectedRegs.some(
              (sel) =>
                sel.studentId === r.studentId && sel.eventId === r.eventId,
            ),
        ),
      );
      toast.success(
        `${selectedRegs.length} students moved to Deleted Students`,
        {
          duration: 5000,
          action: {
            label: "Undo All",
            onClick: () => handleBulkUndo(),
          },
        },
      );
      setSelectedRegs([]);
    } catch (err) {
      toast.error("Failed to delete selected students");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkUndo = async () => {
    try {
      const promises = selectedRegs.map(({ studentId, eventId }) =>
        undoDeleteRegistration(studentId, eventId),
      );
      await Promise.all(promises);
      window.location.reload();
      toast.success("All students restored");
    } catch (err) {
      toast.error("Failed to restore students");
      console.error(err);
    }
  };

  const handleSelectReg = (studentId, eventId, checked) => {
    if (checked) {
      setSelectedRegs((prev) => [...prev, { studentId, eventId }]);
    } else {
      setSelectedRegs((prev) =>
        prev.filter(
          (sel) => !(sel.studentId === studentId && sel.eventId === eventId),
        ),
      );
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRegs(
        visibleRegistrations.map((r) => ({
          studentId: r.studentId,
          eventId: r.eventId,
        })),
      );
    } else {
      setSelectedRegs([]);
    }
  };

  const loadDeleted = async () => {
    try {
      const data = await getDeletedRegistrations();
      setDeletedRegs(data.deletedRegistrations || []);
    } catch (err) {
      console.error("Failed to load deleted registrations:", err);
      toast.error("Failed to load deleted students");
    }
  };

  const handleRestoreDeleted = async (studentId, eventId, name) => {
    try {
      await undoDeleteRegistration(studentId, eventId);
      setDeletedRegs((prev) =>
        prev.filter(
          (r) => !(r.studentId === studentId && r.eventId === eventId),
        ),
      );
      toast.success(`Student ${name} restored`);
      // Refresh main list
      window.location.reload();
    } catch (err) {
      toast.error("Failed to restore student");
      console.error(err);
    }
  };

  const handlePermanentDelete = async (studentId, eventId, name) => {
    toast(
      (t) => (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
          <p className="text-gray-100 mb-2 font-medium">
            Permanently delete <strong className="text-white">{name}</strong>?
          </p>
          <p className="text-red-300 text-sm mb-3 font-medium">
            This action cannot be undone!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                performPermanentDelete(studentId, eventId, name);
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
            >
              Delete Forever
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-gray-200 rounded text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: "top-center",
        style: {
          background: "transparent",
          boxShadow: "none",
        },
      },
    );
  };

  const performPermanentDelete = async (studentId, eventId, name) => {
    try {
      await permanentDeleteRegistration(studentId, eventId);
      setDeletedRegs((prev) =>
        prev.filter(
          (r) => !(r.studentId === studentId && r.eventId === eventId),
        ),
      );
      toast.success(`Student ${name} permanently deleted`);
    } catch (err) {
      toast.error("Failed to permanently delete student");
      console.error(err);
    }
  };

  const handleSelectDeletedReg = (studentId, eventId, checked) => {
    if (checked) {
      setSelectedDeletedRegs((prev) => [...prev, { studentId, eventId }]);
    } else {
      setSelectedDeletedRegs((prev) =>
        prev.filter(
          (sel) => !(sel.studentId === studentId && sel.eventId === eventId),
        ),
      );
    }
  };

  const handleSelectAllDeleted = (checked) => {
    if (checked) {
      setSelectedDeletedRegs(
        visibleDeletedRegs.map((r) => ({
          studentId: r.studentId,
          eventId: r.eventId,
        })),
      );
    } else {
      setSelectedDeletedRegs([]);
    }
  };

  const handleBulkRestoreDeleted = async () => {
    if (selectedDeletedRegs.length === 0) return;
    try {
      setDeleting(true);
      const promises = selectedDeletedRegs.map(({ studentId, eventId }) =>
        undoDeleteRegistration(studentId, eventId),
      );
      await Promise.all(promises);
      setDeletedRegs((prev) =>
        prev.filter(
          (r) =>
            !selectedDeletedRegs.some(
              (sel) =>
                sel.studentId === r.studentId && sel.eventId === r.eventId,
            ),
        ),
      );
      toast.success(`${selectedDeletedRegs.length} students restored`);
      setSelectedDeletedRegs([]);
      // Refresh main list
      window.location.reload();
    } catch (err) {
      toast.error("Failed to restore selected students");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedDeletedRegs.length === 0) return;
    toast(
      (t) => (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
          <p className="text-gray-100 mb-2 font-medium">
            Permanently delete {selectedDeletedRegs.length} selected student
            {selectedDeletedRegs.length > 1 ? "s" : ""}?
          </p>
          <p className="text-red-300 text-sm mb-3 font-medium">
            This action cannot be undone!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                performBulkPermanentDelete();
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
            >
              Delete Forever
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-gray-200 rounded text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: "top-center",
        style: {
          background: "transparent",
          boxShadow: "none",
        },
      },
    );
  };

  const performBulkPermanentDelete = async () => {
    if (selectedDeletedRegs.length === 0) return;
    try {
      setDeleting(true);
      const promises = selectedDeletedRegs.map(({ studentId, eventId }) =>
        permanentDeleteRegistration(studentId, eventId),
      );
      await Promise.all(promises);
      setDeletedRegs((prev) =>
        prev.filter(
          (r) =>
            !selectedDeletedRegs.some(
              (sel) =>
                sel.studentId === r.studentId && sel.eventId === r.eventId,
            ),
        ),
      );
      toast.success(
        `${selectedDeletedRegs.length} students permanently deleted`,
      );
      setSelectedDeletedRegs([]);
    } catch (err) {
      toast.error("Failed to permanently delete selected students");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const visibleRegistrations = (() => {
    let filtered =
      selectedEventId === "all"
        ? registrations
        : registrations.filter((reg) => reg.eventId === selectedEventId);

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (reg) =>
          reg.name?.toLowerCase().includes(term) ||
          reg.regNo?.toLowerCase().includes(term) ||
          reg.email?.toLowerCase().includes(term) ||
          reg.eventTitle?.toLowerCase().includes(term) ||
          reg.department?.toLowerCase().includes(term) ||
          reg.college?.toLowerCase().includes(term),
      );
    }

    return filtered;
  })();

  const visibleDeletedRegs = (() => {
    let filtered = deletedRegs;

    // Apply search filter
    if (deletedSearchTerm.trim()) {
      const term = deletedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (reg) =>
          reg.name?.toLowerCase().includes(term) ||
          reg.regno?.toLowerCase().includes(term) ||
          reg.email?.toLowerCase().includes(term) ||
          reg.eventTitle?.toLowerCase().includes(term) ||
          reg.department?.toLowerCase().includes(term) ||
          reg.college?.toLowerCase().includes(term),
      );
    }

    return filtered;
  })();

  const selectedEvent = managedEvents.find(
    (event) => String(event._id || event.id) === selectedEventId,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading registrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                All Registrations
              </h1>
              {deleteMode && (
                <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                  DELETE MODE
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-1">
              {selectedEvent
                ? `${selectedEvent.title} • ${visibleRegistrations.length} Records`
                : `Across all your events • ${visibleRegistrations.length} Records`}
              {searchTerm.trim() && (
                <span className="text-blue-400 ml-2">
                  (filtered from{" "}
                  {selectedEventId === "all"
                    ? registrations.length
                    : registrations.filter(
                        (reg) => reg.eventId === selectedEventId,
                      ).length}{" "}
                  total)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDeleteMode(!deleteMode);
                setSelectedRegs([]); // Clear selection when toggling mode
              }}
              className={`px-4 py-2 rounded-lg transition text-sm ${
                deleteMode
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              {deleteMode ? "Exit Delete Mode" : "Delete Mode"}
            </button>
            <button
              onClick={() => {
                loadDeleted();
                setShowDeletedModal(true);
                setSelectedDeletedRegs([]); // Clear selection when opening
                setDeletedSearchTerm(""); // Clear search when opening
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
            >
              View Deleted Students
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm flex items-center gap-2"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                Search Students
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Search by name, registration number, email, or department.
              </p>
              <div className="mt-2 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 pl-10 pr-10 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="md:ml-6 md:min-w-[300px]">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                Filter By Event
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Choose from events created by you.
              </p>
              <select
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
                disabled={managedEvents.length === 0}
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="all">All My Events</option>
                {managedEvents.map((event) => {
                  const eventId = String(event._id || event.id);
                  return (
                    <option key={eventId} value={eventId}>
                      {event.title}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {deleteMode && selectedRegs.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-900/20 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-red-400">
                {selectedRegs.length} student
                {selectedRegs.length > 1 ? "s" : ""} selected
              </p>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition text-sm"
              >
                {deleting ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          </div>
        )}

        <div
          className={`bg-gray-800/50 backdrop-blur border rounded-xl overflow-hidden ${
            deleteMode ? "border-red-500/50 bg-red-900/10" : "border-gray-700"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-800 text-gray-400 text-xs font-medium uppercase tracking-wider">
                <tr>
                  {deleteMode && (
                    <th className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={
                          selectedRegs.length === visibleRegistrations.length &&
                          visibleRegistrations.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-600"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Reg No</th>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Registered At</th>
                  {deleteMode && <th className="px-6 py-4">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {visibleRegistrations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={deleteMode ? "7" : "6"}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {managedEvents.length === 0
                        ? "No created events found."
                        : "No registrations found for the selected event."}
                    </td>
                  </tr>
                ) : (
                  visibleRegistrations.map((reg, index) => {
                    const isSelected = selectedRegs.some(
                      (sel) =>
                        sel.studentId === reg.studentId &&
                        sel.eventId === reg.eventId,
                    );
                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-700/30 transition"
                      >
                        {deleteMode && (
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                handleSelectReg(
                                  reg.studentId,
                                  reg.eventId,
                                  e.target.checked,
                                )
                              }
                              className="rounded border-gray-600"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 font-medium text-white">
                          <div className="flex flex-col">
                            <span>{reg.name || "Unknown"}</span>
                            <span className="text-xs text-gray-500">
                              {reg.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{reg.regNo}</td>
                        <td className="px-6 py-4 text-blue-400">
                          {reg.eventTitle}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {reg.department ? `${reg.department}, ` : ""}
                          {reg.year ? `Year ${reg.year}` : ""}
                          {reg.college ? (
                            <div className="text-gray-500">{reg.college}</div>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {reg.registeredAt
                            ? new Date(reg.registeredAt).toLocaleDateString()
                            : "-"}
                        </td>
                        {deleteMode && (
                          <td className="px-6 py-4">
                            <button
                              onClick={() =>
                                handleSoftDelete(
                                  reg.studentId,
                                  reg.eventId,
                                  reg.name,
                                )
                              }
                              disabled={deleting}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deleted Students Modal */}
      {showDeletedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Deleted Students
                </h2>
                <button
                  onClick={() => {
                    setShowDeletedModal(false);
                    setSelectedDeletedRegs([]);
                    setDeletedSearchTerm("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {deletedRegs.length === 0 ? (
                <p className="text-gray-400 text-center">
                  No deleted students found.
                </p>
              ) : (
                <>
                  {/* Search for deleted students */}
                  <div className="mb-4">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={deletedSearchTerm}
                        onChange={(e) => setDeletedSearchTerm(e.target.value)}
                        placeholder="Search deleted students..."
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 pl-10 pr-10 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                      />
                      {deletedSearchTerm && (
                        <button
                          onClick={() => setDeletedSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedDeletedRegs.length > 0 && (
                    <div className="mb-4 rounded-xl border border-blue-700 bg-blue-900/20 p-4 backdrop-blur">
                      <div className="flex items-center justify-between">
                        <p className="text-blue-400">
                          {selectedDeletedRegs.length} student
                          {selectedDeletedRegs.length > 1 ? "s" : ""} selected
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleBulkRestoreDeleted}
                            disabled={deleting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition text-sm"
                          >
                            {deleting ? "Restoring..." : "Restore Selected"}
                          </button>
                          <button
                            onClick={handleBulkPermanentDelete}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition text-sm"
                          >
                            {deleting ? "Deleting..." : "Delete Permanently"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          selectedDeletedRegs.length ===
                            visibleDeletedRegs.length &&
                          visibleDeletedRegs.length > 0
                        }
                        onChange={(e) =>
                          handleSelectAllDeleted(e.target.checked)
                        }
                        className="rounded border-gray-600"
                      />
                      <span className="text-sm text-gray-400">
                        Select All{" "}
                        {visibleDeletedRegs.length > deletedRegs.length
                          ? `(showing ${visibleDeletedRegs.length} of ${deletedRegs.length})`
                          : ""}
                      </span>
                    </label>
                  </div>
                  <div className="space-y-4">
                    {visibleDeletedRegs.map((reg, index) => {
                      const isSelected = selectedDeletedRegs.some(
                        (sel) =>
                          sel.studentId === reg.studentId &&
                          sel.eventId === reg.eventId,
                      );
                      return (
                        <div key={index} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  handleSelectDeletedReg(
                                    reg.studentId,
                                    reg.eventId,
                                    e.target.checked,
                                  )
                                }
                                className="rounded border-gray-600"
                              />
                              <div>
                                <h3 className="text-white font-medium">
                                  {reg.name}
                                </h3>
                                <p className="text-gray-400 text-sm">
                                  {reg.regno} • {reg.email}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {reg.eventTitle} • Deleted{" "}
                                  {new Date(reg.deletedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleRestoreDeleted(
                                    reg.studentId,
                                    reg.eventId,
                                    reg.name,
                                  )
                                }
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() =>
                                  handlePermanentDelete(
                                    reg.studentId,
                                    reg.eventId,
                                    reg.name,
                                  )
                                }
                                className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm"
                              >
                                Delete Permanently
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
