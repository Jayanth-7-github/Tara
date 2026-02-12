import React from "react";
import { useLocation } from "react-router-dom";
import Hamburger from "./hamburger";

export default function PublicNavbar() {
  const location = useLocation();
  const isExamPage =
    location.pathname === "/test" || location.pathname === "/test/coding";

  if (isExamPage) return null;

  return (
    <header className="bg-linear-to-r from-gray-950 via-gray-900 to-gray-950 text-white shadow-lg border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold tracking-wide bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          Tara
        </h2>
        <Hamburger />
      </div>
    </header>
  );
}
