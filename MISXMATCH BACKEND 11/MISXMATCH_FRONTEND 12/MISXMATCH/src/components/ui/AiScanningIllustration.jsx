import { motion } from "framer-motion";
import { ShieldCheck, MapPin, Scan } from "lucide-react";

export default function AiScanningIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none flex items-center justify-center py-4">
      {/* Background ambient radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* Main Scanner Container */}
      <div className="relative w-full aspect-[4/3.2] max-h-[420px] rounded-3xl bg-slate-900/70 border border-teal-500/30 p-6 shadow-2xl backdrop-blur-xl overflow-hidden flex items-center justify-center">
        {/* Central Biometric Scan Region */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* Outer Scanner Reticle Frame */}
          <div className="absolute inset-0 border border-teal-500/30 rounded-2xl pointer-events-none" />

          {/* Corner Bracket Accents */}
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-teal-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-teal-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-teal-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-teal-400 rounded-br-lg" />

          {/* Abstract Vector Human Avatar Profile */}
          <svg className="w-44 h-44 text-teal-400/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Head silhouette */}
            <path
              d="M50 20 C36 20 28 30 28 44 C28 58 36 64 50 64 C64 64 72 58 72 44 C72 30 64 20 50 20 Z"
              fill="url(#avatarGrad)"
              stroke="#2dd4bf"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            {/* Shoulders */}
            <path
              d="M20 90 C20 74 34 68 50 68 C66 68 80 74 80 90"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />

            {/* Facial Landmark Mesh Nodes */}
            <circle cx="42" cy="40" r="2" fill="#2dd4bf" />
            <circle cx="58" cy="40" r="2" fill="#2dd4bf" />
            <circle cx="50" cy="48" r="2" fill="#2dd4bf" />
            <circle cx="44" cy="56" r="1.5" fill="#2dd4bf" />
            <circle cx="56" cy="56" r="1.5" fill="#2dd4bf" />
            <circle cx="50" cy="58" r="2" fill="#2dd4bf" />

            {/* Connecting Mesh Lines */}
            <line x1="42" y1="40" x2="58" y2="40" stroke="#2dd4bf" strokeWidth="0.75" strokeOpacity="0.5" />
            <line x1="42" y1="40" x2="50" y2="48" stroke="#2dd4bf" strokeWidth="0.75" strokeOpacity="0.5" />
            <line x1="58" y1="40" x2="50" y2="48" stroke="#2dd4bf" strokeWidth="0.75" strokeOpacity="0.5" />
            <line x1="50" y1="48" x2="50" y2="58" stroke="#2dd4bf" strokeWidth="0.75" strokeOpacity="0.5" />
            <line x1="44" y1="56" x2="56" y2="56" stroke="#2dd4bf" strokeWidth="0.75" strokeOpacity="0.5" />
          </svg>

          {/* Animated Vertical Scan Line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-300 to-transparent shadow-[0_0_12px_#2dd4bf]"
            animate={{ top: ["8%", "92%", "8%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Glowing Mesh Nodes Animation overlays */}
          <motion.div
            className="absolute top-1/3 left-1/3 w-3 h-3 rounded-full bg-teal-400/40 border border-teal-300"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-teal-400/40 border border-teal-300"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </div>

        {/* Floating Secondary Micro-Card: Geotag Lead Node */}
        <motion.div
          className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 px-3 py-2 rounded-xl bg-slate-950/80 border border-teal-500/40 backdrop-blur-md shadow-lg flex items-center gap-2.5"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="w-16 h-1.5 bg-teal-400/40 rounded-full" />
            <div className="w-10 h-1 bg-slate-600/50 rounded-full mt-1.5" />
          </div>
        </motion.div>

        {/* Floating Secondary Micro-Card: Verified Status Node */}
        <motion.div
          className="absolute top-4 right-4 sm:top-6 sm:right-6 px-3 py-2 rounded-xl bg-slate-950/80 border border-teal-500/40 backdrop-blur-md shadow-lg flex items-center gap-2.5"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
        </motion.div>
      </div>
    </div>
  );
}
