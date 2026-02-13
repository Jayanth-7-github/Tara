export default function AttendanceCard({
  student,
  selectedEvent,
  onCheckIn, // (regno, sessionName) => Promise<boolean>
  onCancel,
  onClose,
  attendanceRecords = [],
}) {
  if (!student) return null;

  const name = student.Name || student.name || "";
  const rollNumber = student.rollNumber || student.regno || "";
  const teamRole = student.Teamrole || student.role || "";
  const teamName = student.teamName ?? "";
  const email = student.email ?? "";
  const branch = student.branch ?? student.department ?? "";
  const hostelName = student.hostelName ?? "";
  const roomNo = student.roomNo ?? "";

  const isDayScholar =
    String(hostelName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "") === "dayscholar";

  const cardAccent = isDayScholar
    ? "border-red-700/60 bg-red-900/10"
    : "border-green-700/60 bg-green-900/10";

  return (
    <div
      className={`max-w-[520px] w-full rounded-2xl border shadow-lg p-6 text-white ${cardAccent}`}
    >
      <h3 className="text-xl font-bold mb-3 bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
        {name}
      </h3>
      <div className="space-y-2 mb-4">
        <p className="text-gray-300">
          <span className="font-semibold text-gray-400">Roll Number:</span>{" "}
          <span className="text-white">{rollNumber}</span>
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-400">Role:</span>{" "}
          <span className="text-white">{teamRole}</span>
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-400">Team Name:</span>{" "}
          <span className="text-white">{teamName || "—"}</span>
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-400">Hostel Name:</span>{" "}
          <span className="text-white">{hostelName || "—"}</span> •
          <span className="font-semibold text-gray-400 ml-2">Room No:</span>{" "}
          <span className="text-white">{roomNo || "—"}</span>
        </p>
      </div>

      <div className="border-t border-gray-700/50 pt-4 mt-4">
        <h4 className="text-gray-400 text-sm font-semibold mb-3 uppercase tracking-wider">
          Attendance Sessions
        </h4>

        {/* Show ALL sessions, but disable inactive ones */}
        <div className="flex flex-col gap-3">
          {!selectedEvent ? (
            <div className="text-gray-500 italic text-sm text-center">
              No event selected. Please select an event.
            </div>
          ) : !Array.isArray(selectedEvent.sessions) ||
            selectedEvent.sessions.length === 0 ? (
            <div className="text-gray-500 italic text-sm text-center">
              No sessions configured by admin.
            </div>
          ) : (
            selectedEvent.sessions.map((session) => {
              const isActive = session.isActive;
              const isMarked = attendanceRecords.some(
                (r) => r.sessionName === session.name && r.isPresent,
              );

              return (
                <div key={session.name} className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (!isActive || isMarked) return;
                      if (onCheckIn) {
                        await onCheckIn(rollNumber, session.name);
                      }
                    }}
                    disabled={!isActive || isMarked}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 border flex items-center justify-between
                      ${
                        !isActive
                          ? "bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed opacity-70"
                          : isMarked
                            ? "bg-green-600/20 border-green-500/50 text-green-400 cursor-default"
                            : "bg-blue-600 hover:bg-blue-700 border-transparent text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Icon based on state */}
                      {isMarked ? (
                        <span>✓</span>
                      ) : !isActive ? (
                        <span className="text-xs">🔒</span>
                      ) : (
                        <span>📍</span>
                      )}
                      <span>{session.name}</span>
                    </div>

                    {/* Status Label on right */}
                    <span className="text-xs font-semibold opacity-80 uppercase tracking-widest">
                      {isMarked
                        ? "Marked"
                        : !isActive
                          ? "Waiting for Admin"
                          : "Mark Attendance"}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-gray-700/50">
        <button
          onClick={onCancel || onClose}
          className="px-6 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
