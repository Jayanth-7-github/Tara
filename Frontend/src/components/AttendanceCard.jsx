export default function AttendanceCard({ student, onMark, onOpenSummary }) {
  if (!student) return null;
  return (
    <div
      className="attendance-card"
      style={{
        border: "1px solid #ddd",
        padding: 16,
        borderRadius: 8,
        maxWidth: 520,
      }}
    >
      <h3 style={{ margin: 0 }}>{student.name}</h3>
      <p style={{ margin: "4px 0" }}>
        <strong>RegNo:</strong> {student.regno}
      </p>
      <p style={{ margin: "4px 0" }}>
        <strong>Dept:</strong> {student.department} • <strong>Year:</strong>{" "}
        {student.year}
      </p>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          onClick={() => onMark(student.regno)}
          style={{ padding: "8px 12px" }}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => onOpenSummary && onOpenSummary()}
          style={{ padding: "8px 12px", background: "#eee" }}
        >
          View Summary
        </button>
      </div>
    </div>
  );
}
