const API_BASE = import.meta.env.VITE_API_BASE  || "https://tara-kbxn.onrender.com/api";

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
  return body;
}

export async function checkLogin() {
  const resp = await fetch(`${API_BASE}/auth/check-login`, {
    credentials: "include",
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) return { authenticated: false };
  return body;
}
