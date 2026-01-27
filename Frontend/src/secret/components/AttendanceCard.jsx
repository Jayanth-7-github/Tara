export default function AttendanceCard({
  student,
  onCheckIn,
  onCheckOut,
  onOpenSummary,
  onCancel,
  onClose,
  isMarked = false,
  attendanceInfo,
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

  const currentlyOut = Boolean(attendanceInfo?.currentlyOut);
  // Break tracking UX:
  // - Start: can check out
  // - After checkout: can check in (return)
  // - After check-in: can check out again
  const disableCheckIn = !currentlyOut || Boolean(isMarked);
  const disableCheckOut = currentlyOut;

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
          <span className="font-semibold text-gray-400">Email:</span>{" "}
          <span className="text-white break-all">{email || "—"}</span>
        </p>

        <p className="text-gray-300">
          <span className="font-semibold text-gray-400">Branch:</span>{" "}
          <span className="text-white">{branch || "—"}</span>
        </p>

        <p className="text-gray-300">
          <span className="font-semibold text-gray-400">Hostel Name:</span>{" "}
          <span className="text-white">{hostelName || "—"}</span> •
          <span className="font-semibold text-gray-400 ml-2">Room No:</span>{" "}
          <span className="text-white">{roomNo || "—"}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={async () => {
            if (disableCheckIn) return;
            if (!onCheckIn) return;
            const ok = await onCheckIn(rollNumber);
            if (ok) (onClose || onCancel)?.();
          }}
          disabled={disableCheckIn}
          className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
            disableCheckIn
              ? "bg-gray-600 cursor-default"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {disableCheckIn ? "Check In" : "Check In (Return)"}
        </button>

        <button
          onClick={async () => {
            if (!onCheckOut) return;
            if (disableCheckOut) return;
            if (isDayScholar) {
              const ok = window.confirm("Do you really want to checkout?");
              if (!ok) return;
            }
            const ok = await onCheckOut(rollNumber);
            if (ok) (onClose || onCancel)?.();
          }}
          disabled={disableCheckOut}
          className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
            disableCheckOut
              ? "bg-gray-600 cursor-default"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {disableCheckOut ? "✓ Checked Out" : "Check Out"}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
