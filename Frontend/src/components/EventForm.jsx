import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent, updateEvent } from "../services/api";

// Team configuration state
// (moved below imports)

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

async function resizeImage(file, maxWidth = 1200, quality = 0.8) {
  if (!file) return null;
  const imgData = await toBase64(file);
  const img = document.createElement("img");
  img.src = imgData;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
  });

  const canvas = document.createElement("canvas");
  const ratio = img.width / img.height || 1;
  const width = Math.min(maxWidth, img.width);
  const height = Math.round(width / ratio);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

// Use local time when populating datetime-local inputs so
// an existing 10:00 AM event still shows as 10:00 AM in edit mode
// instead of being shifted by the timezone offset.
function formatDateTimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EventForm({
  initialData = null,
  mode = "create",
  eventId = null,
  onSuccess = null,
  currentUser = null,
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialData?.title || "");
  const [venue, setVenue] = useState(initialData?.venue || "");

  // If creating and user is member, lock managerEmail to their email
  const isMember = currentUser && currentUser.role === "member";
  const userEmail = currentUser?.email || "";

  const [managerEmail, setManagerEmail] = useState(
    mode === "create" && isMember ? userEmail : initialData?.managerEmail || "",
  );
  const [price, setPrice] = useState(
    initialData?.price !== undefined && initialData?.price !== null
      ? String(initialData.price)
      : "",
  );
  const [date, setDate] = useState(formatDateTimeLocal(initialData?.date));
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initialData?.imageUrl || null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Team configuration state
  const [participationType, setParticipationType] = useState(
    initialData?.participationType || "solo",
  );
  const [minTeamSize, setMinTeamSize] = useState(initialData?.minTeamSize || 1);
  const [maxTeamSize, setMaxTeamSize] = useState(initialData?.maxTeamSize || 1);
  const [teamConfigError, setTeamConfigError] = useState(null);

  const resetCreateForm = () => {
    // Clear selected file input (uncontrolled by React)
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Revoke blob preview URLs we created to avoid leaks
    if (preview && typeof preview === "string" && preview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(preview);
      } catch (e) {
        // ignore
      }
    }

    setTitle("");
    setVenue("");
    // Keep member's email locked; otherwise clear it for fresh entry
    if (isMember) setManagerEmail(userEmail);
    else setManagerEmail("");
    setPrice("");
    setDate("");
    setDescription("");
    setFile(null);
    setPreview(null);
    setParticipationType("solo");
    setMinTeamSize(1);
    setMaxTeamSize(1);
    setTeamConfigError(null);
    setError(null);
  };

  useEffect(() => {
    setTitle(initialData?.title || "");
    setVenue(initialData?.venue || "");
    // Only hydrate managerEmail from initialData in edit mode.
    // In create mode, managerEmail is managed by the member-locking effect below.
    if (mode !== "create") setManagerEmail(initialData?.managerEmail || "");
    setDate(formatDateTimeLocal(initialData?.date));
    setDescription(initialData?.description || "");
    setPrice(
      initialData?.price !== undefined && initialData?.price !== null
        ? String(initialData.price)
        : "",
    );
    setPreview(initialData?.imageUrl || null);
  }, [initialData, mode]);

  useEffect(() => {
    // In create mode for members, managerEmail is locked to the logged-in email.
    // This runs when currentUser is resolved without resetting other form fields.
    if (mode === "create" && isMember) {
      setManagerEmail(userEmail);
    }
  }, [mode, isMember, userEmail]);

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f && f.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      setFile(null);
      if (
        preview &&
        typeof preview === "string" &&
        preview.startsWith("blob:")
      ) {
        try {
          URL.revokeObjectURL(preview);
        } catch (e) {
          // ignore
        }
      }
      setPreview(initialData?.imageUrl || null);
      e.target.value = ""; // Clear input
      return;
    }
    setError(null);
    setFile(f);
    if (preview && typeof preview === "string" && preview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(preview);
      } catch (e) {
        // ignore
      }
    }
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(initialData?.imageUrl || null);
  };

  const validateTeamConfig = () => {
    if (participationType === "team") {
      if (
        !minTeamSize ||
        !maxTeamSize ||
        minTeamSize < 1 ||
        maxTeamSize < 1 ||
        maxTeamSize < minTeamSize
      ) {
        setTeamConfigError(
          "Team size must be at least 1 and max must be greater than or equal to min.",
        );
        return false;
      }
    }
    setTeamConfigError(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!title || !date) {
      setError("Please fill title, date and manager email");
      return;
    }

    // basic client-side email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    const managerEmailNormalized = String(managerEmail || "").trim();
    if (!managerEmailNormalized || !emailRegex.test(managerEmailNormalized)) {
      setError("Please provide a valid manager email");
      setLoading(false);
      return;
    }

    // Validate team config
    if (!validateTeamConfig()) {
      setError("Please fix team configuration errors.");
      return;
    }

    setLoading(true);
    try {
      let imageBase64 = null;
      let imageType = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          setError("Image size must be less than 5MB");
          setLoading(false);
          return;
        }
        const resized = await resizeImage(file, 1200, 0.8);
        imageBase64 = resized;
        imageType = "image/jpeg";
      }

      // Normalize price: empty or invalid -> 0 (free)
      let numericPrice = 0;
      if (price !== "") {
        const parsed = Number(price);
        if (!Number.isNaN(parsed) && parsed >= 0) numericPrice = parsed;
      }

      const payload = {
        title,
        description,
        venue,
        managerEmail: managerEmailNormalized,
        date,
        price: numericPrice,
        imageBase64,
        imageType,
        participationType,
        minTeamSize,
        maxTeamSize,
      };

      if (mode === "create") {
        await createEvent(payload);
        // Clear the form after successful creation
        resetCreateForm();
        if (onSuccess) return onSuccess();
        return navigate("/main");
      } else {
        if (!eventId) throw new Error("Missing eventId for update");
        await updateEvent(eventId, payload);
        if (onSuccess) return onSuccess();
        return navigate("/main");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">
            Event Title
          </span>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="e.g. Annual Tech Symposium"
            />
            <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-focus-within/input:opacity-100 pointer-events-none transition-opacity" />
          </div>
        </label>

        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">
            Venue
          </span>
          <div className="relative">
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="e.g. Main Auditorium"
            />
          </div>
        </label>

        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">
            Price (₹)
          </span>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="0 for Free"
            />
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">
            Manager Email{" "}
            {isMember && (
              <span className="text-gray-500 text-xs">
                (Locked to your account)
              </span>
            )}
          </span>
          <div className="relative">
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              required
              readOnly={isMember}
              className={`w-full ${isMember ? "bg-gray-800/20 text-gray-500 cursor-not-allowed" : "bg-gray-800/50 text-white"} border border-gray-700 rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all`}
              placeholder="manager@example.com"
            />
          </div>
        </label>

        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">
            Date & Time
          </span>
          <div className="relative">
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all scheme-dark"
            />
          </div>
        </label>
      </div>

      {/* Team Configuration Section */}
      <div className="block group/input">
        <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">
          Participation Type
        </span>
        <div className="relative flex gap-4 items-center">
          <select
            value={participationType}
            onChange={(e) => setParticipationType(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          >
            <option value="solo">Solo</option>
            <option value="team">Team</option>
          </select>
          {participationType === "team" && (
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-400">Min Team Size</label>
              <input
                type="number"
                min={1}
                value={minTeamSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMinTeamSize(val);
                  if (val > maxTeamSize) setMaxTeamSize(val); // auto-adjust max if needed
                }}
                className="w-16 bg-gray-800/50 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
              <label className="text-xs text-gray-400">Max Team Size</label>
              <input
                type="number"
                min={minTeamSize}
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                className="w-16 bg-gray-800/50 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
          )}
        </div>
        {teamConfigError && (
          <div className="text-xs text-red-400 mt-1">{teamConfigError}</div>
        )}
      </div>

      <label className="block group/input">
        <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">
          Description
        </span>
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
            placeholder="Describe the event details..."
          />
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-300 mb-1.5 block">
          Event Image (Optional, Max 5MB)
        </span>
        <div className="relative group/image">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-xl file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              file:cursor-pointer cursor-pointer
              bg-gray-800/50 border border-gray-700 rounded-xl
              focus:outline-none transition-colors
            "
          />
        </div>

        {preview && (
          <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-700 bg-black/50 aspect-video group/preview">
            <img
              src={preview}
              alt="preview"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-medium">Image Preview</span>
            </div>
          </div>
        )}
      </label>

      <div className="pt-2">
        <button
          disabled={loading}
          type="submit"
          className={`
            w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300
            flex items-center justify-center gap-2
            ${
              loading
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/25 active:scale-[0.98]"
            }
          `}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>
                {mode === "create" ? "Creating Event..." : "Updating Event..."}
              </span>
            </>
          ) : (
            <>
              {mode === "create" ? (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Create Event</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span>Update Event</span>
                </>
              )}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
