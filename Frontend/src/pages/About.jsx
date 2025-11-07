import React from "react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-16 font-sans">
      <div className="max-w-4xl mx-auto bg-gray-900/70 backdrop-blur-lg border border-gray-800 shadow-2xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 bg-linear-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
          About Tara
        </h1>
        <p className="text-gray-300 leading-relaxed text-base sm:text-lg mb-6">
          Tara is a lightweight attendance and event management platform focused
          on speed, clarity, and flexibility. Built with a modern React frontend
          and a Node/Express backend, it enables organizers to capture presence,
          manage student records, export data, and adapt to different event
          contexts seamlessly.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 mb-8">
          <div className="border border-gray-700 bg-gray-800/40 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              Key Features
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
              <li>Fast attendance marking</li>
              <li>Bulk student upload (JSON)</li>
              <li>Detailed attendance editing</li>
              <li>CSV export by event</li>
              <li>Responsive admin dashboard</li>
            </ul>
          </div>
          <div className="border border-gray-700 bg-gray-800/40 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              Tech Stack
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
              <li>React + Vite</li>
              <li>Tailwind-style utility classes</li>
              <li>Framer Motion animations</li>
              <li>Node.js / Express API</li>
              <li>MongoDB via Mongoose</li>
            </ul>
          </div>
        </div>
        <div className="space-y-4 mb-10">
          <h3 className="text-xl font-semibold text-blue-300">Vision</h3>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Our goal is to reduce friction at every step of event management.
            Whether you're checking in attendees, correcting data, or exporting
            summaries for reports, Tara aims to make the process intuitive and
            fast.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 font-semibold transition-all text-sm sm:text-base"
          >
            ← Back Home
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 rounded-lg bg-linear-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white font-semibold shadow-md transition-all text-sm sm:text-base"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
