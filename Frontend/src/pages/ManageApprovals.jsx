import React, { useEffect, useMemo, useState } from "react";
import {
  approveContact,
  createPaymentQr,
  deletePaymentQr,
  fetchEvents,
  fetchPaymentVerifications,
  fetchPaymentQrs,
  getMyContacts,
  rejectContact,
  reviewPaymentVerification,
  togglePaymentQrStatus,
} from "../services/api";
import { checkLogin } from "../services/auth";

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function getEventId(event) {
  return event?._id || event?.id || "";
}

function formatDateTime(value) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleString();
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getVerificationHeadline(item) {
  if (item?.registrationType === "team") {
    return item?.teamName || "Unnamed team";
  }
  return item?.participant?.name || "Participant";
}

function getVerificationStatusClass(status) {
  if (status === "approved") {
    return "bg-emerald-500/15 text-emerald-200";
  }
  if (status === "rejected") {
    return "bg-red-500/15 text-red-200";
  }
  return "bg-amber-500/15 text-amber-200";
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

function ViewSwitch({ value, onChange }) {
  const items = [
    { value: "approvals", label: "Approvals" },
    { value: "paymentVerification", label: "Payment Verification" },
    { value: "paymentQrs", label: "Payment QRs" },
  ];

  return (
    <div className="inline-flex rounded-2xl border border-neutral-800 bg-neutral-900/80 p-1">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-cyan-500 text-slate-950"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function SummaryCard({ title, value, subtitle, tone = "cyan" }) {
  const toneClasses = {
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 shadow-lg shadow-black/10">
      <div
        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${toneClasses[tone] || toneClasses.cyan}`}
      >
        {title}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
    </div>
  );
}

function PaymentQrModal({
  open,
  form,
  saving,
  onChange,
  onFileChange,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              Payment QR
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Add new QR
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Upload a payment QR for this event. Turning it on will switch off
              the other QRs for the same event.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-800 px-3 py-2 text-sm text-neutral-400 transition hover:border-neutral-700 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="scrollbar-hidden flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-200">
              QR title
            </span>
            <input
              value={form.title}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="Payment QR 1"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-200">
              QR image
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="block w-full cursor-pointer rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 px-4 py-4 text-sm text-neutral-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:border-neutral-600"
            />
          </label>

          {form.preview && (
            <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-white p-4">
              <img
                src={form.preview}
                alt="QR preview"
                className="mx-auto max-h-72 w-auto object-contain"
              />
            </div>
          )}

          <label className="flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onChange("isActive", event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-950 text-cyan-500"
            />
            <span>Make this the active QR immediately.</span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-neutral-800 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-700 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add QR"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManageApprovals() {
  const [viewMode, setViewMode] = useState("approvals");
  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [paymentVerifications, setPaymentVerifications] = useState([]);
  const [paymentQrs, setPaymentQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [verificationFilter, setVerificationFilter] = useState("submitted");
  const [verificationSearch, setVerificationSearch] = useState("");
  const [actionInProgress, setActionInProgress] = useState({});
  const [selectedEventId, setSelectedEventId] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrForm, setQrForm] = useState({
    title: "",
    file: null,
    preview: "",
    isActive: true,
  });

  const isAdmin = userRole === "admin";

  const managedEvents = useMemo(
    () => getManagedEvents(events, authData),
    [events, authData],
  );

  const selectedEvent = useMemo(
    () => managedEvents.find((event) => getEventId(event) === selectedEventId),
    [managedEvents, selectedEventId],
  );

  const approvalScopedContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const managerEmail = String(contact.recipientEmail || "")
        .toLowerCase()
        .trim();
      if (!isAdmin && managerEmail !== userEmail) return false;
      return true;
    });
  }, [contacts, isAdmin, userEmail]);

  const approvalCounts = useMemo(() => {
    const pending = approvalScopedContacts.filter(
      (contact) => contact.status === "unread" || contact.status === "read",
    ).length;
    const approved = approvalScopedContacts.filter(
      (contact) => contact.approved === true,
    ).length;
    const rejected = approvalScopedContacts.filter(
      (contact) => contact.approved === false && contact.status === "handled",
    ).length;

    return {
      total: approvalScopedContacts.length,
      pending,
      approved,
      rejected,
    };
  }, [approvalScopedContacts]);

  const filteredContacts = useMemo(() => {
    return approvalScopedContacts.filter((contact) => {
      if (filterStatus === "pending") {
        return contact.status === "unread" || contact.status === "read";
      }
      if (filterStatus === "approved") {
        return contact.approved === true;
      }
      if (filterStatus === "rejected") {
        return contact.approved === false && contact.status === "handled";
      }
      return true;
    });
  }, [approvalScopedContacts, filterStatus]);

  const verificationCounts = useMemo(() => {
    return paymentVerifications.reduce(
      (accumulator, item) => {
        const status = item?.status || "submitted";
        if (status === "approved") accumulator.approved += 1;
        else if (status === "rejected") accumulator.rejected += 1;
        else accumulator.submitted += 1;
        return accumulator;
      },
      { submitted: 0, approved: 0, rejected: 0 },
    );
  }, [paymentVerifications]);

  const filteredPaymentVerifications = useMemo(() => {
    const searchTerm = verificationSearch.trim().toLowerCase();

    return paymentVerifications.filter((item) => {
      if (verificationFilter === "submitted")
        if (item.status !== "submitted") return false;
      if (verificationFilter === "approved")
        if (item.status !== "approved") return false;
      if (verificationFilter === "rejected")
        if (item.status !== "rejected") return false;

      if (!searchTerm) return true;

      const memberList = Array.isArray(item.members) ? item.members : [];
      const searchFields = [
        item.teamName,
        item.paymentReference,
        item.participant?.name,
        item.participant?.email,
        item.participant?.regno,
        item.participant?.branch,
        item.participant?.college,
        item.leader?.name,
        item.leader?.email,
        item.leader?.regno,
        ...memberList.flatMap((member) => [
          member?.name,
          member?.email,
          member?.regno,
        ]),
      ];

      return searchFields.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(searchTerm),
      );
    });
  }, [paymentVerifications, verificationFilter, verificationSearch]);

  const resetQrForm = () => {
    setQrForm({
      title: "",
      file: null,
      preview: "",
      isActive: true,
    });
  };

  const loadPaymentQrs = async (eventId) => {
    if (!eventId) {
      setPaymentQrs([]);
      return;
    }

    try {
      setQrLoading(true);
      const response = await fetchPaymentQrs(eventId);
      setPaymentQrs(response.items || []);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to load payment QRs.",
      });
      setPaymentQrs([]);
    } finally {
      setQrLoading(false);
    }
  };

  const loadPaymentVerifications = async (eventId) => {
    if (!eventId) {
      setPaymentVerifications([]);
      return;
    }

    try {
      setVerificationLoading(true);
      const response = await fetchPaymentVerifications(eventId);
      setPaymentVerifications(response.items || []);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to load payment verifications.",
      });
      setPaymentVerifications([]);
    } finally {
      setVerificationLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const auth = await checkLogin();
        if (!auth?.authenticated) {
          throw new Error("Please log in to manage approvals");
        }

        const user = auth.user || {};
        const email = String(user.email || "")
          .toLowerCase()
          .trim();

        const [contactsResponse, eventsResponse] = await Promise.all([
          getMyContacts(),
          fetchEvents(),
        ]);

        if (!mounted) return;

        const allEvents = eventsResponse?.events || eventsResponse || [];
        const nextManagedEvents = getManagedEvents(allEvents, auth);

        setAuthData(auth);
        setUserRole(String(user.role || "").toLowerCase());
        setUserEmail(email);
        setContacts(contactsResponse.contacts || []);
        setEvents(allEvents);
        setSelectedEventId((current) => {
          if (
            current &&
            nextManagedEvents.some((event) => getEventId(event) === current)
          ) {
            return current;
          }
          return getEventId(nextManagedEvents[0]);
        });
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load approvals workspace");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (viewMode !== "paymentQrs") return;
    if (!selectedEventId) {
      setPaymentQrs([]);
      return;
    }
    loadPaymentQrs(selectedEventId);
  }, [viewMode, selectedEventId]);

  useEffect(() => {
    if (viewMode !== "paymentVerification") return;
    if (!selectedEventId) {
      setPaymentVerifications([]);
      return;
    }
    loadPaymentVerifications(selectedEventId);
  }, [viewMode, selectedEventId]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    setVerificationSearch("");
  }, [selectedEventId]);

  const handleApprove = async (contactId) => {
    setActionInProgress((prev) => ({ ...prev, [contactId]: "approving" }));
    try {
      await approveContact(contactId);
      setContacts((prev) =>
        prev.map((contact) =>
          contact._id === contactId
            ? { ...contact, approved: true, status: "read" }
            : contact,
        ),
      );
      setMessage({ type: "success", text: "Request approved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to approve contact.",
      });
    } finally {
      setActionInProgress((prev) => ({ ...prev, [contactId]: null }));
    }
  };

  const handleReject = async (contactId) => {
    setActionInProgress((prev) => ({ ...prev, [contactId]: "rejecting" }));
    try {
      await rejectContact(contactId);
      setContacts((prev) =>
        prev.map((contact) =>
          contact._id === contactId
            ? { ...contact, approved: false, status: "handled" }
            : contact,
        ),
      );
      setMessage({ type: "success", text: "Request rejected." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to reject contact.",
      });
    } finally {
      setActionInProgress((prev) => ({ ...prev, [contactId]: null }));
    }
  };

  const handleQrFieldChange = (field, value) => {
    setQrForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleQrFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setQrForm((prev) => ({ ...prev, file: null, preview: "" }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 5MB." });
      event.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);
    setQrForm((prev) => ({ ...prev, file, preview }));
  };

  const handleCreateQr = async () => {
    if (!selectedEventId) {
      setMessage({ type: "error", text: "Choose an event first." });
      return;
    }

    if (!qrForm.title.trim()) {
      setMessage({ type: "error", text: "QR title is required." });
      return;
    }

    if (!qrForm.file) {
      setMessage({ type: "error", text: "Please upload a QR image." });
      return;
    }

    try {
      setQrSaving(true);
      const imageBase64 = await toBase64(qrForm.file);
      await createPaymentQr({
        eventId: selectedEventId,
        title: qrForm.title.trim(),
        imageBase64,
        imageType: qrForm.file.type || "image/png",
        isActive: qrForm.isActive,
      });
      resetQrForm();
      setQrModalOpen(false);
      await loadPaymentQrs(selectedEventId);
      setMessage({ type: "success", text: "Payment QR added." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to add payment QR.",
      });
    } finally {
      setQrSaving(false);
    }
  };

  const handleToggleQr = async (qr) => {
    const nextStatus = !qr.isActive;
    setActionInProgress((prev) => ({ ...prev, [qr._id]: "toggling" }));
    try {
      await togglePaymentQrStatus(qr._id, nextStatus);
      await loadPaymentQrs(selectedEventId);
      setMessage({
        type: "success",
        text: nextStatus
          ? "QR is active now. The others were turned off."
          : "QR has been turned off.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to update QR status.",
      });
    } finally {
      setActionInProgress((prev) => ({ ...prev, [qr._id]: null }));
    }
  };

  const handleReviewPayment = async (verification, decision) => {
    setActionInProgress((prev) => ({
      ...prev,
      [verification._id]:
        decision === "approved" ? "approving-payment" : "rejecting-payment",
    }));
    try {
      await reviewPaymentVerification(verification._id, decision);
      await loadPaymentVerifications(selectedEventId);
      setMessage({
        type: "success",
        text:
          decision === "approved"
            ? "Payment verified and registration approved."
            : "Payment verification rejected.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to review payment verification.",
      });
    } finally {
      setActionInProgress((prev) => ({ ...prev, [verification._id]: null }));
    }
  };

  const handleDeleteQr = async (qr) => {
    if (!window.confirm(`Delete QR \"${qr.title}\"?`)) {
      return;
    }

    setActionInProgress((prev) => ({ ...prev, [qr._id]: "deleting" }));
    try {
      await deletePaymentQr(qr._id);
      await loadPaymentQrs(selectedEventId);
      setMessage({ type: "success", text: "Payment QR deleted." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to delete payment QR.",
      });
    } finally {
      setActionInProgress((prev) => ({ ...prev, [qr._id]: null }));
    }
  };

  const handleRefresh = async () => {
    if (viewMode === "paymentQrs") {
      await loadPaymentQrs(selectedEventId);
      return;
    }

    if (viewMode === "paymentVerification") {
      await loadPaymentVerifications(selectedEventId);
      return;
    }

    try {
      setLoading(true);
      const response = await getMyContacts();
      setContacts(response.contacts || []);
      setMessage({ type: "success", text: "Approvals refreshed." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to refresh approvals.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !authData) {
    return (
      <div className="min-h-screen bg-neutral-950 px-4 py-6 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center rounded-[28px] border border-neutral-800 bg-neutral-900/80 p-10">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            <p className="text-sm text-neutral-400">
              Loading approvals workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 px-4 py-6 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[28px] border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PaymentQrModal
        open={qrModalOpen}
        form={qrForm}
        saving={qrSaving}
        onChange={handleQrFieldChange}
        onFileChange={handleQrFileChange}
        onClose={() => {
          resetQrForm();
          setQrModalOpen(false);
        }}
        onSubmit={handleCreateQr}
      />

      <div className="min-h-screen bg-neutral-950 px-4 py-6 text-white sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[32px] border border-neutral-800 bg-neutral-900/80 p-5 shadow-2xl shadow-black/20 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                  Event operations
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-white">
                  {viewMode === "paymentQrs"
                    ? "Payment QR workspace"
                    : viewMode === "paymentVerification"
                      ? "Payment verification workspace"
                      : "Manage event registration requests"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                  {viewMode === "paymentQrs"
                    ? "Switch to a dedicated QR view, add new payment QRs, and keep only one active QR on for each event at a time."
                    : viewMode === "paymentVerification"
                      ? "Review paid registrations, inspect screenshots, and approve students only after payment is verified."
                      : "Review incoming event registration requests and approve or reject them from one place."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ViewSwitch value={viewMode} onChange={setViewMode} />
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded-2xl border border-neutral-800 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-neutral-700 hover:text-white"
                >
                  Refresh
                </button>
                {viewMode === "paymentQrs" && (
                  <button
                    type="button"
                    onClick={() => {
                      resetQrForm();
                      setQrModalOpen(true);
                    }}
                    disabled={!selectedEventId}
                    className="rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    New QR
                  </button>
                )}
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                message.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {viewMode === "approvals" && (
            <div className="grid gap-4 md:grid-cols-3">
              <>
                <SummaryCard
                  title="Pending"
                  value={approvalCounts.pending}
                  subtitle="Waiting for your decision"
                />
                <SummaryCard
                  title="Approved"
                  value={approvalCounts.approved}
                  subtitle="Approved registrations"
                  tone="emerald"
                />
                <SummaryCard
                  title="Rejected"
                  value={approvalCounts.rejected}
                  subtitle="Rejected registrations"
                  tone="amber"
                />
              </>
            </div>
          )}

          {viewMode === "paymentQrs" ? (
            <div className="rounded-[32px] border border-neutral-800 bg-neutral-900/80 p-5 shadow-2xl shadow-black/20 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Payment QRs
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Clicking this section changes the whole workspace to QR-only
                    management for the selected event.
                  </p>
                </div>

                <div className="w-full max-w-sm">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
                    Event
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(event) => setSelectedEventId(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
                  >
                    {managedEvents.length === 0 ? (
                      <option value="">No managed events</option>
                    ) : (
                      managedEvents.map((event) => (
                        <option
                          key={getEventId(event)}
                          value={getEventId(event)}
                        >
                          {event.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {!selectedEventId ? (
                <div className="py-16 text-center">
                  <p className="text-lg font-semibold text-white">
                    No event available for QR management.
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    You need an event you manage before you can add payment QRs.
                  </p>
                </div>
              ) : qrLoading ? (
                <div className="flex min-h-80 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                    <p className="text-sm text-neutral-400">Loading QRs...</p>
                  </div>
                </div>
              ) : paymentQrs.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-lg font-semibold text-white">
                    No payment QRs yet for{" "}
                    {selectedEvent?.title || "this event"}.
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    Add a new QR to start collecting payments for this event.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {paymentQrs.map((qr) => {
                    const busyState = actionInProgress[qr._id];
                    return (
                      <div
                        key={qr._id}
                        className="overflow-hidden rounded-[28px] border border-neutral-800 bg-neutral-950/80"
                      >
                        <div className="flex flex-col gap-5 p-5 sm:flex-row">
                          <div className="flex h-48 items-center justify-center overflow-hidden rounded-3xl bg-white p-4 sm:w-52">
                            <img
                              src={qr.imageUrl}
                              alt={qr.title}
                              className="max-h-full w-auto object-contain"
                            />
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-xl font-semibold text-white">
                                  {qr.title}
                                </h3>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    qr.isActive
                                      ? "bg-emerald-500/15 text-emerald-200"
                                      : "bg-neutral-800 text-neutral-300"
                                  }`}
                                >
                                  {qr.isActive ? "On" : "Off"}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-neutral-400">
                                Added on {formatDateTime(qr.createdAt)}
                              </p>
                              <p className="mt-3 text-sm text-neutral-400">
                                If you turn this QR on, every other QR for{" "}
                                {selectedEvent?.title || "the event"} will be
                                turned off automatically.
                              </p>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleQr(qr)}
                                disabled={busyState === "toggling"}
                                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                                  qr.isActive
                                    ? "border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                                    : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {busyState === "toggling"
                                  ? "Updating..."
                                  : qr.isActive
                                    ? "Turn off"
                                    : "Turn on"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQr(qr)}
                                disabled={busyState === "deleting"}
                                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busyState === "deleting"
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : viewMode === "paymentVerification" ? (
            <div className="rounded-[32px] border border-neutral-800 bg-neutral-900/80 p-5 shadow-2xl shadow-black/20 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Payment Verification
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Paid registrations stay pending until you verify the payment
                    screenshot and approve them.
                  </p>
                </div>

                <div className="w-full max-w-sm">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
                    Event
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(event) => setSelectedEventId(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
                  >
                    {managedEvents.length === 0 ? (
                      <option value="">No managed events</option>
                    ) : (
                      managedEvents.map((event) => (
                        <option
                          key={getEventId(event)}
                          value={getEventId(event)}
                        >
                          {event.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {selectedEventId && (
                <div className="mt-5 space-y-4 border-b border-neutral-800 pb-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setVerificationFilter("submitted")}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        verificationFilter === "submitted"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-neutral-950 text-neutral-400 hover:text-white"
                      }`}
                    >
                      Pending ({verificationCounts.submitted})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationFilter("approved")}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        verificationFilter === "approved"
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-neutral-950 text-neutral-400 hover:text-white"
                      }`}
                    >
                      Approved ({verificationCounts.approved})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationFilter("rejected")}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        verificationFilter === "rejected"
                          ? "bg-red-500 text-slate-950"
                          : "bg-neutral-950 text-neutral-400 hover:text-white"
                      }`}
                    >
                      Rejected ({verificationCounts.rejected})
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <input
                        type="search"
                        value={verificationSearch}
                        onChange={(event) =>
                          setVerificationSearch(event.target.value)
                        }
                        placeholder="Search by team, participant, reg no, email, or payment reference"
                        className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-500/60"
                      />
                    </div>
                    {verificationSearch.trim() ? (
                      <button
                        type="button"
                        onClick={() => setVerificationSearch("")}
                        className="rounded-2xl border border-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                      >
                        Clear search
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {!selectedEventId ? (
                <div className="py-16 text-center">
                  <p className="text-lg font-semibold text-white">
                    No event available for payment verification.
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    You need an event you manage before you can verify paid
                    registrations.
                  </p>
                </div>
              ) : verificationLoading ? (
                <div className="flex min-h-80 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                    <p className="text-sm text-neutral-400">
                      Loading payment verifications...
                    </p>
                  </div>
                </div>
              ) : filteredPaymentVerifications.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-lg font-semibold text-white">
                    {verificationSearch.trim()
                      ? "No matching payment verifications"
                      : verificationFilter === "submitted" &&
                        "No pending payment verifications"}
                    {!verificationSearch.trim() &&
                      verificationFilter === "approved" &&
                      "No approved payment verifications"}
                    {!verificationSearch.trim() &&
                      verificationFilter === "rejected" &&
                      "No rejected payment verifications"}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    {verificationSearch.trim()
                      ? `Try a different name, reg no, email, or payment reference for ${selectedEvent?.title || "this event"}.`
                      : `Paid registrations for ${selectedEvent?.title || "this event"} will appear here.`}
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredPaymentVerifications.map((item) => {
                    const busyState = actionInProgress[item._id];
                    const isSubmitted = item.status === "submitted";
                    const memberList = Array.isArray(item.members)
                      ? item.members
                      : [];

                    return (
                      <div
                        key={item._id}
                        className="rounded-[28px] border border-neutral-800 bg-neutral-950/80 p-5 transition hover:border-neutral-700"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start gap-3">
                              <div>
                                <h3 className="text-xl font-semibold text-cyan-300">
                                  {getVerificationHeadline(item)}
                                </h3>
                                <p className="mt-1 text-sm text-neutral-400">
                                  {item.registrationType === "team"
                                    ? `${memberList.length + 1} team member${memberList.length + 1 > 1 ? "s" : ""}`
                                    : item.participant?.email ||
                                      "Solo registration"}
                                </p>
                              </div>
                              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                                {item.registrationType === "team"
                                  ? "Team"
                                  : "Solo"}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getVerificationStatusClass(item.status)}`}
                              >
                                {item.status === "submitted"
                                  ? "Pending verification"
                                  : item.status}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2 xl:grid-cols-4">
                              <p>
                                <span className="text-neutral-500">
                                  Amount:
                                </span>{" "}
                                {formatCurrency(item.paymentAmount)}
                              </p>
                              <p>
                                <span className="text-neutral-500">
                                  Reference:
                                </span>{" "}
                                {item.paymentReference}
                              </p>
                              <p>
                                <span className="text-neutral-500">
                                  Submitted:
                                </span>{" "}
                                {formatDateTime(
                                  item.paymentSubmittedAt || item.createdAt,
                                )}
                              </p>
                              {item.reviewedAt && (
                                <p>
                                  <span className="text-neutral-500">
                                    Reviewed:
                                  </span>{" "}
                                  {formatDateTime(item.reviewedAt)}
                                </p>
                              )}
                            </div>

                            <div className="mt-4 flex flex-col gap-4 lg:flex-row">
                              {item.paymentScreenshotUrl && (
                                <div className="flex h-36 w-full max-w-[180px] items-center justify-center overflow-hidden rounded-3xl border border-neutral-800 bg-white p-3">
                                  <img
                                    src={item.paymentScreenshotUrl}
                                    alt="Payment screenshot"
                                    className="max-h-full w-auto object-contain"
                                  />
                                </div>
                              )}

                              <div className="min-w-0 flex-1 space-y-4">
                                {item.registrationType === "team" ? (
                                  <>
                                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
                                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                                        Team Leader
                                      </p>
                                      <p className="font-semibold text-white">
                                        {item.leader?.name || "Unknown leader"}
                                      </p>
                                      <p className="mt-1 text-neutral-400">
                                        {item.leader?.regno || "No reg no"}
                                        {item.leader?.email
                                          ? ` • ${item.leader.email}`
                                          : ""}
                                      </p>
                                    </div>

                                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
                                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                                        Team Members
                                      </p>
                                      {memberList.length === 0 ? (
                                        <p className="text-neutral-400">
                                          No additional members.
                                        </p>
                                      ) : (
                                        <div className="space-y-2">
                                          {memberList.map((member, index) => (
                                            <p
                                              key={`${item._id}-member-${index}`}
                                            >
                                              <span className="font-medium text-white">
                                                {member.name ||
                                                  `Member ${index + 1}`}
                                              </span>
                                              <span className="text-neutral-400">
                                                {member.regno
                                                  ? ` • ${member.regno}`
                                                  : ""}
                                                {member.email
                                                  ? ` • ${member.email}`
                                                  : ""}
                                              </span>
                                            </p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                                      Participant
                                    </p>
                                    <p className="font-semibold text-white">
                                      {item.participant?.name ||
                                        "Unknown participant"}
                                    </p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                      {item.participant?.regno && (
                                        <p>{item.participant.regno}</p>
                                      )}
                                      {item.participant?.email && (
                                        <p>{item.participant.email}</p>
                                      )}
                                      {item.participant?.branch && (
                                        <p>{item.participant.branch}</p>
                                      )}
                                      {item.participant?.college && (
                                        <p>{item.participant.college}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 xl:w-60 xl:flex-col xl:items-stretch">
                            {isSubmitted ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReviewPayment(item, "approved")
                                  }
                                  disabled={busyState}
                                  className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {busyState === "approving-payment"
                                    ? "Approving..."
                                    : "Approve payment"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReviewPayment(item, "rejected")
                                  }
                                  disabled={busyState}
                                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {busyState === "rejecting-payment"
                                    ? "Rejecting..."
                                    : "Reject payment"}
                                </button>
                              </>
                            ) : (
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${getVerificationStatusClass(item.status)}`}
                              >
                                {item.status === "approved"
                                  ? "Approved"
                                  : "Rejected"}
                              </div>
                            )}
                            {item.reviewedBy?.name && (
                              <p className="text-xs text-neutral-500">
                                Reviewed by {item.reviewedBy.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[32px] border border-neutral-800 bg-neutral-900/80 p-5 shadow-2xl shadow-black/20 sm:p-6">
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterStatus("pending")}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      filterStatus === "pending"
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-neutral-950 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Pending ({approvalCounts.pending})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("approved")}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      filterStatus === "approved"
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-neutral-950 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Approved ({approvalCounts.approved})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("rejected")}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      filterStatus === "rejected"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-neutral-950 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Rejected ({approvalCounts.rejected})
                  </button>
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-lg font-semibold text-white">
                    {filterStatus === "pending" && "No pending requests"}
                    {filterStatus === "approved" && "No approved requests"}
                    {filterStatus === "rejected" && "No rejected requests"}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    New requests will show up here when students contact you for
                    event registration.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact._id}
                      className="rounded-[28px] border border-neutral-800 bg-neutral-950/80 p-5 transition hover:border-neutral-700"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start gap-3">
                            <div>
                              <h3 className="text-xl font-semibold text-cyan-300">
                                {contact.name}
                              </h3>
                              <p className="mt-1 text-sm text-neutral-400">
                                {contact.eventTitle}
                              </p>
                            </div>
                            {contact.approved ? (
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                                Approved
                              </span>
                            ) : contact.status === "handled" ? (
                              <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-200">
                                Rejected
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                                Pending
                              </span>
                            )}
                          </div>

                          <div className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2 xl:grid-cols-4">
                            {contact.regno && (
                              <p>
                                <span className="text-neutral-500">
                                  Reg No:
                                </span>{" "}
                                {contact.regno}
                              </p>
                            )}
                            <p>
                              <span className="text-neutral-500">Email:</span>{" "}
                              {contact.email}
                            </p>
                            {contact.branch && (
                              <p>
                                <span className="text-neutral-500">
                                  Branch:
                                </span>{" "}
                                {contact.branch}
                              </p>
                            )}
                            {contact.college && (
                              <p>
                                <span className="text-neutral-500">
                                  College:
                                </span>{" "}
                                {contact.college}
                              </p>
                            )}
                          </div>

                          {contact.message && (
                            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                                Message
                              </p>
                              <p>{contact.message}</p>
                            </div>
                          )}

                          <p className="mt-4 text-xs text-neutral-500">
                            Requested on {formatDateTime(contact.createdAt)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3 lg:w-56 lg:flex-col">
                          {contact.approved ? (
                            <button
                              type="button"
                              disabled
                              className="rounded-2xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-200"
                            >
                              Approved
                            </button>
                          ) : contact.status === "handled" ? (
                            <>
                              <button
                                type="button"
                                disabled
                                className="rounded-2xl bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-200"
                              >
                                Rejected
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "This request was previously rejected. Change it to approved?",
                                    )
                                  ) {
                                    handleApprove(contact._id);
                                  }
                                }}
                                disabled={actionInProgress[contact._id]}
                                className="rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionInProgress[contact._id] === "approving"
                                  ? "Changing..."
                                  : "Change to approved"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(contact._id)}
                                disabled={actionInProgress[contact._id]}
                                className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionInProgress[contact._id] === "approving"
                                  ? "Approving..."
                                  : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(contact._id)}
                                disabled={actionInProgress[contact._id]}
                                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
          )}
        </div>
      </div>
    </>
  );
}
