import React from "react";

export default function ExamConfirmModal({
  show,
  unansweredCount,
  onCancel,
  onConfirm,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6 text-orange-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Incomplete Test
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You have{" "}
              <span className="font-bold text-orange-600">
                {unansweredCount}
              </span>{" "}
              unanswered question(s). Do you still want to submit your test?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
