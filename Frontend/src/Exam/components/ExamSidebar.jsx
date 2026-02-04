import React from "react";

export default function ExamSidebar({
  questions,
  currentIndex,
  answers,
  markedForReview,
  setCurrentIndex,
  isCameraOn,
  isScreenSharing,
  overlayCameraRef,
  overlayScreenRef,
}) {
  return (
    <aside className="w-64 bg-linear-to-b from-gray-50 to-gray-100 border-r border-gray-200 shadow-lg flex flex-col relative">
      {/* Monitoring section (camera + screen) */}
      <div className="px-4 py-4 border-b border-gray-200 bg-white/50 backdrop-blur">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
          Monitoring
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Camera Preview */}
          <div className="relative">
            <div className="text-[10px] font-medium text-gray-600 mb-1 flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Camera
            </div>
            <div className="w-full h-20 bg-black/80 rounded-lg overflow-hidden shadow-md ring-1 ring-blue-300">
              {isCameraOn ? (
                <video
                  ref={overlayCameraRef}
                  autoPlay
                  muted
                  playsInline
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white">
                  <svg
                    className="w-4 h-4 mb-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-[8px]">Camera Off</span>
                </div>
              )}
            </div>
          </div>
          {/* Screen Preview */}
          <div className="relative">
            <div className="text-[10px] font-medium text-gray-600 mb-1 flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Screen
            </div>
            <div className="w-full h-20 bg-black/70 rounded-lg overflow-hidden shadow-md ring-1 ring-indigo-300">
              {isScreenSharing ? (
                <video
                  ref={overlayScreenRef}
                  autoPlay
                  muted
                  playsInline
                  className="object-contain w-full h-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white">
                  <svg
                    className="w-4 h-4 mb-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-[8px]">No Share</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Question Panel header */}
      <div className="px-5 py-3 border-b border-gray-200 bg-white/50 backdrop-blur">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Question Panel
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 grid grid-cols-4 gap-3 content-start">
        {questions.map((q, idx) => {
          const answered = answers[q.id] !== undefined;
          const isCurrent = idx === currentIndex;
          const isMarked = markedForReview[q.id];
          const isAnsweredAndMarked = answered && isMarked;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`aspect-square rounded-lg border-2 text-sm font-semibold flex items-center justify-center transition-all duration-200 relative group shadow-sm hover:shadow-md ${isCurrent
                  ? "border-blue-500 ring-2 ring-blue-300 bg-blue-50 text-blue-700 scale-105"
                  : isAnsweredAndMarked
                    ? "border-purple-400 bg-purple-50 text-purple-700 hover:border-purple-500"
                    : isMarked
                      ? "border-orange-400 bg-orange-50 text-orange-700 hover:border-orange-500"
                      : answered
                        ? "border-green-400 bg-green-50 text-green-700 hover:border-green-500"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                }`}
              title={q.text}
            >
              {idx + 1}
              {answered && !isCurrent && !isMarked && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
              )}
              {isMarked && !answered && !isCurrent && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                </span>
              )}
              {isAnsweredAndMarked && !isCurrent && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-gray-200 bg-white/80 backdrop-blur">
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-600">Review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-600">Both</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
