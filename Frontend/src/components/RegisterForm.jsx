import React, { useState, useEffect, useRef } from "react";
// Helper to debounce API calls
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}
import {
  registerForEvent,
  fetchStudent,
  fetchEventById,
} from "../services/api";
import { API_BASE } from "../services/constants";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaUniversity,
  FaBuilding,
  FaHashtag,
  FaCheckCircle,
  FaUsers,
} from "react-icons/fa";

// Reusable registration form. When fullPage=true it renders a full-screen
// layout; otherwise it just renders the form card.
export default function RegisterForm({
  eventId,
  onRegistered,
  fullPage = false,
  onBack,
  eventTitle,
}) {
  // Event config state
  const [authenticated, setAuthenticated] = useState(null);
  // Check login status on mount
  useEffect(() => {
    let mounted = true;
    import("../services/auth").then(({ checkLogin }) => {
      checkLogin()
        .then((resp) => {
          if (mounted) setAuthenticated(resp.authenticated);
        })
        .catch(() => {
          if (mounted) setAuthenticated(false);
        });
    });
    return () => {
      mounted = false;
    };
  }, []);
  const [eventConfig, setEventConfig] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [leader, setLeader] = useState({
    name: "",
    regno: "",
    email: "",
    phone: "",
    branch: "",
    section: "",
    college: "",
    year: "",
  });
  const [members, setMembers] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  // For solo registration fallback
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [regno, setRegno] = useState("");
  const [branch, setBranch] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState("");
  const [yearOther, setYearOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [myRegno, setMyRegno] = useState("");
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [teamNameAvailable, setTeamNameAvailable] = useState(true);
  const [checkingTeamName, setCheckingTeamName] = useState(false);
  const formRef = useRef(null);
  // Debounced team name for uniqueness check
  const debouncedTeamName = useDebounce(teamName, 400);

  // Live check for team name uniqueness (only for team events)
  useEffect(() => {
    if (!eventConfig || eventConfig.participationType !== "team") return;
    if (!debouncedTeamName.trim()) {
      setTeamNameAvailable(true);
      setCheckingTeamName(false);
      return;
    }
    let ignore = false;
    setCheckingTeamName(true);
    fetch(`${API_BASE}/teams?eventId=${eventId}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        const exists = (data.teams || []).some(
          (t) =>
            t.name.trim().toLowerCase() ===
            debouncedTeamName.trim().toLowerCase(),
        );
        setTeamNameAvailable(!exists);
        setCheckingTeamName(false);
      })
      .catch(() => {
        if (!ignore) setCheckingTeamName(false);
      });
    return () => {
      ignore = true;
    };
  }, [debouncedTeamName, eventConfig, eventId]);

  const handleBack = () => {
    if (onBack) onBack();
    else if (typeof window !== "undefined" && window.history)
      window.history.back();
  };

  // Persist and restore form data using localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ev = await fetchEventById(eventId);
        if (!mounted) return;
        setEventConfig(ev);
        // Restore from localStorage if present
        const saved = localStorage.getItem(`regform_${eventId}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (ev && ev.participationType === "team") {
            setTeamName(data.teamName || "");
            setLeader(
              data.leader || {
                name: "",
                regno: "",
                email: "",
                phone: "",
                branch: "",
                section: "",
                college: "",
                year: "",
              },
            );
            setMembers(
              Array(ev.minTeamSize - 1)
                .fill()
                .map((_, i) =>
                  data.members && data.members[i]
                    ? data.members[i]
                    : {
                        name: "",
                        regno: "",
                        email: "",
                        phone: "",
                        branch: "",
                        section: "",
                        college: "",
                        year: "",
                      },
                ),
            );
            setMemberCount(ev.minTeamSize - 1);
          } else {
            setName(data.name || "");
            setRegno(data.regno || "");
            setEmail(data.email || "");
            setBranch(data.branch || "");
            setCollege(data.college || "");
            setYear(data.year || "");
            setYearOther(data.yearOther || "");
            setMyRegno("");
          }
        } else {
          if (ev && ev.participationType === "team") {
            setLeader({
              name: "",
              regno: "",
              email: "",
              phone: "",
              branch: "",
              section: "",
              college: "",
              year: "",
            });
            setMemberCount(ev.minTeamSize - 1);
            setMembers(
              Array(ev.minTeamSize - 1)
                .fill()
                .map(() => ({
                  name: "",
                  regno: "",
                  email: "",
                  phone: "",
                  branch: "",
                  section: "",
                  college: "",
                  year: "",
                })),
            );
          }
          if (ev && ev.participationType !== "team") {
            setMyRegno("");
            setRegno("");
            setName("");
            setEmail("");
            setBranch("");
            setCollege("");
            setYear("");
            setYearOther("");
          }
        }
      } catch {
        // event fetch failed
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  // Save form data to localStorage on change
  useEffect(() => {
    if (!eventConfig) return;
    const key = `regform_${eventId}`;
    if (eventConfig.participationType === "team") {
      localStorage.setItem(key, JSON.stringify({ teamName, leader, members }));
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({
          name,
          regno,
          email,
          branch,
          college,
          year,
          yearOther,
        }),
      );
    }
  }, [
    eventConfig,
    teamName,
    leader,
    members,
    name,
    regno,
    email,
    branch,
    college,
    year,
    yearOther,
    eventId,
  ]);

  // Validate team or solo registration
  const validate = () => {
    const errs = {};
    if (eventConfig && eventConfig.participationType === "team") {
      if (!teamName.trim()) errs.teamName = "Team name is required.";
      // Validate leader
      [
        "name",
        "regno",
        "email",
        "phone",
        "branch",
        "section",
        "college",
        "year",
      ].forEach((f) => {
        if (!leader[f] || !leader[f].trim())
          errs[`leader_${f}`] = `Leader ${f} is required.`;
      });
      // Validate members
      if (members.length < eventConfig.minTeamSize - 1)
        errs.members = `At least ${eventConfig.minTeamSize - 1} member(s) required.`;
      if (members.length > eventConfig.maxTeamSize - 1)
        errs.members = `No more than ${eventConfig.maxTeamSize - 1} members allowed.`;
      members.forEach((m, idx) => {
        [
          "name",
          "regno",
          "email",
          "phone",
          "branch",
          "section",
          "college",
          "year",
        ].forEach((f) => {
          if (!m[f] || !m[f].trim())
            errs[`member_${idx}_${f}`] = `Member ${idx + 1} ${f} is required.`;
        });
      });
    } else {
      if (!name.trim()) errs.name = "Full name is required.";
      if (!regno.trim()) errs.regno = "Registration number is required.";
      if (myRegno && regno.trim().toUpperCase() !== myRegno)
        errs.regno = "Registration number must match your account.";
      if (!email.trim()) errs.email = "Email is required.";
      if (!year) errs.year = "Please select your year.";
      if (year === "Other" && !yearOther.trim())
        errs.yearOther = "Please specify your year.";
    }
    setShowErrorSummary(Object.keys(errs).length > 0);
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setShowErrorSummary(false);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
      return;
    }

    setLoading(true);
    try {
      if (eventConfig && eventConfig.participationType === "team") {
        // Team registration: POST to /api/teams
        const resp = await fetch(`${API_BASE}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            eventId,
            name: teamName,
            leader,
            members,
          }),
        });
        const body = await resp.json();
        if (!resp.ok) throw new Error(body.error || "Team registration failed");
        setSuccess(true);
        if (onRegistered) onRegistered();
      } else {
        await registerForEvent(eventId, {
          name: name.trim(),
          email: email.trim(),
          regno: regno.trim().toUpperCase(),
          branch: branch.trim(),
          college: college.trim(),
          year: year === "Other" ? yearOther.trim() : year,
        });
        setSuccess(true);
        if (onRegistered) onRegistered();
      }
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setName("");
    // keep regno as-is (especially when prefilled from login)
    setEmail("");
    setBranch("");
    setCollege("");
    setYear("");
    setYearOther("");
    setError(null);
    setFieldErrors({});
    // Clear localStorage for this event
    if (eventConfig) {
      localStorage.removeItem(`regform_${eventId}`);
    }
  };

  // Team registration form UI
  const renderTeamForm = () => (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto bg-linear-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-gray-800/60 p-8 rounded-3xl shadow-2xl backdrop-blur-lg relative overflow-hidden"
      aria-label="Register Team for event"
      tabIndex={-1}
    >
      {/* Event Info */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <h2 className="text-2xl font-bold text-blue-300 tracking-tight flex items-center gap-2">
            <FaUsers className="text-blue-400" />
            {eventTitle || eventConfig?.title || "Event"}
          </h2>
          {eventConfig && (
            <span className="text-xs md:text-sm text-blue-200 bg-blue-900/30 px-3 py-1 rounded-full font-semibold shadow-inner">
              Team Size: {eventConfig.minTeamSize}
              {eventConfig.maxTeamSize !== eventConfig.minTeamSize
                ? `–${eventConfig.maxTeamSize}`
                : ""}{" "}
              members
            </span>
          )}
        </div>
        <div className="text-gray-400 text-sm mb-2">
          Please fill in all required details. All team members must be unique.
        </div>
        <div className="h-px bg-linear-to-r from-blue-700/30 via-gray-700/30 to-purple-700/30 my-4" />
      </div>

      {/* Team Info */}
      <div className="mb-8">
        <label className="block mb-2">
          <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <FaHashtag className="text-blue-400" /> Team Name
          </span>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className={`mt-1 w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${fieldErrors.teamName || !teamNameAvailable ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
            aria-invalid={!!fieldErrors.teamName || !teamNameAvailable}
            aria-describedby={
              fieldErrors.teamName || !teamNameAvailable
                ? "teamName-error"
                : "teamName-status"
            }
            autoComplete="off"
          />
          {fieldErrors.teamName && (
            <p
              id="teamName-error"
              className="text-xs text-red-400 mt-1 animate-fade-in"
            >
              {fieldErrors.teamName}
            </p>
          )}
          {!fieldErrors.teamName && teamName && (
            <p
              id="teamName-status"
              className={`text-xs mt-1 animate-fade-in ${checkingTeamName ? "text-blue-300" : teamNameAvailable ? "text-green-400" : "text-red-400"}`}
            >
              {checkingTeamName
                ? "Checking team name availability..."
                : teamNameAvailable
                  ? "Team name is available."
                  : "This team name is already taken for this event."}
            </p>
          )}
        </label>
      </div>

      {/* Team Leader Details */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-blue-300 mb-2 flex items-center gap-2">
          <FaUser className="text-blue-400" /> Team Leader Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderParticipantFields(leader, setLeader, fieldErrors, "leader")}
        </div>
      </div>

      {/* Team Members */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-blue-300 flex items-center gap-2">
            <FaUsers className="text-blue-400" /> Team Members
          </h3>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-blue-200 bg-blue-900/30 px-2 py-1 rounded-full font-semibold shadow-inner">
              {members.length + 1} / {eventConfig?.maxTeamSize} members added
            </span>
            <button
              type="button"
              disabled={members.length <= eventConfig?.minTeamSize - 1}
              onClick={() => setMembers(members.slice(0, -1))}
              className="px-3 py-1 rounded-xl bg-gray-700/70 text-white text-xs font-semibold shadow hover:bg-gray-700/90 transition disabled:opacity-50"
              aria-label="Remove member"
            >
              - Remove
            </button>
            <button
              type="button"
              disabled={members.length >= eventConfig?.maxTeamSize - 1}
              onClick={() =>
                setMembers([
                  ...members,
                  {
                    name: "",
                    regno: "",
                    email: "",
                    phone: "",
                    branch: "",
                    section: "",
                    college: "",
                    year: "",
                  },
                ])
              }
              className="px-3 py-1 rounded-xl bg-blue-700/80 text-white text-xs font-semibold shadow hover:bg-blue-700/90 transition disabled:opacity-50"
              aria-label="Add member"
            >
              + Add
            </button>
          </div>
        </div>
        {fieldErrors.members && (
          <p className="text-xs text-red-400 mb-2 animate-fade-in">
            {fieldErrors.members}
          </p>
        )}
        {/* Render a form for each member, styled like leader */}
        {members.map((member, idx) => (
          <div key={idx} className="mb-8">
            <h4 className="text-base font-semibold text-blue-200 mb-2">
              Member {idx + 2}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderParticipantFields(
                member,
                (val) => {
                  const updated = [...members];
                  updated[idx] = val;
                  setMembers(updated);
                },
                fieldErrors,
                `member_${idx}`,
              )}
            </div>
          </div>
        ))}
      </div>

      {showErrorSummary && Object.keys(fieldErrors).length > 0 && (
        <div
          className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-700 text-red-200 animate-fade-in"
          role="alert"
          aria-live="assertive"
        >
          <strong className="block mb-1">
            Please fix the following errors:
          </strong>
          <ul className="list-disc list-inside text-xs">
            {Object.values(fieldErrors).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-3 animate-fade-in">{error}</p>
      )}

      {/* Sticky submit button for mobile */}
      <div className="flex flex-wrap gap-3 mt-8 justify-end sticky bottom-0 bg-linear-to-t from-gray-950/80 via-transparent to-transparent py-4 z-10">
        <button
          type="submit"
          disabled={loading || !teamNameAvailable || checkingTeamName}
          className="px-6 py-3 text-base rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          aria-busy={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2 animate-pulse">
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
              Registering...
            </span>
          ) : (
            <span>Register Team</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setTeamName("");
            setLeader({
              name: "",
              regno: "",
              email: "",
              phone: "",
              branch: "",
              section: "",
              college: "",
              year: "",
            });
            setMembers(
              Array(eventConfig?.minTeamSize - 1)
                .fill()
                .map(() => ({
                  name: "",
                  regno: "",
                  email: "",
                  phone: "",
                  branch: "",
                  section: "",
                  college: "",
                  year: "",
                })),
            );
            setFieldErrors({});
            setError(null);
            setShowErrorSummary(false);
            // Clear localStorage for this event
            if (eventConfig) {
              localStorage.removeItem(`regform_${eventId}`);
            }
          }}
          className="px-6 py-3 text-base rounded-2xl border border-gray-600 bg-transparent hover:bg-gray-800 text-gray-200 font-bold shadow-lg transition-all"
        >
          Clear
        </button>
      </div>
    </form>
  );

  // Render participant fields (leader/member)
  function renderParticipantFields(obj, setObj, fieldErrors, prefix) {
    const fieldMeta = [
      {
        key: "name",
        label: "Full Name",
        icon: <FaUser className="inline mr-1 text-blue-400" />,
      },
      {
        key: "regno",
        label: "Registration Number",
        icon: <FaHashtag className="inline mr-1 text-blue-400" />,
      },
      {
        key: "email",
        label: "Email",
        icon: <FaEnvelope className="inline mr-1 text-blue-400" />,
      },
      {
        key: "phone",
        label: "Phone",
        icon: <FaPhone className="inline mr-1 text-blue-400" />,
      },
      {
        key: "branch",
        label: "Branch",
        icon: <FaBuilding className="inline mr-1 text-blue-400" />,
      },
      {
        key: "section",
        label: "Section",
        icon: <FaBuilding className="inline mr-1 text-blue-400" />,
      },
      {
        key: "college",
        label: "College",
        icon: <FaUniversity className="inline mr-1 text-blue-400" />,
      },
      {
        key: "year",
        label: "Year",
        icon: <FaUniversity className="inline mr-1 text-blue-400" />,
      },
    ];
    return (
      <>
        {fieldMeta.map(({ key, label, icon }) => (
          <div key={key} className="mb-2">
            <label className="text-xs font-semibold tracking-wide text-gray-300 flex items-center gap-1 mb-1">
              {icon} {label}
            </label>
            {key === "year" ? (
              <select
                value={obj.year}
                onChange={(e) => setObj({ ...obj, year: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${fieldErrors[`${prefix}_${key}`] ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
                aria-invalid={!!fieldErrors[`${prefix}_${key}`]}
                aria-describedby={
                  fieldErrors[`${prefix}_${key}`]
                    ? `${prefix}_${key}-error`
                    : undefined
                }
              >
                <option value="">Select year</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <input
                type={
                  key === "email" ? "email" : key === "phone" ? "tel" : "text"
                }
                value={obj[key]}
                onChange={(e) => setObj({ ...obj, [key]: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${fieldErrors[`${prefix}_${key}`] ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
                aria-invalid={!!fieldErrors[`${prefix}_${key}`]}
                aria-describedby={
                  fieldErrors[`${prefix}_${key}`]
                    ? `${prefix}_${key}-error`
                    : undefined
                }
                autoComplete="off"
              />
            )}
            {fieldErrors[`${prefix}_${key}`] && (
              <p
                id={`${prefix}_${key}-error`}
                className="text-xs text-red-400 mt-1 animate-fade-in"
              >
                {fieldErrors[`${prefix}_${key}`]}
              </p>
            )}
          </div>
        ))}
      </>
    );
  }

  // Render correct form
  const form =
    eventConfig && eventConfig.participationType === "team" ? (
      renderTeamForm()
    ) : (
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="w-full max-w-xl mx-auto bg-linear-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-gray-800/60 p-8 rounded-3xl shadow-2xl backdrop-blur-lg relative overflow-hidden"
        aria-label="Register for event"
        tabIndex={-1}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-300 tracking-tight flex items-center gap-2">
            <FaUser className="text-blue-400" />{" "}
            {eventTitle || eventConfig?.title || "Event"}
          </h2>
          <div className="text-gray-400 text-sm mb-2">
            Please provide your details carefully. Your registration number must
            match the one associated with your account.
          </div>
          <div className="h-px bg-linear-to-r from-blue-700/30 via-gray-700/30 to-purple-700/30 my-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderParticipantFields(
            {
              name,
              regno,
              email,
              phone: "",
              branch,
              section: "",
              college,
              year,
            },
            (val) => {
              setName(val.name);
              setRegno(val.regno);
              setEmail(val.email);
              setBranch(val.branch);
              setCollege(val.college);
              setYear(val.year);
            },
            fieldErrors,
            "solo",
          )}
        </div>
        {year === "Other" && (
          <div className="mt-2">
            <label className="text-xs font-semibold tracking-wide text-gray-300 flex items-center gap-1 mb-1">
              <FaUniversity className="inline mr-1 text-blue-400" /> Please
              specify
            </label>
            <input
              type="text"
              value={yearOther}
              onChange={(e) => setYearOther(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${fieldErrors.yearOther ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
              aria-invalid={!!fieldErrors.yearOther}
              aria-describedby={
                fieldErrors.yearOther ? "solo_yearOther-error" : undefined
              }
              autoComplete="off"
            />
            {fieldErrors.yearOther && (
              <p
                id="solo_yearOther-error"
                className="text-xs text-red-400 mt-1 animate-fade-in"
              >
                {fieldErrors.yearOther}
              </p>
            )}
          </div>
        )}
        {showErrorSummary && Object.keys(fieldErrors).length > 0 && (
          <div
            className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-700 text-red-200 animate-fade-in"
            role="alert"
            aria-live="assertive"
          >
            <strong className="block mb-1">
              Please fix the following errors:
            </strong>
            <ul className="list-disc list-inside text-xs">
              {Object.values(fieldErrors).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p className="text-xs text-red-400 mt-3 animate-fade-in">{error}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-8 justify-end sticky bottom-0 bg-linear-to-t from-gray-950/80 via-transparent to-transparent py-4 z-10">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 text-base rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2 animate-pulse">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  ></path>
                </svg>
                Registering...
              </span>
            ) : (
              <span>Register</span>
            )}
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="px-6 py-3 text-base rounded-2xl border border-gray-600 bg-transparent hover:bg-gray-800 text-gray-200 font-bold shadow-lg transition-all"
          >
            Clear
          </button>
        </div>
      </form>
    );

  // If not authenticated, redirect to login
  if (authenticated === false) {
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
    return null;
  }
  if (!fullPage) return form;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center px-2 py-8">
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-blue-400 mb-2 drop-shadow-lg">
            Event Registration
          </h1>
          {eventTitle && (
            <p className="text-lg md:text-xl text-gray-300 mt-2">
              for <span className="font-semibold text-white">{eventTitle}</span>
            </p>
          )}
          <p className="mt-3 text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            Register for your favorite events and join the excitement!
          </p>
        </div>
        <div className="flex justify-center">
          {success ? (
            <div className="w-full max-w-xl mx-auto bg-linear-to-br from-green-900/40 via-green-800/30 to-green-900/40 border border-green-700 rounded-3xl px-6 py-8 text-green-100 text-center shadow-2xl backdrop-blur-lg animate-fade-in">
              <FaCheckCircle className="mx-auto text-4xl text-green-400 mb-2 animate-bounce-in" />
              <h2 className="text-2xl font-bold mb-2">
                Registration Successful!
              </h2>
              <p className="text-base mb-2">
                You are now registered for{" "}
                <span className="font-semibold text-green-200">
                  {eventTitle || eventConfig?.title}
                </span>
                {eventConfig?.participationType === "team" && teamName && (
                  <>
                    <br />
                    as{" "}
                    <span className="font-semibold text-green-200">
                      Team {teamName}
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-green-200 mt-2">
                You can now safely return to the previous page.
              </p>
            </div>
          ) : (
            form
          )}
        </div>
        <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center text-xs md:text-sm text-gray-300">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-gray-800 hover:bg-gray-700 text-gray-200"
          >
            <span className="text-lg">←</span>
            <span>Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
