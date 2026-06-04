import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  Camera, 
  Square, 
  Activity,
  AlertCircle,
  Tag,
  Mic2,
  Loader2,
  Video
} from "lucide-react";
import PromptCard from "../components/PromptCard.jsx";
import KeywordTray from "../components/KeywordTray.jsx";
import { API_BASE_URL } from "../config.js";

export default function RecorderPage({
  setView,
  setVideoURL,
  setVideoMetadata,
  activePrompts,
  setActivePrompts,
  setSessionId,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [decks, setDecks] = useState([]);

  useEffect(() => {
    async function fetchCards() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cards`);
        const data = await response.json();
        setDecks(data.decks || []);
      } catch (err) {
        console.error("Failed to fetch cards:", err);
      }
    }
    fetchCards();
  }, []);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        alert("Camera permission denied. Please allow camera + mic.");
        console.error("Camera error:", err);
      }
    }

    setupCamera();
  }, []);

  useEffect(() => {
    let timer;

    if (recording) {
      timer = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 120) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [recording]);

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function drawPrompt(deckTitle) {
    const deck = decks.find(d => d.title === deckTitle);
    if (!deck || !deck.cards || deck.cards.length === 0) return;
    const newWord = deck.cards[Math.floor(Math.random() * deck.cards.length)];
    setActivePrompts((prev) => ({ ...prev, [deckTitle]: newWord }));
  }

  function startRecording() {
    if (!streamRef.current) return;

    chunksRef.current = [];

    const recorder = new MediaRecorder(streamRef.current);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const sessionData = await uploadVideo(blob);

      if (sessionData) {
        setSessionId(sessionData.session_id || sessionData.id);
        setVideoURL(url);
        setView("result");
      }
    };

    recorder.start();
    setSeconds(0);
    setRecording(true);
  }

  async function uploadVideo(blob) {
    setProcessing(true);

    try {
      // 1. Create Session
      const prompt_cards = Object.values(activePrompts).filter(Boolean);
      if (prompt_cards.length !== 4) {
        throw new Error("Exactly 4 cards must be selected.");
      }

      const createRes = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_cards: prompt_cards
        })
      });

      if (!createRes.ok) throw new Error("Failed to create session");
      const sessionInfo = await createRes.json();
      const sessionId = sessionInfo.id;

      // 2. Upload Video
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      const uploadRes = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Video upload failed");
      const uploadData = await uploadRes.json();
      return uploadData;
    } catch (err) {
      console.error("Session/Upload error:", err);
      alert("Failed: " + err.message);
      return null;
    } finally {
      setProcessing(false);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-gray-400">
            Practice Studio
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-gray-400 mt-2 max-w-xl">
            Improvise based on cards you flip, record your performance and get AI feedback instantly.
          </p>
        </div>

        <div
          className={`px-5 py-2.5 rounded-full border text-sm font-semibold tracking-wide flex items-center gap-2 transition-colors ${recording
            ? "bg-[#FF3366]/10 border-[#FF3366]/30 text-[#FF3366] shadow-[0_0_15px_rgba(255,51,102,0.2)]"
            : "bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-300"
            }`}
        >
          {recording ? <span className="h-2 w-2 rounded-full bg-[#FF3366] animate-pulse" /> : <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-gray-500" />}
          {recording ? "Recording..." : "Standby"}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {/* Left: Video + Keywords */}
        <div className="col-span-1 md:col-span-7 flex flex-col gap-6 md:gap-8">
          {/* Video Card */}
          <div className="surface-card p-4 md:p-6">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#FF3366]" /> Live Camera Feed
              </h2>
              <div className="text-slate-600 dark:text-gray-300 text-sm font-mono bg-slate-100 dark:bg-white/5 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10 shadow-inner">
                {formatTime(seconds)}
              </div>
            </div>

            <div className="video-frame aspect-video relative group">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Gradient Overlay for style */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

              {recording && (
                <div className="absolute top-4 left-4 px-4 py-1.5 rounded-full bg-[#FF3366]/20 border border-[#FF3366]/40 text-[#FF3366] text-xs font-bold animate-pulse backdrop-blur-md flex items-center gap-2 shadow-[0_0_10px_rgba(255,51,102,0.3)]">
                  <span className="h-2 w-2 rounded-full bg-[#FF3366]" /> LIVE
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-6 md:mt-8 border-t border-slate-200 dark:border-white/10 pt-4 md:pt-6 gap-4 md:gap-0">
              <div className="text-slate-500 dark:text-gray-400 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#6C5CE7]" />
                Max record: <span className="text-slate-800 dark:text-white font-semibold">2m</span>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <button
                  onClick={startRecording}
                  disabled={recording || processing || Object.values(activePrompts).filter(Boolean).length !== 4}
                  className="btn-primary flex-1 md:flex-none disabled:opacity-50 flex justify-center items-center gap-2 px-4"
                >
                  <Video className="w-5 h-5" />
                  <span className="hidden sm:inline">{Object.values(activePrompts).filter(Boolean).length !== 4 ? "Select 4 Cards First" : "Start Recording"}</span>
                  <span className="sm:hidden">{Object.values(activePrompts).filter(Boolean).length !== 4 ? "Select 4" : "Start"}</span>
                </button>

                <button
                  onClick={stopRecording}
                  disabled={!recording || processing}
                  className="btn-secondary flex-1 md:flex-none disabled:opacity-50 flex justify-center items-center gap-2 px-4"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="surface-panel p-6">
            <h2 className="text-xl text-slate-900 dark:text-white font-semibold mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#6C5CE7]" /> Active Keywords
            </h2>

            <KeywordTray activePrompts={activePrompts} />
          </div>
        </div>

        {/* Right: Prompt Cards + Tip */}
        <div className="col-span-1 md:col-span-5 flex flex-col gap-6 md:gap-8">
          {/* Cards */}
          <div className="surface-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl text-slate-900 dark:text-white font-semibold mb-4 md:mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#00b894]" /> Prompt Cards
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {decks.length > 0 ? (
                decks.map((deck) => (
                  <PromptCard
                    key={deck.title}
                    label={deck.title}
                    value={activePrompts[deck.title]}
                    onClick={() => drawPrompt(deck.title)}
                  />
                ))
              ) : (
                <div className="col-span-2 text-sm text-slate-400 dark:text-gray-500 flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
                  Loading premium cards...
                </div>
              )}
            </div>
          </div>

          {/* AI Guidance */}
          <div className="surface-panel p-6 border-l-4 border-l-[#6C5CE7]">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#6C5CE7]" /> Professional Tip
            </h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed">
              Speak clearly, keep eye contact with the camera, and use keywords
              naturally. The AI will analyze your structure and delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Processing Modal */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 dark:bg-[#0B0E14]/80 backdrop-blur-xl px-4 transition-all duration-300">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="max-w-lg w-full rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D24] p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_rgba(255,51,102,0.15)] relative overflow-hidden"
          >
            {/* Animated top border */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FF3366] via-[#6C5CE7] to-[#FF3366] animate-[gradient_2s_linear_infinite] bg-[length:200%_auto]" />
            
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-[#6C5CE7]/10 to-[#FF3366]/10 flex items-center justify-center border border-slate-100 dark:border-white/5">
              <Mic2 className="w-8 h-8 text-[#FF3366] animate-pulse" />
            </div>

            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Processing your video</div>
            <p className="text-slate-500 dark:text-gray-400 mb-8 leading-relaxed">
              Uploading the recording and transcribing the audio in the background.
              Please wait while our AI models analyze your performance.
            </p>
            <div className="inline-flex items-center gap-3 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-6 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 shadow-sm">
              <Loader2 className="w-4 h-4 text-[#6C5CE7] animate-spin" />
              Processing Audio...
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}