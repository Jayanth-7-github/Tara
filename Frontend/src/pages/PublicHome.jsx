export default function PublicHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center px-6 py-16 font-sans">
      <div className="max-w-3xl w-full text-center bg-gray-900/70 backdrop-blur-lg border border-gray-800 shadow-2xl rounded-2xl px-8 py-12 transition-all duration-300 hover:shadow-blue-800/20">
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
          Welcome to <span className="text-blue-400">Tara</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          Your intelligent event attendance and management system.  
          Track, organize, and manage attendance effortlessly — all in one place.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/login"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white font-semibold shadow-md transition-all duration-200"
          >
            Get Started
          </a>

          <a
            href="/about"
            className="px-6 py-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 font-semibold transition-all duration-200"
          >
            Learn More
          </a>
        </div>

        {/* Footer */}
        <div className="mt-10 text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} Tara. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
