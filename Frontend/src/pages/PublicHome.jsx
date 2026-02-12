import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BackgroundRippleEffect } from "../components/ui/background-ripple-effect";
import { checkLogin } from "../services/auth";

export default function PublicHome() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await checkLogin();
        if (response.authenticated) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleGetStarted = () => {
    navigate(isAuthenticated ? "/main" : "/login");
  };

  return (
    <div className="relative min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center px-6 py-16 font-sans overflow-hidden">
      <BackgroundRippleEffect rows={8} cols={24} cellSize={52} />
      <div className="relative z-10 max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Event Attendance · Results · Exams
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold bg-linear-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent leading-tight">
            Tara keeps your campus
            <br className="hidden sm:block" /> organized and informed.
          </h1>
        </div>

        <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
          A single place for students and coordinators to see upcoming events,
          track attendance, manage exams, and review results — with a clean
          dashboard experience tuned for your college.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={handleGetStarted}
            className="px-7 py-3 rounded-full bg-linear-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white font-semibold shadow-lg shadow-blue-900/40 transition-all duration-200 hover:-translate-y-0.5"
          >
            {isAuthenticated ? "Open Dashboard" : "Get Started"}
          </button>
        </div>

        <div className="pt-8 text-xs sm:text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Tara · Built for campus events.</p>
        </div>
      </div>
    </div>
  );
}
