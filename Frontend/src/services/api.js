const API_BASE = import.meta.env.VITE_API_BASE || "https://tara-kbxn.onrender.com/api";

export async function searchStudents(query) {
  const resp = await fetch(
    `${API_BASE}/students/search?q=${encodeURIComponent(query)}`
  );
  if (!resp.ok) throw new Error("Failed to search students");
  return resp.json();
}

export async function fetchStudent(regno) {
  const resp = await fetch(`${API_BASE}/students/${encodeURIComponent(regno)}`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    const err = new Error(body.error || "Failed to fetch student");
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

export async function markAttendance(regno, eventName) {
  const resp = await fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regno, eventName }),
  });
  const body = await resp.json();
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to mark attendance");
    err.status = resp.status;
    throw err;
  }
  return body;
}

export async function checkAttendance(regno, eventName = "Vintra") {
  const resp = await fetch(
    `${API_BASE}/attendance/check/${encodeURIComponent(
      regno
    )}?eventName=${encodeURIComponent(eventName)}`
  );
  if (!resp.ok) throw new Error("Failed to check attendance");
  return resp.json();
}

export async function getSummary() {
  const resp = await fetch(`${API_BASE}/attendance/summary`);
  if (!resp.ok) throw new Error("Failed to fetch summary");
  return resp.json();
}

// options can be boolean (presentOnly) for backward compatibility,
// or an object: { presentOnly?: boolean, allStudents?: boolean, eventName?: string }
export async function downloadCSV(options = false) {
  const opts =
    typeof options === "boolean" ? { presentOnly: options } : options || {};
  const url = new URL(`${API_BASE}/attendance/export`);
  if (opts.presentOnly) url.searchParams.set("present", "1");
  if (opts.allStudents) url.searchParams.set("allStudents", "1");
  if (opts.eventName) url.searchParams.set("eventName", opts.eventName);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error("Failed to download CSV");
  return resp.blob();
}
