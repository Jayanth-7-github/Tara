import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEvents, updateEvent } from "../services/api";
import { checkLogin } from "../services/auth";

function createDefaultFormData() {
  return {
    type: "mcq",
    text: "",
    marks: 1,
    options: ["", "", "", ""],
    correctAnswer: 0,
    initialCode: "",
    testCases: [{ input: "", expected: "" }],
    language: "c++",
  };
}

function getQuestionLabel(type) {
  return type === "coding" ? "Practical Task" : "Choice Question";
}

function getQuestionTone(type) {
  return type === "coding"
    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
}

function formatEventDate(value) {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date not set";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SummaryCard({ title, value, subtitle, tone = "blue" }) {
  const tones = {
    blue: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur">
      <div
        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}
      >
        {title}
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

export default function ManageQuestions() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [user, setUser] = useState(null);
  const [examCode, setExamCode] = useState("");
  const [editingIndex, setEditingIndex] = useState(-1);
  const [formData, setFormData] = useState(createDefaultFormData());

  useEffect(() => {
    const init = async () => {
      try {
        const auth = await checkLogin();
        if (
          !auth.authenticated ||
          (auth.user.role !== "admin" && auth.user.role !== "member")
        ) {
          navigate("/main");
          return;
        }

        setUser(auth.user);
        const data = await fetchEvents();
        const allEvents = Array.isArray(data?.events) ? data.events : [];
        const userEmail = (auth.user.email || "").toLowerCase().trim();
        const myEvents = allEvents.filter(
          (event) =>
            (event.managerEmail || "").toLowerCase().trim() === userEmail,
        );
        setEvents(myEvents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  useEffect(() => {
    setMessage({ text: "", type: "" });
    resetForm();

    if (!selectedEventId) {
      setQuestions([]);
      setExamCode("");
      return;
    }

    const event = events.find(
      (item) => item._id === selectedEventId || item.id === selectedEventId,
    );

    if (!event) {
      setQuestions([]);
      setExamCode("");
      return;
    }

    setQuestions(event.questions || []);
    setExamCode(event.examSecurityCode || "");
  }, [selectedEventId, events]);

  const selectedEvent = useMemo(
    () =>
      events.find(
        (item) => item._id === selectedEventId || item.id === selectedEventId,
      ) || null,
    [events, selectedEventId],
  );

  const totalMarks = questions.reduce(
    (sum, question) => sum + (Number(question.marks) || 0),
    0,
  );

  const updateLocalEvent = (id, newQuestions, newExamCode) => {
    setEvents((prev) =>
      prev.map((event) =>
        event._id === id || event.id === id
          ? {
              ...event,
              questions: newQuestions,
              examSecurityCode: newExamCode,
            }
          : event,
      ),
    );
  };

  const resetForm = () => {
    setEditingIndex(-1);
    setFormData(createDefaultFormData());
  };

  const validateForm = () => {
    if (!formData.text.trim()) {
      setMessage({
        text: "Please write the question before adding it.",
        type: "error",
      });
      return false;
    }

    if (formData.type === "mcq") {
      const filledOptions = formData.options.filter((option) => option.trim());
      if (filledOptions.length < 2) {
        setMessage({
          text: "Add at least two answer choices.",
          type: "error",
        });
        return false;
      }

      if (!formData.options[formData.correctAnswer]?.trim()) {
        setMessage({
          text: "Choose the right answer from a filled choice.",
          type: "error",
        });
        return false;
      }
    }

    if (formData.type === "coding") {
      const validChecks = formData.testCases.filter(
        (item) => item.input.trim() || item.expected.trim(),
      );
      if (validChecks.length === 0) {
        setMessage({
          text: "Add at least one check so answers can be reviewed.",
          type: "error",
        });
        return false;
      }
    }

    return true;
  };

  const handleSaveQuestions = async () => {
    if (!selectedEventId) return;

    const normalizedExamCode = examCode.trim();
    if (!/^\d{6}$/.test(normalizedExamCode)) {
      setMessage({
        text: "Please enter a 6-digit access code before saving.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    setMessage({ text: "", type: "" });
    try {
      await updateEvent(selectedEventId, {
        questions,
        examSecurityCode: normalizedExamCode,
      });
      setMessage({
        text: "Your changes have been saved.",
        type: "success",
      });
      updateLocalEvent(selectedEventId, questions, normalizedExamCode);
    } catch (err) {
      console.error(err);
      setMessage({
        text: "We could not save your changes right now.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOrUpdate = () => {
    setMessage({ text: "", type: "" });
    if (!validateForm()) return;

    const questionId =
      editingIndex >= 0
        ? questions[editingIndex]?.id || Date.now().toString()
        : Date.now().toString();

    const nextQuestion = {
      ...formData,
      id: questionId,
      text: formData.text.trim(),
      options: formData.options.map((option) => option.trim()),
      testCases: formData.testCases.map((item) => ({
        input: item.input.trim(),
        expected: item.expected.trim(),
      })),
    };

    if (nextQuestion.type === "mcq") {
      delete nextQuestion.initialCode;
      delete nextQuestion.testCases;
      delete nextQuestion.language;
    } else {
      delete nextQuestion.options;
      delete nextQuestion.correctAnswer;
    }

    if (editingIndex >= 0) {
      const updated = [...questions];
      updated[editingIndex] = nextQuestion;
      setQuestions(updated);
      setMessage({ text: "Question updated in the list.", type: "success" });
    } else {
      setQuestions((prev) => [...prev, nextQuestion]);
      setMessage({ text: "Question added to the list.", type: "success" });
    }

    resetForm();
  };

  const handleEdit = (index) => {
    const question = questions[index];
    setEditingIndex(index);
    setMessage({ text: "", type: "" });
    setFormData({
      type: question.type || "mcq",
      text: question.text || "",
      marks: question.marks || 1,
      options: question.options || ["", "", "", ""],
      correctAnswer: question.correctAnswer || 0,
      initialCode: question.initialCode || "",
      testCases: question.testCases || [{ input: "", expected: "" }],
      language: question.language || "c++",
    });
  };

  const handleDelete = (index) => {
    setQuestions((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    if (editingIndex === index) {
      resetForm();
    } else if (editingIndex > index) {
      setEditingIndex((prev) => prev - 1);
    }
    setMessage({ text: "Question removed from the list.", type: "success" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-400">
            Preparing your question workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white">
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-400">
                Event Questions
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Prepare the question flow for your event
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
                Choose an event, build the question list, and keep everything
                ready in one place.
              </p>
              {user && (
                <p className="mt-3 text-xs text-slate-500">
                  Signed in as{" "}
                  <span className="text-slate-300">
                    {user.name || user.email}
                  </span>
                </p>
              )}
            </div>

            <button
              onClick={() => navigate("/events/dashboard")}
              className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Your Events"
            value={events.length}
            subtitle="Events available for question setup"
            tone="blue"
          />
          <SummaryCard
            title="Questions"
            value={questions.length}
            subtitle={
              selectedEvent
                ? "Questions in the selected event"
                : "Choose an event to begin"
            }
            tone="green"
          />
          <SummaryCard
            title="Total Score"
            value={totalMarks}
            subtitle={
              selectedEvent
                ? "Combined score for this event"
                : "Will update after you choose an event"
            }
            tone="amber"
          />
        </div>

        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Choose Event
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Select the event you want to work on
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Only events assigned to you are shown here.
              </p>

              <select
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                <option value="">Choose an event</option>
                {events.map((event) => (
                  <option
                    key={event._id || event.id}
                    value={event._id || event.id}
                  >
                    {event.title}
                  </option>
                ))}
              </select>

              {events.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">
                  No events are available for question setup yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Access Code
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Set a 6-digit access code
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Participants will enter this code before starting. Exactly 6
                digits are required.
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={examCode}
                onChange={(event) =>
                  setExamCode(event.target.value.replace(/[^0-9]/g, ""))
                }
                disabled={!selectedEventId}
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-lg tracking-widest text-white outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="123456"
              />
              <p className="mt-2 text-xs text-slate-500">
                Enter all 6 digits before saving.
              </p>
            </div>
          </div>
        </div>

        {!selectedEventId ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-cyan-300">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              Choose an event to get started
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
              Once you choose an event, you can build the question list, set the
              access code, and save everything from one screen.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Selected Event
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {selectedEvent?.title || "Selected Event"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {selectedEvent?.venue || "Venue not added"} •{" "}
                      {formatEventDate(selectedEvent?.date)}
                    </p>
                  </div>

                  <button
                    onClick={handleSaveQuestions}
                    disabled={isSaving}
                    className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                      isSaving
                        ? "cursor-not-allowed bg-slate-700 text-slate-300"
                        : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    }`}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                {message.text && (
                  <div
                    className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                      message.type === "error"
                        ? "border-red-500/30 bg-red-500/10 text-red-200"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    }`}
                  >
                    {message.text}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Question List
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {questions.length} item{questions.length === 1 ? "" : "s"}{" "}
                      ready
                    </h3>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                    Total score {totalMarks}
                  </span>
                </div>

                <div className="mt-6 space-y-3 overflow-y-auto pr-1 h-96">
                  {questions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-5 py-8 text-center text-sm text-slate-400">
                      Start by adding the first question for this event.
                    </div>
                  ) : (
                    questions.map((question, index) => (
                      <div
                        key={question.id || index}
                        className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-4 transition hover:border-cyan-500/40"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-medium ${getQuestionTone(question.type)}`}
                              >
                                {getQuestionLabel(question.type)}
                              </span>
                              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                                Score {question.marks || 1}
                              </span>
                            </div>
                            <p className="text-sm font-medium leading-6 text-slate-100 sm:text-base">
                              {question.text}
                            </p>
                          </div>

                          <div className="flex gap-2 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                            <button
                              onClick={() => handleEdit(index)}
                              className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(index)}
                              className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur xl:sticky xl:top-8 h-fit">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    Question Editor
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {editingIndex >= 0
                      ? "Update this question"
                      : "Add a new question"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Fill in the details below and add it to the list when you
                    are ready.
                  </p>
                </div>
                {editingIndex >= 0 && (
                  <button
                    onClick={resetForm}
                    className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Question style
                  </label>
                  <select
                    value={formData.type}
                    onChange={(event) =>
                      setFormData({ ...formData, type: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                  >
                    <option value="mcq">Choice Question</option>
                    <option value="coding">Practical Task</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Question
                  </label>
                  <textarea
                    value={formData.text}
                    onChange={(event) =>
                      setFormData({ ...formData, text: event.target.value })
                    }
                    className="h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                    placeholder="Write the question here..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Score
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.marks}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        marks: parseInt(event.target.value, 10) || 1,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                  />
                </div>

                {formData.type === "mcq" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Answer choices
                    </label>
                    <div className="space-y-3">
                      {formData.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3"
                        >
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={formData.correctAnswer === index}
                            onChange={() =>
                              setFormData({ ...formData, correctAnswer: index })
                            }
                            className="h-4 w-4 accent-cyan-400"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(event) => {
                              const nextOptions = [...formData.options];
                              nextOptions[index] = event.target.value;
                              setFormData({
                                ...formData,
                                options: nextOptions,
                              });
                            }}
                            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                            placeholder={`Choice ${index + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Select the circle beside the right answer.
                    </p>
                  </div>
                )}

                {formData.type === "coding" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Answer checks
                    </label>
                    <div className="space-y-3">
                      {formData.testCases.map((testCase, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              placeholder="What is given"
                              value={testCase.input}
                              onChange={(event) => {
                                const nextCases = [...formData.testCases];
                                nextCases[index].input = event.target.value;
                                setFormData({
                                  ...formData,
                                  testCases: nextCases,
                                });
                              }}
                              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
                            />
                            <input
                              placeholder="Expected result"
                              value={testCase.expected}
                              onChange={(event) => {
                                const nextCases = [...formData.testCases];
                                nextCases[index].expected = event.target.value;
                                setFormData({
                                  ...formData,
                                  testCases: nextCases,
                                });
                              }}
                              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
                            />
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => {
                                const nextCases = formData.testCases.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                );
                                setFormData({
                                  ...formData,
                                  testCases:
                                    nextCases.length > 0
                                      ? nextCases
                                      : [{ input: "", expected: "" }],
                                });
                              }}
                              className="text-sm font-medium text-red-300 transition hover:text-red-200"
                            >
                              Remove check
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          testCases: [
                            ...formData.testCases,
                            { input: "", expected: "" },
                          ],
                        })
                      }
                      className="mt-3 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
                    >
                      + Add another check
                    </button>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddOrUpdate}
                    className="flex-1 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    {editingIndex >= 0 ? "Update in List" : "Add to List"}
                  </button>
                  {editingIndex >= 0 && (
                    <button
                      onClick={resetForm}
                      className="rounded-full border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
