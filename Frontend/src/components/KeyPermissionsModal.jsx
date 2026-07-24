import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconLock, IconChevronRight, IconCheck } from "@tabler/icons-react";

const MEMBER_PAGES = [
  { path: "/member/secret", label: "Secret Access Portal", desc: "The home portal for event organizers." },
  { path: "/member/Attendance", label: "Mark Attendance", desc: "Page to scan and register student attendance." },
  { path: "/member/summary", label: "Attendance Summary", desc: "View attendance rates and logs." }
];

const DASHBOARD_SECTIONS = [
  { key: "dashboard:overview", label: "Overview", desc: "General event statistics and status." },
  { key: "dashboard:attendance", label: "Attendance Status", desc: "Summary stats and overview of event attendance." },
  { key: "dashboard:studentSnap", label: "Student Snap", desc: "Photo logs and visual details of registered students." },
  { key: "dashboard:teamMarks", label: "Team Marks", desc: "Grades, marks, and evaluations for teams." },
  { key: "dashboard:sessions", label: "Sessions", desc: "Create, view and manage event sessions." },
  { key: "dashboard:students", label: "Students List", desc: "Manage students registry and attendance." },
  { key: "dashboard:questions", label: "Questions Management", desc: "Manage tests, quizzes and questions." },
  { key: "dashboard:problemStatements", label: "Problem Statements", desc: "Track, upload or manage statements." },
  { key: "dashboard:results", label: "Results Section", desc: "View final/published student exam scores." },
  { key: "dashboard:approvals", label: "Approvals / QR Code", desc: "Approve teams or view QR codes." }
];

export default function KeyPermissionsModal({ isOpen, onClose, onConfirm }) {
  const [selected, setSelected] = useState(() => {
    // Default to everything checked for a convenient starting state
    return [
      ...MEMBER_PAGES.map((p) => p.path),
      ...DASHBOARD_SECTIONS.map((s) => s.key)
    ];
  });

  const handleToggle = (item) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSelectAllPages = () => {
    const pagePaths = MEMBER_PAGES.map((p) => p.path);
    const allSelected = pagePaths.every((path) => selected.includes(path));
    if (allSelected) {
      setSelected((prev) => prev.filter((item) => !pagePaths.includes(item)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...pagePaths])]);
    }
  };

  const handleSelectAllDash = () => {
    const dashKeys = DASHBOARD_SECTIONS.map((s) => s.key);
    const allSelected = dashKeys.every((key) => selected.includes(key));
    if (allSelected) {
      setSelected((prev) => prev.filter((item) => !dashKeys.includes(item)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...dashKeys])]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selected.length === 0) return;
    const finalSelected = new Set(selected);
    if (finalSelected.has("dashboard:attendance")) {
      finalSelected.add("/member/Attendance");
      finalSelected.add("/member/summary");
    }
    if (finalSelected.has("/member/Attendance")) {
      finalSelected.add("dashboard:attendance");
    }
    onConfirm(Array.from(finalSelected));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-800 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <IconLock size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Configure Access Permissions</h2>
                <p className="text-neutral-400 text-xs mt-0.5">
                  Select which pages/sections this member key is authorized to access.
                </p>
              </div>
            </div>

            {/* Content (Scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
              
              {/* Organizing Pages Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
                    Member Pages
                  </h3>
                  <button
                    type="button"
                    onClick={handleSelectAllPages}
                    className="text-xs text-neutral-400 hover:text-white transition"
                  >
                    {MEMBER_PAGES.map((p) => p.path).every((path) => selected.includes(path))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MEMBER_PAGES.map((page) => {
                    const isChecked = selected.includes(page.path);
                    return (
                      <div
                        key={page.path}
                        onClick={() => handleToggle(page.path)}
                        className={`group relative flex gap-3 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                          isChecked
                            ? "bg-blue-600/5 border-blue-500/30 text-white"
                            : "bg-neutral-950/40 border-neutral-800/80 text-neutral-400 hover:border-neutral-700/60"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <div
                            className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
                              isChecked
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "border-neutral-700 group-hover:border-neutral-600"
                            }`}
                          >
                            {isChecked && <IconCheck size={12} strokeWidth={3} />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold transition-colors ${isChecked ? "text-white" : "text-neutral-300 group-hover:text-white"}`}>
                            {page.label}
                          </p>
                          <p className="text-neutral-500 text-[11px] mt-0.5 line-clamp-1">
                            {page.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dashboard Sections */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                    Dashboard Sections
                  </h3>
                  <button
                    type="button"
                    onClick={handleSelectAllDash}
                    className="text-xs text-neutral-400 hover:text-white transition"
                  >
                    {DASHBOARD_SECTIONS.map((s) => s.key).every((key) => selected.includes(key))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DASHBOARD_SECTIONS.map((sec) => {
                    const isChecked = selected.includes(sec.key);
                    return (
                      <div
                        key={sec.key}
                        onClick={() => handleToggle(sec.key)}
                        className={`group relative flex gap-3 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                          isChecked
                            ? "bg-emerald-600/5 border-emerald-500/30 text-white"
                            : "bg-neutral-950/40 border-neutral-800/80 text-neutral-400 hover:border-neutral-700/60"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <div
                            className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
                              isChecked
                                ? "bg-emerald-600 border-emerald-500 text-white"
                                : "border-neutral-700 group-hover:border-neutral-600"
                            }`}
                          >
                            {isChecked && <IconCheck size={12} strokeWidth={3} />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold transition-colors ${isChecked ? "text-white" : "text-neutral-300 group-hover:text-white"}`}>
                            {sec.label}
                          </p>
                          <p className="text-neutral-500 text-[11px] mt-0.5 line-clamp-1">
                            {sec.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={selected.length === 0}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]"
              >
                Generate Key
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
