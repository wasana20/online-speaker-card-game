import { motion, AnimatePresence } from "framer-motion";
import { Hash, Sparkles } from "lucide-react";

export default function KeywordTray({ activePrompts }) {
  const keywords = Object.entries(activePrompts || {}).filter(([_, v]) => Boolean(v));

  return (
    <div className="flex flex-wrap gap-3 min-h-[40px]">
      <AnimatePresence mode="popLayout">
        {keywords.length > 0 ? (
          keywords.map(([key, value]) => (
            <motion.div
              key={key}
              layout
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 rounded-full shadow-sm hover:shadow-md transition-shadow"
            >
              <Hash className="w-3.5 h-3.5 text-[#6C5CE7] opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="text-sm font-semibold text-slate-800 dark:text-gray-100 tracking-wide">
                {value}
              </span>
              <div className="absolute inset-0 rounded-full bg-[#6C5CE7]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 italic"
          >
            <Sparkles className="w-4 h-4" />
            Select cards to reveal keywords...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}