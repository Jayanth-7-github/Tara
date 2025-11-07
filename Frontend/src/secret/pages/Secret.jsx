import Navbar from "../components/Navbar";
import { motion } from "framer-motion";

export default function Secret() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-4xl w-full bg-gray-800/50 backdrop-blur-xl border border-gray-700/60 shadow-2xl rounded-3xl p-8"
      >
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-400 tracking-wide">
            Secret Access Portal
          </h1>

          {/* Decorative Identity Section */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-4 bg-gray-700/40 px-6 py-4 rounded-2xl shadow-inner"
          >
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shadow-md">
              <motion.div
                className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl animate-pulse"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <svg
                width="42"
                height="42"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white z-10"
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.28 4.47 3.22 5.66L8 18l3.07-1.54C12.4 16.75 13.2 17 14 17c3.87 0 7-3.13 7-7s-3.13-8-7-8z"
                  fill="currentColor"
                />
                <path
                  d="M9.5 11.5c.5-.5 1.2-1 2.5-1s2 .5 2.5 1c.5.5.5 1.5 0 2s-1.2 1-2.5 1-2-.5-2.5-1c-.5-.5-.5-1.5 0-2z"
                  fill="#fff"
                  opacity="0.9"
                />
              </svg>
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-200">shuuuu</div>
              <div className="text-gray-400 text-sm italic">
                don’t tell anyone...
              </div>
            </div>
          </motion.div>

          {/* Navbar */}
          <div className="mt-2 w-full">
            <Navbar />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-gray-300 text-lg leading-relaxed">
            Welcome to the <span className="text-blue-400 font-semibold">Secret Entry Point</span>.  
            Use the navigation above to manage attendance and view summaries for your event.
          </p>
          <p className="text-gray-500 text-sm">
            ⚠️ Keep this page private — it’s not accessible through the public interface.
            Only authorized personnel should access this route.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
