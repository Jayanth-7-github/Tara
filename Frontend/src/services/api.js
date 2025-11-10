// Keep API base configurable via VITE_API_BASE; default to a relative '/api'
// so the dev server or production server can route requests consistently.
export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://tara-kbxn.onrender.com/api";

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

// Create a single student
export async function createStudent(student) {
  const resp = await fetch(`${API_BASE}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to create student");
    err.status = resp.status;
    throw err;
  }
  return body;
}

// Create multiple students in bulk (expects an array)
export async function createStudentsBulk(students) {
  const resp = await fetch(`${API_BASE}/students/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(students),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to create students bulk");
    err.status = resp.status;
    throw err;
  }
  return body;
}

// Update attendance for a regno. body can contain { eventName?, name?, isPresent?, timestamp?, newEventName? }
export async function updateAttendance(regno, body) {
  const resp = await fetch(
    `${API_BASE}/attendance/${encodeURIComponent(regno)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const respBody = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(respBody.error || "Failed to update attendance");
    err.status = resp.status;
    throw err;
  }
  return respBody;
}

// Test Result APIs
export async function submitTestResult(testData) {
  const resp = await fetch(`${API_BASE}/test-results/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(testData),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to submit test");
    err.status = resp.status;
    throw err;
  }
  return body;
}

export async function getMyTestResults() {
  const resp = await fetch(`${API_BASE}/test-results/my-results`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error("Failed to fetch test results");
  return resp.json();
}

export async function checkTestTaken(testTitle) {
  const url = new URL(`${API_BASE.replace(/\/$/, "")}/test-results/check`);
  if (testTitle) url.searchParams.set("testTitle", testTitle);
  const resp = await fetch(url.toString(), { credentials: "include" });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to check test taken");
    err.status = resp.status;
    throw err;
  }
  return body; // { taken: boolean }
}

export async function getMyTestStats() {
  const resp = await fetch(`${API_BASE}/test-results/my-stats`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error("Failed to fetch test stats");
  return resp.json();
}

// Events API
export async function fetchEvents() {
  const resp = await fetch(`${API_BASE.replace(/\/$/, "")}/events`);
  if (!resp.ok) throw new Error("Failed to fetch events");
  return resp.json();
}

export async function createEvent(eventPayload) {
  const resp = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(eventPayload),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to create event");
    err.status = resp.status;
    throw err;
  }
  return body;
}

export async function updateEvent(eventId, eventPayload) {
  const resp = await fetch(
    `${API_BASE.replace(/\/$/, "")}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(eventPayload),
    }
  );
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to update event");
    err.status = resp.status;
    throw err;
  }
  return body;
}

export async function deleteEvent(eventId) {
  const resp = await fetch(
    `${API_BASE.replace(/\/$/, "")}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to delete event");
    err.status = resp.status;
    throw err;
  }
  return body;
}

export async function registerForEvent(eventId, payload) {
  const resp = await fetch(
    `${API_BASE.replace(/\/$/, "")}/events/${encodeURIComponent(
      eventId
    )}/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to register for event");
    err.status = resp.status;
    throw err;
  }
  return body;
}

// Roles API
export async function getRoles() {
  const resp = await fetch(`${API_BASE.replace(/\/$/, "")}/roles/secret8181`, {
    credentials: "include",
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    const err = new Error(body.error || "Failed to fetch roles");
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

export async function upsertRoles(payload) {
  const resp = await fetch(`${API_BASE.replace(/\/$/, "")}/roles/secret8181`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to upsert roles");
    err.status = resp.status;
    throw err;
  }
  return body;
}

// Contact / messaging API - send a contact message to event manager
export async function sendContact(payload) {
  const resp = await fetch(`${API_BASE.replace(/\/$/, "")}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body.error || "Failed to send contact message");
    err.status = resp.status;
    throw err;
  }
  return body;
}
