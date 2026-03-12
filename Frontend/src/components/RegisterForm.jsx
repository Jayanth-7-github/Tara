import React, { useEffect, useRef, useState } from "react";
import {
  checkPaymentReferenceAvailability,
  fetchActivePaymentQr,
  fetchEventById,
  registerForEvent,
} from "../services/api";
import { API_BASE } from "../services/constants";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBuilding,
  FaCheckCircle,
  FaEnvelope,
  FaHashtag,
  FaMoneyBillWave,
  FaPhone,
  FaQrcode,
  FaReceipt,
  FaUniversity,
  FaUser,
  FaUsers,
} from "react-icons/fa";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

const PAYMENT_FILE_LIMIT = 5 * 1024 * 1024;

function createParticipant(overrides = {}) {
  return {
    name: "",
    regno: "",
    email: "",
    phone: "",
    branch: "",
    section: "",
    college: "",
    year: "",
    ...overrides,
  };
}

function createMembers(count) {
  return Array(Math.max(count, 0))
    .fill(null)
    .map(() => createParticipant());
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read screenshot"));
    reader.readAsDataURL(file);
  });
}

export default function RegisterForm({
  eventId,
  onRegistered,
  fullPage = false,
  onBack,
  eventTitle,
}) {
  const [authenticated, setAuthenticated] = useState(null);
  const [eventConfig, setEventConfig] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [leader, setLeader] = useState(createParticipant());
  const [members, setMembers] = useState([]);
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
  const [submissionPendingVerification, setSubmissionPendingVerification] =
    useState(false);
  const [myRegno, setMyRegno] = useState("");
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [teamNameAvailable, setTeamNameAvailable] = useState(true);
  const [checkingTeamName, setCheckingTeamName] = useState(false);
  const [step, setStep] = useState("details");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentReferenceAvailable, setPaymentReferenceAvailable] =
    useState(true);
  const [checkingPaymentReference, setCheckingPaymentReference] =
    useState(false);
  const [paymentScreenshotName, setPaymentScreenshotName] = useState("");
  const [paymentScreenshotBase64, setPaymentScreenshotBase64] = useState("");
  const [paymentScreenshotType, setPaymentScreenshotType] = useState("");
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState("");
  const [activePaymentQr, setActivePaymentQr] = useState(null);
  const [loadingPaymentQr, setLoadingPaymentQr] = useState(false);
  const [paymentQrError, setPaymentQrError] = useState("");
  const formRef = useRef(null);

  const debouncedTeamName = useDebounce(teamName, 400);
  const debouncedPaymentReference = useDebounce(paymentReference, 400);
  const isTeamEvent = eventConfig?.participationType === "team";
  const isPaidEvent = Number(eventConfig?.price || 0) > 0;
  const teamSize = isTeamEvent ? 1 + members.length : 1;
  const payableAmount = Number(eventConfig?.price || 0) * teamSize;

  const handleBack = () => {
    if (onBack) onBack();
    else if (typeof window !== "undefined" && window.history) {
      window.history.back();
    }
  };

  const scrollToForm = () => {
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  };

  useEffect(() => {
    let mounted = true;

    import("../services/auth").then(({ checkLogin }) => {
      checkLogin()
        .then((resp) => {
          if (!mounted) return;

          setAuthenticated(resp.authenticated);
          const user = resp?.user;
          const normalizedRegno = String(user?.regno || "")
            .trim()
            .toUpperCase();
          if (normalizedRegno) {
            setMyRegno(normalizedRegno);
            setRegno((prev) => prev || normalizedRegno);
            setLeader((prev) => ({
              ...prev,
              regno: prev.regno || normalizedRegno,
            }));
          }
          if (user?.name) {
            setName((prev) => prev || user.name);
            setLeader((prev) => ({
              ...prev,
              name: prev.name || user.name,
            }));
          }
          if (user?.email) {
            setEmail((prev) => prev || user.email);
            setLeader((prev) => ({
              ...prev,
              email: prev.email || user.email,
            }));
          }
        })
        .catch(() => {
          if (mounted) setAuthenticated(false);
        });
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const ev = await fetchEventById(eventId);
        if (!mounted) return;

        setEventConfig(ev);
        const saved = localStorage.getItem(`regform_${eventId}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (ev.participationType === "team") {
            setTeamName(data.teamName || "");
            setLeader((prev) => ({
              ...prev,
              ...createParticipant(data.leader || {}),
            }));
            const minMembers = Math.max(Number(ev.minTeamSize || 1) - 1, 0);
            const savedMembers = Array.isArray(data.members)
              ? data.members.map((member) => createParticipant(member))
              : [];
            setMembers(
              savedMembers.length >= minMembers
                ? savedMembers
                : [
                    ...savedMembers,
                    ...createMembers(minMembers - savedMembers.length),
                  ],
            );
          } else {
            setName(data.name || "");
            setRegno(data.regno || "");
            setEmail(data.email || "");
            setBranch(data.branch || "");
            setCollege(data.college || "");
            setYear(data.year || "");
            setYearOther(data.yearOther || "");
          }

          setPaymentReference(data.paymentReference || "");
          setStep(
            Number(ev.price || 0) > 0 && data.step === "payment"
              ? "payment"
              : "details",
          );
        } else if (ev.participationType === "team") {
          setMembers(
            createMembers(Math.max(Number(ev.minTeamSize || 1) - 1, 0)),
          );
        }
      } catch {
        // ignore event fetch failure here; existing error handling is enough
      }
    })();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventConfig) return;

    const key = `regform_${eventId}`;
    const payload = isTeamEvent
      ? {
          teamName,
          leader,
          members,
          paymentReference,
          step: isPaidEvent ? step : "details",
        }
      : {
          name,
          regno,
          email,
          branch,
          college,
          year,
          yearOther,
          paymentReference,
          step: isPaidEvent ? step : "details",
        };

    localStorage.setItem(key, JSON.stringify(payload));
  }, [
    branch,
    college,
    email,
    eventConfig,
    eventId,
    isPaidEvent,
    isTeamEvent,
    leader,
    members,
    name,
    paymentReference,
    regno,
    step,
    teamName,
    year,
    yearOther,
  ]);

  useEffect(() => {
    if (!isTeamEvent) return;
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
          (team) =>
            String(team.name || "")
              .trim()
              .toLowerCase() === debouncedTeamName.trim().toLowerCase(),
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
  }, [debouncedTeamName, eventId, isTeamEvent]);

  useEffect(() => {
    if (!isPaidEvent) {
      setActivePaymentQr(null);
      setPaymentQrError("");
      setLoadingPaymentQr(false);
      return;
    }

    let ignore = false;
    setLoadingPaymentQr(true);
    setPaymentQrError("");
    fetchActivePaymentQr(eventId)
      .then((data) => {
        if (ignore) return;
        setActivePaymentQr(data.item || null);
        if (!data.item) {
          setPaymentQrError(
            "Payment QR is not available for this event yet. Please contact the organizer.",
          );
        }
      })
      .catch((err) => {
        if (ignore) return;
        setActivePaymentQr(null);
        setPaymentQrError(err.message || "Failed to load payment QR.");
      })
      .finally(() => {
        if (!ignore) setLoadingPaymentQr(false);
      });

    return () => {
      ignore = true;
    };
  }, [eventId, isPaidEvent]);

  useEffect(() => {
    if (!isPaidEvent) return;
    if (!debouncedPaymentReference.trim()) {
      setPaymentReferenceAvailable(true);
      setCheckingPaymentReference(false);
      return;
    }

    let ignore = false;
    setCheckingPaymentReference(true);
    checkPaymentReferenceAvailability(eventId, debouncedPaymentReference)
      .then((data) => {
        if (ignore) return;
        setPaymentReferenceAvailable(Boolean(data.available));
        setCheckingPaymentReference(false);
      })
      .catch(() => {
        if (!ignore) setCheckingPaymentReference(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedPaymentReference, eventId, isPaidEvent]);

  const clearPaymentFields = () => {
    setPaymentReference("");
    setPaymentReferenceAvailable(true);
    setCheckingPaymentReference(false);
    setPaymentScreenshotName("");
    setPaymentScreenshotBase64("");
    setPaymentScreenshotType("");
    setPaymentScreenshotPreview("");
  };

  const clearForm = () => {
    setError(null);
    setFieldErrors({});
    setShowErrorSummary(false);
    setStep("details");
    clearPaymentFields();

    if (isTeamEvent) {
      setTeamName("");
      setLeader(
        createParticipant({
          regno: myRegno || "",
          email: email || "",
        }),
      );
      setMembers(
        createMembers(Math.max(Number(eventConfig?.minTeamSize || 1) - 1, 0)),
      );
    } else {
      setName("");
      setRegno(myRegno || "");
      setEmail("");
      setBranch("");
      setCollege("");
      setYear("");
      setYearOther("");
    }

    if (eventConfig) {
      localStorage.removeItem(`regform_${eventId}`);
    }
  };

  const validate = (
    section = isPaidEvent && step === "payment" ? "all" : "details",
  ) => {
    const errs = {};

    if (section === "details" || section === "all") {
      if (isTeamEvent) {
        if (!teamName.trim()) errs.teamName = "Team name is required.";
        if (!teamNameAvailable)
          errs.teamName = "This team name is already taken for this event.";
        if (checkingTeamName)
          errs.teamName = "Wait until team name availability is confirmed.";

        [
          "name",
          "regno",
          "email",
          "phone",
          "branch",
          "section",
          "college",
          "year",
        ].forEach((key) => {
          if (!String(leader[key] || "").trim()) {
            errs[`leader_${key}`] = `Leader ${key} is required.`;
          }
        });

        if (members.length < Number(eventConfig?.minTeamSize || 1) - 1) {
          errs.members = `At least ${Number(eventConfig?.minTeamSize || 1) - 1} member(s) required.`;
        }
        if (members.length > Number(eventConfig?.maxTeamSize || 1) - 1) {
          errs.members = `No more than ${Number(eventConfig?.maxTeamSize || 1) - 1} members allowed.`;
        }

        const regnoSet = new Set();
        const leaderRegno = String(leader.regno || "")
          .trim()
          .toUpperCase();
        if (leaderRegno) regnoSet.add(leaderRegno);

        members.forEach((member, index) => {
          [
            "name",
            "regno",
            "email",
            "phone",
            "branch",
            "section",
            "college",
            "year",
          ].forEach((key) => {
            if (!String(member[key] || "").trim()) {
              errs[`member_${index}_${key}`] =
                `Member ${index + 1} ${key} is required.`;
            }
          });

          const memberRegno = String(member.regno || "")
            .trim()
            .toUpperCase();
          if (memberRegno) {
            if (regnoSet.has(memberRegno)) {
              errs[`member_${index}_regno`] =
                "Every team member must have a unique registration number.";
            }
            regnoSet.add(memberRegno);
          }
        });
      } else {
        if (!name.trim()) errs.solo_name = "Full name is required.";
        if (!regno.trim()) errs.solo_regno = "Registration number is required.";
        if (myRegno && regno.trim().toUpperCase() !== myRegno) {
          errs.solo_regno = "Registration number must match your account.";
        }
        if (!email.trim()) errs.solo_email = "Email is required.";
        if (!year) errs.solo_year = "Please select your year.";
        if (year === "Other" && !yearOther.trim()) {
          errs.yearOther = "Please specify your year.";
        }
      }
    }

    if ((section === "payment" || section === "all") && isPaidEvent) {
      if (!activePaymentQr?.imageUrl) {
        errs.paymentQr =
          paymentQrError ||
          "Payment QR is not available for this event yet. Please contact the organizer.";
      }
      if (!paymentReference.trim()) {
        errs.paymentReference = "Transaction ID / UTR number is required.";
      } else if (checkingPaymentReference) {
        errs.paymentReference =
          "Wait until the transaction ID / UTR number check is complete.";
      } else if (!paymentReferenceAvailable) {
        errs.paymentReference =
          "This transaction ID / UTR number is already used.";
      }
      if (!paymentScreenshotBase64) {
        errs.paymentScreenshot = "Payment screenshot is required.";
      }
    }

    setShowErrorSummary(Object.keys(errs).length > 0);
    return errs;
  };

  const handlePaymentScreenshotChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    if (file.size > PAYMENT_FILE_LIMIT) {
      setFieldErrors((prev) => ({
        ...prev,
        paymentScreenshot: "Payment screenshot must be under 5MB.",
      }));
      return;
    }

    try {
      const base64 = await readFileAsDataUrl(file);
      setPaymentScreenshotName(file.name);
      setPaymentScreenshotBase64(base64);
      setPaymentScreenshotType(file.type || "image/png");
      setPaymentScreenshotPreview(base64);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.paymentScreenshot;
        return next;
      });
    } catch (err) {
      setError(err.message || "Failed to read payment screenshot.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setShowErrorSummary(false);
    setSubmissionPendingVerification(false);

    if (isPaidEvent && step === "details") {
      const detailErrors = validate("details");
      setFieldErrors(detailErrors);
      if (Object.keys(detailErrors).length > 0) {
        scrollToForm();
        return;
      }

      setFieldErrors({});
      setStep("payment");
      scrollToForm();
      return;
    }

    const errs = validate(isPaidEvent ? "all" : "details");
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      scrollToForm();
      return;
    }

    setLoading(true);
    try {
      const paymentPayload = isPaidEvent
        ? {
            paymentReference: paymentReference.trim(),
            paymentScreenshotBase64,
            paymentScreenshotType,
          }
        : {};

      let submissionResult = null;
      if (isTeamEvent) {
        const resp = await fetch(`${API_BASE}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            eventId,
            name: teamName.trim(),
            leader: {
              ...leader,
              regno: leader.regno.trim().toUpperCase(),
            },
            members: members.map((member) => ({
              ...member,
              regno: String(member.regno || "")
                .trim()
                .toUpperCase(),
            })),
            ...paymentPayload,
          }),
        });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(body.error || "Team registration failed");
        }
        submissionResult = body;
      } else {
        submissionResult = await registerForEvent(eventId, {
          name: name.trim(),
          email: email.trim(),
          regno: regno.trim().toUpperCase(),
          branch: branch.trim(),
          college: college.trim(),
          year: year === "Other" ? yearOther.trim() : year,
          ...paymentPayload,
        });
      }

      localStorage.removeItem(`regform_${eventId}`);
      setSubmissionPendingVerification(
        Boolean(submissionResult?.verificationPending),
      );
      setSuccess(true);
      if (onRegistered) onRegistered();
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  function renderParticipantFields(obj, setObj, errors, prefix) {
    const fields = [
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
        {fields.map(({ key, label, icon }) => (
          <div key={key} className="mb-2">
            <label className="text-xs font-semibold tracking-wide text-gray-300 flex items-center gap-1 mb-1">
              {icon} {label}
            </label>
            {key === "year" ? (
              <select
                value={obj.year}
                onChange={(event) =>
                  setObj({ ...obj, year: event.target.value })
                }
                className={`w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${errors[`${prefix}_${key}`] ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
                aria-invalid={!!errors[`${prefix}_${key}`]}
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
                onChange={(event) =>
                  setObj({ ...obj, [key]: event.target.value })
                }
                className={`w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${errors[`${prefix}_${key}`] ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
                aria-invalid={!!errors[`${prefix}_${key}`]}
                autoComplete="off"
              />
            )}
            {errors[`${prefix}_${key}`] && (
              <p className="text-xs text-red-400 mt-1 animate-fade-in">
                {errors[`${prefix}_${key}`]}
              </p>
            )}
          </div>
        ))}
      </>
    );
  }

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-800/50 bg-linear-to-br from-emerald-950/40 via-gray-900/70 to-slate-950/80 p-5 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">
              Payment Step
            </p>
            <h3 className="mt-1 text-xl font-bold text-white flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-300" />
              Pay ₹{payableAmount.toLocaleString("en-IN")}
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              Scan the QR below, complete the payment, enter your transaction ID
              or UTR number, then upload the payment screenshot.
            </p>
            {isTeamEvent && (
              <p className="mt-2 text-xs text-emerald-200/80">
                ₹{Number(eventConfig?.price || 0).toLocaleString("en-IN")} per
                person x {teamSize} member{teamSize > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/20 px-4 py-3 text-right">
            <p className="text-xs text-emerald-200/80">Amount</p>
            <p className="text-2xl font-black text-emerald-100">
              ₹{payableAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="rounded-3xl border border-gray-800/70 bg-gray-950/60 p-5">
          <h4 className="text-sm font-semibold tracking-wide text-gray-200 flex items-center gap-2 mb-4">
            <FaQrcode className="text-blue-300" /> Scan This QR
          </h4>
          {loadingPaymentQr ? (
            <div className="min-h-64 rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 flex items-center justify-center text-sm text-gray-400">
              Loading payment QR...
            </div>
          ) : activePaymentQr?.imageUrl ? (
            <div className="space-y-4">
              <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-3xl border border-gray-800 bg-white p-3 shadow-inner sm:max-w-[280px]">
                <img
                  src={activePaymentQr.imageUrl}
                  alt={activePaymentQr.title || "Payment QR"}
                  className="h-auto w-full rounded-2xl object-contain"
                />
              </div>
              {activePaymentQr.title && (
                <p className="text-center text-sm text-gray-300">
                  {activePaymentQr.title}
                </p>
              )}
            </div>
          ) : (
            <div className="min-h-64 rounded-2xl border border-dashed border-red-700/60 bg-red-950/20 flex items-center justify-center px-4 text-center text-sm text-red-200">
              {paymentQrError ||
                "Payment QR is not available for this event yet. Please contact the organizer."}
            </div>
          )}
          {fieldErrors.paymentQr && (
            <p className="mt-2 text-xs text-red-400">{fieldErrors.paymentQr}</p>
          )}
        </div>

        <div className="rounded-3xl border border-gray-800/70 bg-gray-950/60 p-5 space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-2">
              <FaReceipt className="text-blue-300" /> Transaction ID / UTR
              Number
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              className={`w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${fieldErrors.paymentReference || !paymentReferenceAvailable ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
              autoComplete="off"
              placeholder="Enter transaction ID or UTR number"
            />
            {fieldErrors.paymentReference ? (
              <p className="mt-2 text-xs text-red-400">
                {fieldErrors.paymentReference}
              </p>
            ) : paymentReference.trim() ? (
              <p
                className={`mt-2 text-xs ${checkingPaymentReference ? "text-blue-300" : paymentReferenceAvailable ? "text-green-400" : "text-red-400"}`}
              >
                {checkingPaymentReference
                  ? "Checking transaction ID / UTR number..."
                  : paymentReferenceAvailable
                    ? "Transaction ID / UTR number is available."
                    : "This transaction ID / UTR number is already used."}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-2">
              <FaReceipt className="text-blue-300" /> Payment Screenshot
            </label>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 px-4 py-6 text-center hover:border-blue-500/60 hover:bg-gray-900/70 transition">
              <span className="text-sm font-semibold text-gray-200">
                Upload payment screenshot
              </span>
              <span className="mt-2 text-xs text-gray-400">
                PNG, JPG or WEBP up to 5MB
              </span>
              {paymentScreenshotName && (
                <span className="mt-3 text-xs text-emerald-300">
                  {paymentScreenshotName}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePaymentScreenshotChange}
              />
            </label>
            {fieldErrors.paymentScreenshot && (
              <p className="mt-2 text-xs text-red-400">
                {fieldErrors.paymentScreenshot}
              </p>
            )}
          </div>

          {paymentScreenshotPreview && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gray-400">
                Screenshot Preview
              </p>
              <div className="w-full max-w-[180px] overflow-hidden rounded-2xl border border-gray-800/80 bg-black/20">
                <img
                  src={paymentScreenshotPreview}
                  alt="Payment screenshot preview"
                  className="h-32 w-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderErrorSummary = () =>
    showErrorSummary && Object.keys(fieldErrors).length > 0 ? (
      <div
        className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-700 text-red-200 animate-fade-in"
        role="alert"
        aria-live="assertive"
      >
        <strong className="block mb-1">Please fix the following errors:</strong>
        <ul className="list-disc list-inside text-xs">
          {Object.values(fieldErrors).map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      </div>
    ) : null;

  const renderFooterActions = () => {
    const disablePrimary =
      loading ||
      (step === "details" &&
        isTeamEvent &&
        (!teamNameAvailable || checkingTeamName)) ||
      (step === "payment" &&
        (checkingPaymentReference ||
          !paymentReferenceAvailable ||
          !activePaymentQr?.imageUrl));

    let buttonLabel = "Register";
    if (loading) {
      buttonLabel = "Registering...";
    } else if (isPaidEvent && step === "details") {
      buttonLabel = "Next";
    } else if (isTeamEvent) {
      buttonLabel = "Register Team";
    }

    return (
      <div className="flex flex-wrap gap-3 mt-8 justify-end sticky bottom-0 bg-linear-to-t from-gray-950/80 via-transparent to-transparent py-4 z-10">
        {isPaidEvent && step === "payment" && (
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError(null);
              setShowErrorSummary(false);
            }}
            className="px-6 py-3 text-base rounded-2xl border border-gray-600 bg-transparent hover:bg-gray-800 text-gray-200 font-bold shadow-lg transition-all inline-flex items-center gap-2"
          >
            <FaArrowLeft /> Back
          </button>
        )}
        <button
          type="submit"
          disabled={disablePrimary}
          className="px-6 py-3 text-base rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/40 inline-flex items-center gap-2"
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
              {buttonLabel}
            </span>
          ) : (
            <>
              <span>{buttonLabel}</span>
              {isPaidEvent && step === "details" ? <FaArrowRight /> : null}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={step === "payment" ? clearPaymentFields : clearForm}
          className="px-6 py-3 text-base rounded-2xl border border-gray-600 bg-transparent hover:bg-gray-800 text-gray-200 font-bold shadow-lg transition-all"
        >
          {step === "payment" ? "Clear Payment" : "Clear"}
        </button>
      </div>
    );
  };

  const renderTeamDetails = () => (
    <>
      <div className="mb-8">
        <label className="block mb-2">
          <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <FaHashtag className="text-blue-400" /> Team Name
          </span>
          <input
            type="text"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            className={`mt-1 w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${fieldErrors.teamName || !teamNameAvailable ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
            autoComplete="off"
          />
          {fieldErrors.teamName ? (
            <p className="text-xs text-red-400 mt-1 animate-fade-in">
              {fieldErrors.teamName}
            </p>
          ) : teamName ? (
            <p
              className={`text-xs mt-1 animate-fade-in ${checkingTeamName ? "text-blue-300" : teamNameAvailable ? "text-green-400" : "text-red-400"}`}
            >
              {checkingTeamName
                ? "Checking team name availability..."
                : teamNameAvailable
                  ? "Team name is available."
                  : "This team name is already taken for this event."}
            </p>
          ) : null}
        </label>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold text-blue-300 mb-2 flex items-center gap-2">
          <FaUser className="text-blue-400" /> Team Leader Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderParticipantFields(leader, setLeader, fieldErrors, "leader")}
        </div>
      </div>

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
              disabled={
                members.length <= Number(eventConfig?.minTeamSize || 1) - 1
              }
              onClick={() => setMembers((prev) => prev.slice(0, -1))}
              className="px-3 py-1 rounded-xl bg-gray-700/70 text-white text-xs font-semibold shadow hover:bg-gray-700/90 transition disabled:opacity-50"
            >
              - Remove
            </button>
            <button
              type="button"
              disabled={
                members.length >= Number(eventConfig?.maxTeamSize || 1) - 1
              }
              onClick={() =>
                setMembers((prev) => [...prev, createParticipant()])
              }
              className="px-3 py-1 rounded-xl bg-blue-700/80 text-white text-xs font-semibold shadow hover:bg-blue-700/90 transition disabled:opacity-50"
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
        {members.map((member, index) => (
          <div key={index} className="mb-8">
            <h4 className="text-base font-semibold text-blue-200 mb-2">
              Member {index + 2}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderParticipantFields(
                member,
                (value) => {
                  const nextMembers = [...members];
                  nextMembers[index] = value;
                  setMembers(nextMembers);
                },
                fieldErrors,
                `member_${index}`,
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderSoloDetails = () => (
    <>
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
          (value) => {
            setName(value.name);
            setRegno(value.regno);
            setEmail(value.email);
            setBranch(value.branch);
            setCollege(value.college);
            setYear(value.year);
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
            onChange={(event) => setYearOther(event.target.value)}
            className={`w-full px-4 py-3 rounded-xl bg-gray-800/70 text-white border ${fieldErrors.yearOther ? "border-red-500" : "border-gray-700/70"} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base`}
            autoComplete="off"
          />
          {fieldErrors.yearOther && (
            <p className="text-xs text-red-400 mt-1 animate-fade-in">
              {fieldErrors.yearOther}
            </p>
          )}
        </div>
      )}
    </>
  );

  const form = (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`w-full ${isTeamEvent ? "max-w-2xl" : "max-w-xl"} mx-auto bg-linear-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-gray-800/60 p-8 rounded-3xl shadow-2xl backdrop-blur-lg relative overflow-hidden`}
      aria-label={
        isTeamEvent ? "Register Team for event" : "Register for event"
      }
      tabIndex={-1}
    >
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <h2 className="text-2xl font-bold text-blue-300 tracking-tight flex items-center gap-2">
            {isTeamEvent ? (
              <FaUsers className="text-blue-400" />
            ) : (
              <FaUser className="text-blue-400" />
            )}
            {eventTitle || eventConfig?.title || "Event"}
          </h2>
          {isTeamEvent && eventConfig ? (
            <span className="text-xs md:text-sm text-blue-200 bg-blue-900/30 px-3 py-1 rounded-full font-semibold shadow-inner">
              Team Size: {eventConfig.minTeamSize}
              {eventConfig.maxTeamSize !== eventConfig.minTeamSize
                ? `–${eventConfig.maxTeamSize}`
                : ""}{" "}
              members
            </span>
          ) : null}
        </div>
        <div className="text-gray-400 text-sm mb-2">
          {isPaidEvent
            ? step === "details"
              ? "Fill in your registration details first. After that, you will continue to the payment step."
              : "Complete your payment details and upload the screenshot before submitting your registration."
            : isTeamEvent
              ? "Please fill in all required details. All team members must be unique."
              : "Please provide your details carefully. Your registration number must match the one associated with your account."}
        </div>
        <div className="h-px bg-linear-to-r from-blue-700/30 via-gray-700/30 to-purple-700/30 my-4" />
      </div>

      {isPaidEvent && (
        <div className="mb-6 flex items-center gap-3 text-xs text-gray-300">
          <div
            className={`rounded-full px-3 py-1 font-semibold ${step === "details" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300"}`}
          >
            1. Details
          </div>
          <div className="h-px flex-1 bg-gray-800" />
          <div
            className={`rounded-full px-3 py-1 font-semibold ${step === "payment" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-300"}`}
          >
            2. Payment
          </div>
        </div>
      )}

      {step === "details"
        ? isTeamEvent
          ? renderTeamDetails()
          : renderSoloDetails()
        : renderPaymentStep()}

      {renderErrorSummary()}
      {error && (
        <p className="text-xs text-red-400 mt-3 animate-fade-in">{error}</p>
      )}
      {renderFooterActions()}
    </form>
  );

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
                {submissionPendingVerification
                  ? "Payment Submitted for Verification!"
                  : "Registration Successful!"}
              </h2>
              {submissionPendingVerification ? (
                <p className="text-base mb-2">
                  Your payment proof for{" "}
                  <span className="font-semibold text-green-200">
                    {eventTitle || eventConfig?.title}
                  </span>
                  {isTeamEvent && teamName && (
                    <>
                      <br />
                      was submitted for{" "}
                      <span className="font-semibold text-green-200">
                        Team {teamName}
                      </span>
                    </>
                  )}
                  . Registration will be confirmed after organizer approval.
                </p>
              ) : (
                <p className="text-base mb-2">
                  You are now registered for{" "}
                  <span className="font-semibold text-green-200">
                    {eventTitle || eventConfig?.title}
                  </span>
                  {isTeamEvent && teamName && (
                    <>
                      <br />
                      as{" "}
                      <span className="font-semibold text-green-200">
                        Team {teamName}
                      </span>
                    </>
                  )}
                </p>
              )}
              {isPaidEvent && (
                <p className="text-sm text-green-100/90">
                  Your payment proof has been submitted with transaction
                  reference {paymentReference.trim()} for ₹
                  {payableAmount.toLocaleString("en-IN")}.
                </p>
              )}
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
