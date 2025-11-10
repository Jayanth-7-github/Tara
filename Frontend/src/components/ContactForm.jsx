import React, { useState, useEffect } from "react";
import { sendContact } from "../services/api";

export default function ContactForm({
  event = null,
  fallbackEmail = "admin@college.edu",
  initial = {},
  onClose = () => {},
  onSent = () => {},
}) {
  const [name, setName] = useState(initial.name || "");
  const [regno, setRegno] = useState(initial.regno || "");
  const [email, setEmail] = useState(initial.email || "");
  const [branch, setBranch] = useState(initial.branch || "");
  const [college, setCollege] = useState(initial.college || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const title = event?.title || "this event";
    const when = event?.date
      ? ` on ${new Date(event.date).toLocaleString()}`
      : "";
    const defaultMsg = `Hello,\n\nI would like to register for \"${title}\"${when}.\n\nMy details:\nName: ${
      name || ""
    }\nRegno: ${regno || ""}\nEmail: ${email || ""}\nBranch: ${
      branch || ""
    }\nCollege: ${
      college || ""
    }\n\nPlease let me know the next steps.\n\nThank you,\n${name || ""}`;
    setMessage(defaultMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, name, regno, email, branch, college]);

  function validate() {
    setError(null);
    if (!name || !String(name).trim()) {
      setError("Please enter your name");
      return false;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(String(email))) {
      setError("Please enter a valid email");
      return false;
    }
    return true;
  }

  function sendMail() {
    if (!validate()) return;
    // Use centralized API helper
    (async () => {
      setError(null);
      setSending(true);
      try {
        const payload = {
          name,
          regno,
          email,
          branch,
          college,
          message,
          eventId: event?._id || event?.id,
        };
        await sendContact(payload);
        setSent(true);
        // small delay so animation/message is visible, then close
        setTimeout(() => {
          setSending(false);
          if (onSent) onSent();
          onClose();
        }, 1200);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to send message");
        setSending(false);
        setSent(false);
      }
    })();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-lg w-full mx-auto flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
          <h3 className="text-lg font-semibold text-blue-400">
            Contact Organizer
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-auto">
          {error && <div className="text-sm text-red-400 mb-2">{error}</div>}
          {sent && (
            <div className="mb-3 p-2 rounded bg-green-900/30 text-green-200 text-sm flex items-center gap-2">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="#bbf7d0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Email sent successfully
            </div>
          )}

          <label className="block mb-2">
            <span className="text-sm text-gray-200">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
            />
          </label>

          <label className="block mb-2">
            <span className="text-sm text-gray-200">Regno</span>
            <input
              value={regno}
              onChange={(e) => setRegno(e.target.value)}
              className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
            />
          </label>

          <label className="block mb-2">
            <span className="text-sm text-gray-200">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
            />
          </label>

          <label className="block mb-2">
            <span className="text-sm text-gray-200">Branch</span>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
            />
          </label>

          <label className="block mb-2">
            <span className="text-sm text-gray-200">College</span>
            <input
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-200">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
            />
          </label>
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-3 justify-end shrink-0 bg-gray-800">
          <button
            onClick={onClose}
            disabled={sending}
            className={`px-3 py-1 text-sm rounded ${
              sending
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={sendMail}
            disabled={sending || sent}
            className={`px-4 py-2 text-sm rounded text-white ${
              sent ? "bg-green-500" : "bg-blue-600 hover:bg-blue-700"
            } ${sending ? "opacity-80 cursor-wait" : ""}`}
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="31.4 31.4"
                  />
                </svg>
                Sending...
              </span>
            ) : sent ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#064e3b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Sent
              </span>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
