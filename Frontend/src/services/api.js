const API_BASE = import.meta.env.VITE_API_BASE || "https://tara-kbxn.onrender.com/api";

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

export async function getSummary() {
  const resp = await fetch(`${API_BASE}/attendance/summary`);
  if (!resp.ok) throw new Error("Failed to fetch summary");
  return resp.json();
}
