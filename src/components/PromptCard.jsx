import { motion } from "framer-motion";
import { Sparkles, Layers } from "lucide-react";

export default function PromptCard({ label, value, onClick, isActive }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative cursor-pointer rounded-2xl p-6 overflow-hidden border transition-all duration-500 min-h-[160px] flex flex-col justify-between group ${
        isActive
          ? "border-transparent shadow-[0_0_30px_rgba(255,51,102,0.3)] dark:shadow-[0_0_40px_rgba(255,51,102,0.4)]"
          : "border-slate-200 dark:border-white/10 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/5 dark:to-transparent hover:border-slate-300 dark:hover:border-white/20"
      }`}
    >
      {/* Active Gradient Background */}
      {isActive && (
        <motion.div
          layoutId="active-gradient"
          className="absolute inset-0 bg-gradient-to-br from-[#FF3366] to-[#FF1A53] z-0"
        />
      )}

      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
              isActive ? "text-white/80" : "text-slate-500 dark:text-gray-400"
            }`}
          >
            <Layers className="w-4 h-4" />
            {label}
          </div>
          {isActive && (
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring" }}
            >
              <Sparkles className="w-5 h-5 text-white/90" />
            </motion.div>
          )}
        </div>

        <motion.div
          key={value}
          initial={isActive ? { opacity: 0, x: 20 } : false}
          animate={{ opacity: 1, x: 0 }}
          className={`text-2xl font-black tracking-tight leading-tight ${
            isActive ? "text-white drop-shadow-md" : "text-slate-900 dark:text-white"
          }`}
        >
          {value || <span className="text-slate-400 dark:text-gray-600 font-medium italic text-lg">Tap to draw...</span>}
        </motion.div>
      </div>

      {/* Active Overlay Border */}
      {isActive && (
        <div className="absolute inset-0 border-2 border-white/20 rounded-2xl pointer-events-none" />
      )}
    </motion.div>
  );
}