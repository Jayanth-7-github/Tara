export default function AttendanceCard({
  student,
  onMark,
  onOpenSummary,
  onCancel,
  isMarked = false,
}) {
  if (!student) return null;
  return (
    <div className="max-w-[520px] w-full bg-gray-800 rounded-lg border border-gray-700 shadow-sm p-4 text-white">
      <h3 className="text-lg font-semibold text-white mb-2">{student.name}</h3>
      <p className="text-gray-300 mb-1">
        <span className="font-medium">RegNo:</span> {student.regno}
      </p>
      <p className="text-gray-300 mb-4">
        <span className="font-medium">Dept:</span> {student.department} •
        <span className="font-medium ml-1">Year:</span> {student.year}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => !isMarked && onMark(student.regno)}
          disabled={isMarked}
          className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
            isMarked
              ? "bg-gray-600 cursor-default"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isMarked ? "✓ Attendance Marked" : "Mark Attendance"}
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
