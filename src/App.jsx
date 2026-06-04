import { useState, useEffect } from "react";
import { Video, BarChart2, FolderOpen, Settings, Moon, Sun, Mic2, Menu, X } from "lucide-react";
import RecorderPage from "./pages/RecorderPage";
import ResultPage from "./pages/ResultPage";
import { API_BASE_URL } from "./config";

export default function App() {
  const [view, setView] = useState("recorder");
  const [videoURL, setVideoURL] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [activePrompts, setActivePrompts] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [serverHealthy, setServerHealthy] = useState(true);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState("dark"); // default dark for now

  // Apply theme class to document body
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Health Check
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (!res.ok) setServerHealthy(false);
      } catch (err) {
        setServerHealthy(false);
      }
    }
    checkHealth();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return (
    <div className="app-shell min-h-screen overflow-hidden bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-white transition-colors duration-300 font-sans selection:bg-[#FF3366]/30 flex flex-col md:flex-row">
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-[#FF3366]/5 to-transparent blur-[120px] dark:from-[#FF3366]/10" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-[#6C5CE7]/5 to-transparent blur-[100px] dark:from-[#6C5CE7]/10" />
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl z-40 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF3366] to-[#FF1A53] flex items-center justify-center shadow-lg shadow-[#FF3366]/20">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-xl font-black tracking-tight">
            Speaker<span className="text-[#FF3366]">Deck</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sleek Sidebar (Hidden on mobile, slides in) */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-[280px] border-r border-slate-200 dark:border-white/[0.08] 
        bg-white/95 dark:bg-[#0B0E14]/95 backdrop-blur-xl p-8 flex flex-col shadow-2xl md:shadow-sm
        transition-transform duration-300 ease-in-out md:translate-x-0
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Logo Area */}
        <div className="flex items-center gap-3 mb-12 group cursor-default relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF3366] to-[#FF1A53] flex items-center justify-center shadow-lg shadow-[#FF3366]/20 group-hover:scale-105 transition-transform">
            <Mic2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-2xl font-black tracking-tight">
            Speaker<span className="text-[#FF3366]">Deck</span>
          </div>
          {!serverHealthy && (
            <div className="absolute -bottom-6 left-0 text-xs text-[#FF3366] font-semibold flex items-center gap-1 bg-[#FF3366]/10 px-2 py-0.5 rounded-full border border-[#FF3366]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF3366]" /> API Offline
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-2 text-sm font-medium">
          <button 
            onClick={() => { setView("recorder"); setIsMobileMenuOpen(false); }} 
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left shadow-sm ${
              view === "recorder" 
              ? "bg-[#FF3366]/10 text-[#FF3366] border border-[#FF3366]/20" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
            }`}
          >
            <Video className="w-5 h-5" />
            Practice Studio
          </button>
          <button className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left">
            <BarChart2 className="w-5 h-5" />
            Performance
          </button>
          <button className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left">
            <FolderOpen className="w-5 h-5" />
            Sessions
          </button>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme} 
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left font-medium"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* User Profile / Settings */}
          <button className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left font-medium">
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 p-4 md:p-8 lg:p-12 xl:p-16 flex flex-col items-center overflow-y-auto w-full h-[calc(100vh-73px)] md:h-screen">
        <div className="w-full max-w-[1200px] animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
          {view === "recorder" && (
            <RecorderPage
              setView={setView}
              setVideoURL={setVideoURL}
              setVideoMetadata={setVideoMetadata}
              activePrompts={activePrompts}
              setActivePrompts={setActivePrompts}
              setSessionId={setSessionId}
            />
          )}

          {view === "result" && (
            <ResultPage
              videoURL={videoURL}
              videoMetadata={videoMetadata}
              activePrompts={activePrompts}
              sessionId={sessionId}
              onRestart={() => {
                setView("recorder");
                setVideoURL(null);
                setVideoMetadata(null);
                setActivePrompts({});
                setSessionId(null);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}