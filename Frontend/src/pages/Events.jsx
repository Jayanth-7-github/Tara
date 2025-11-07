import React from "react";
import { Link } from "react-router-dom";

const events = [
  {
    id: 1,
    title: "Orientation Meet",
    date: "Nov 20, 2025",
    location: "Auditorium",
    desc: "Welcome session and campus overview.",
  },
  {
    id: 2,
    title: "Tech Talk: AI in Education",
    date: "Nov 28, 2025",
    location: "Hall B",
    desc: "Guest lecture on AI trends for learning.",
  },
  {
    id: 3,
    title: "Sports Day",
    date: "Dec 05, 2025",
    location: "Main Ground",
    desc: "Annual sports events and competitions.",
  },
];

export default function Events() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Events
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Stay informed about upcoming campus activities.
            </p>
          </div>
          <Link to="/main" className="text-sm text-gray-300 hover:text-white">
            ← Back to Dashboard
          </Link>
        </header>
        <div className="grid gap-5">
          {events.map((ev) => (
            <article
              key={ev.id}
              className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-100">
                  {ev.title}
                </h2>
                <span className="text-xs px-2 py-1 rounded bg-blue-600/30 text-blue-300 border border-blue-700/40">
                  {ev.date}
                </span>
              </div>
              <div className="text-xs text-gray-400 flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-4 h-4"
                  >
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 21H3a2 2 0 01-2-2V5a2 2 0 012-2h14l6 6v10a2 2 0 01-2 2z" />
                  </svg>
                  {ev.location}
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{ev.desc}</p>
              <div className="mt-2 flex gap-3">
                <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 transition shadow">
                  Remind Me
                </button>
                <button className="px-4 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition">
                  Add to Calendar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
