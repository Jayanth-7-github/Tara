import React from "react";

export default function ExamHeader({
  currentIndex,
  questions,
  lives,
  timeRemaining,
  submitting,
  onSubmit,
  formatTime,
}) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold text-gray-800">Event Assessment</h1>
        <div className="text-xs px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">
          Question {currentIndex + 1} / {questions.length}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            lives === 1
              ? "bg-red-50 border-red-200 text-red-700"
              : lives === 2
                ? "bg-orange-50 border-orange-200 text-orange-700"
                : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold">
            {lives} {lives === 1 ? "Life" : "Lives"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-700 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
          <svg
            className="w-4 h-4 text-yellow-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold">{formatTime(timeRemaining)}</span>
        </div>
        <button
          className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Finish Assessment"}
        </button>
      </div>
    </div>
  );
}
