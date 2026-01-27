import { API_BASE } from "./constants";
import { getRoles } from "./api"; // kept for backward-compatible fallback

export async function login(email, password) {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body.error || "Login failed");
  return body;
}

export async function signup(payload) {
  const resp = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body.error || "Signup failed");
  return body;
}

export async function logout() {
  const resp = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!resp.ok) throw new Error("Logout failed");
  return resp.json();
}

export async function getMe() {
  const resp = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include",
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body.error || "Failed to load profile");
  // Prefer roles returned from the backend; fall back to fetching roles if backend didn't return them
  try {
    if (!body.roles) {
      const user = body.user || body;
      if (user && user.regno) {
        const rc = await getRoles().catch(() => ({}));
        const members = Array.isArray(rc.members) ? rc.members : [];
        const regnoUpper = String(user.regno).toUpperCase();
        if (members.map((m) => String(m).toUpperCase()).includes(regnoUpper)) {
          if (!user.role || user.role !== "admin") {
            if (body.user) body.user.role = "member";
            else body.role = "member";
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }
  return body;
}

export async function checkLogin() {
  const resp = await fetch(`${API_BASE}/auth/check-login`, {
    credentials: "include",
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) return { authenticated: false };
  // Prefer roles returned from the backend; fall back to fetching roles if backend didn't return them
  try {
    if (body && body.authenticated && !body.roles) {
      const user = body.user || body;
      if (user && user.regno) {
        const rc = await getRoles().catch(() => ({}));
        const members = Array.isArray(rc.members) ? rc.members : [];
        const regnoUpper = String(user.regno).toUpperCase();
        if (members.map((m) => String(m).toUpperCase()).includes(regnoUpper)) {
          if (!user.role || user.role !== "admin") {
            if (body.user) body.user.role = "member";
            else body.role = "member";
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }
  return body;
}
