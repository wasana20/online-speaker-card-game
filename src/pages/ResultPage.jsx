import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { 
  PlaySquare, 
  FileText, 
  CheckCircle2, 
  ArrowUpCircle, 
  BrainCircuit,
  BarChart,
  Target,
  Trophy,
  RefreshCw,
  Loader2,
  Tag
} from "lucide-react";
import { API_BASE_URL } from "../config.js";

export default function ResultPage({ videoURL, activePrompts, sessionId, onRestart }) {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    let timer;
    const pollSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();
        setSessionInfo(data);

        if (data.status === 4) {
          // fetch report
          const reportRes = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/report`);
          if (reportRes.status === 200) {
            const reportJson = await reportRes.json();
            setReportData(reportJson.report);
          } else if (reportRes.status === 202) {
            // Report is not ready yet, continue waiting
            timer = setTimeout(pollSession, 3000);
          } else if (reportRes.status === 409) {
            // AI pipeline failed
            setErrorMsg("AI pipeline failed to generate the report. Please try again.");
          }
        } else if (data.status === 5) {
          setErrorMsg(data.error_message || "Processing failed");
        } else {
          // not finished, schedule next poll
          timer = setTimeout(pollSession, 3000);
        }
      } catch (err) {
        console.error(err);
      }
    };
    pollSession();
    return () => clearTimeout(timer);
  }, [sessionId]);

  const getStatusText = (status) => {
    switch(status) {
      case 0: return "Created";
      case 1: return "Uploaded";
      case 2: return "Transcribing speech...";
      case 3: return "Generating AI report...";
      case 4: return "Completed";
      case 5: return "Failed";
      default: return "Processing...";
    }
  };

  const isProcessing = sessionInfo && sessionInfo.status < 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-10 gap-4 md:gap-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-gray-400">
            Performance Report
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-gray-400 mt-2">
            Review your recording and comprehensive AI performance insights.
          </p>
        </div>

        <button onClick={onRestart} className="btn-primary group flex items-center gap-2">
          <RefreshCw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
          New Session
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        <div className="col-span-1 md:col-span-7 flex flex-col gap-6 md:gap-8">
          
          {/* Video Section */}
          <div className="surface-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl text-slate-900 dark:text-white font-semibold mb-4 md:mb-6 flex items-center gap-2">
              <PlaySquare className="w-5 h-5 text-[#FF3366]" /> Playback
            </h2>
            <div className="video-frame aspect-video relative group border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg">
              <video src={videoURL} controls className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Transcript Section */}
          <div className="surface-panel p-6 border-l-4 border-l-[#6C5CE7]">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex justify-between items-center mb-4 border-b border-slate-200 dark:border-white/10 pb-4">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#6C5CE7]" /> 
                AI Generated Transcript
              </span>
              {isProcessing && (
                <span className="text-[#6C5CE7] text-sm font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> 
                  {getStatusText(sessionInfo.status)}
                </span>
              )}
            </h3>
            
            {errorMsg ? (
              <div className="bg-red-50 dark:bg-red-900/20 text-[#FF3366] p-4 rounded-xl text-sm border border-red-200 dark:border-red-900/50">
                {errorMsg}
              </div>
            ) : sessionInfo?.transcript ? (
              <div className="bg-white/40 dark:bg-black/20 p-5 rounded-xl border border-slate-100 dark:border-white/5 shadow-inner">
                <p className="text-base text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                  {sessionInfo.transcript}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-gray-500">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#6C5CE7]" />
                    <span className="text-sm font-medium">Extracting speech to text...</span>
                  </>
                ) : (
                  <span className="text-sm italic">No transcript available.</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="col-span-1 md:col-span-5 flex flex-col gap-6 md:gap-8">
          {/* Metrics */}
          <div className="surface-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl text-slate-900 dark:text-white font-semibold mb-4 md:mb-6 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-[#00b894]" /> Performance Summary
            </h2>

            {reportData ? (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="col-span-2 bg-gradient-to-br from-[#FF3366]/10 to-[#FF3366]/5 border border-[#FF3366]/20 rounded-2xl p-6 relative overflow-hidden group hover:border-[#FF3366]/40 transition-colors">
                  <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-[#FF3366] opacity-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="text-4xl font-black text-[#FF3366] drop-shadow-[0_0_12px_rgba(255,51,102,0.3)]">{reportData.overall_score}</div>
                  <div className="text-sm font-bold text-[#FF3366] mt-2 uppercase tracking-widest flex items-center justify-center gap-2">
                    Overall Score
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-default">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{reportData.fluency.score}</div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 mt-2 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Fluency
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-default">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{reportData.structure.score}</div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 mt-2 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Structure
                  </div>
                </div>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                 {isProcessing ? (
                   <>
                     <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#00b894]" />
                     <span className="text-sm font-medium">Analyzing performance metrics...</span>
                   </>
                 ) : (
                   <span className="text-sm">Metrics not available</span>
                 )}
               </div>
            )}
          </div>

          {/* Feedback */}
          <div className="surface-panel p-6 border-l-4 border-l-[#FF3366]">
            <h2 className="text-xl text-slate-900 dark:text-white font-semibold mb-6 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-[#FF3366]" /> AI Feedback
            </h2>

            {reportData ? (
              <div className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed space-y-6">
                <div className="bg-white/40 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                  <strong className="text-slate-900 dark:text-white block mb-2 font-semibold">Executive Summary</strong>
                  {reportData.summary_feedback}
                </div>
                
                <div>
                  <strong className="text-[#00b894] flex items-center gap-2 mb-3 text-base font-semibold">
                    <CheckCircle2 className="w-5 h-5" /> Key Strengths
                  </strong>
                  <ul className="space-y-2">
                    {reportData.strengths.map((s, i) => (
                      <li key={i} className="flex gap-3 bg-white/40 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                        <div className="min-w-[8px] h-[8px] rounded-full bg-[#00b894] mt-1.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong className="text-[#FF3366] flex items-center gap-2 mb-3 text-base font-semibold">
                    <ArrowUpCircle className="w-5 h-5" /> Areas for Improvement
                  </strong>
                  <ul className="space-y-2">
                    {reportData.improvements.map((im, i) => (
                      <li key={i} className="flex gap-3 bg-white/40 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                        <div className="min-w-[8px] h-[8px] rounded-full bg-[#FF3366] mt-1.5" />
                        <span>{im}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#FF3366]" />
                    <span className="text-sm font-medium">Compiling detailed feedback...</span>
                  </>
                ) : (
                  <span className="text-sm italic">Feedback not available.</span>
                )}
              </div>
            )}
          </div>
          
          {/* Selected Cards */}
          <div className="surface-card p-6">
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#fdcb6e]" /> Selected Prompts
            </h2>

            <div className="flex flex-wrap gap-2">
              {Object.entries(activePrompts || {}).length > 0 ? (
                Object.entries(activePrompts || {}).map(([key, val]) => (
                  <div
                    key={key}
                    className="px-4 py-2 text-sm text-slate-700 dark:text-gray-300 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full flex items-center gap-2 shadow-sm"
                  >
                    <span className="text-[#FF3366] font-bold text-xs uppercase tracking-wider">
                      {key}
                    </span>
                    <span className="h-3 w-[1px] bg-slate-300 dark:bg-white/20" />
                    <span className="font-medium">{val}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-gray-500">No cards selected.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}