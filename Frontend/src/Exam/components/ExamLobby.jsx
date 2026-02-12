import React from "react";

export default function ExamLobby({
  lives,
  showLifeLost,
  user,
  questions,
  events,
  selectedEventId,
  onSelectEvent,
}) {
  return (
    <aside className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-xl p-6 h-fit transition-all hover:shadow-2xl">
      {showLifeLost && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-lg">
            <span aria-hidden="true">💔</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Life lost</p>
            <p className="text-xs text-gray-700">
              {lives} {lives === 1 ? "life" : "lives"} remaining. Please stay in
              fullscreen and avoid switching tabs or windows.
            </p>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-6 text-gray-900">
        Take an Assessment
      </h2>

      {events && events.length > 0 && (
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
            Select Event
          </label>
          <select
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            value={selectedEventId || ""}
            onChange={(e) => onSelectEvent && onSelectEvent(e.target.value)}
          >
            <option value="">-- General Practice --</option>
            {events.map((ev) => (
              <option key={ev._id || ev.id} value={ev._id || ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-5 text-sm">
        <div className="border border-gray-200 rounded-lg p-4 bg-linear-to-br from-blue-50 to-indigo-50 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-700">
            <div>
              <div className="text-gray-500 mb-1 font-medium">Proctoring</div>
              <span className="font-bold text-gray-900 text-sm">Remote</span>
            </div>
            <div>
              <div className="text-gray-500 mb-1 font-medium">
                Max. Duration
              </div>
              <span className="font-bold text-gray-900 text-sm">1h</span>
            </div>
            <div className="col-span-2">
              <div className="text-gray-500 mb-1 font-medium">
                Total Questions
              </div>
              <span className="font-bold text-gray-900 text-sm">
                {questions.length}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
              1
            </div>
            <div className="text-gray-800 font-semibold">Environment Setup</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div className="text-gray-600 font-medium">Test</div>
          </div>
        </div>

        <div className="border-t border-transparent pt-5 mt-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-gray-900 font-semibold mb-2 text-sm flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800">
                !
              </span>
              <span>Important Notes</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-gray-700 text-xs sm:text-sm">
              <li>
                You must share your{" "}
                <span className="font-bold">entire screen</span> when prompted.
                Sharing a window or tab is not allowed.
              </li>
              <li>Ensure you have a stable internet connection.</li>
              <li>Do not switch tabs or exit fullscreen mode.</li>
              <li>Keep your camera and microphone on at all times.</li>
            </ul>
          </div>
        </div>

        {user && (
          <div className="border-t border-gray-200 pt-5 mt-5 bg-gray-50 -mx-6 px-6 pb-2 mb-[-1.5rem] rounded-b-2xl">
            <div className="text-xs text-gray-500 mb-1 font-medium bg-gray-200 w-fit px-2 py-0.5 rounded-full">
              Logged in as
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div>
                <div className="text-sm text-gray-900 font-bold wrap-break-word leading-tight">
                  {user.name || "User"}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {user.regno || user.email}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
