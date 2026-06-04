/* global process */
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { InferenceClient } from "@huggingface/inference";
import { writeFileSync, unlinkSync, statSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { words } from "../src/utils/words.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = __filename.substring(0, __filename.lastIndexOf("\\"));

const hfToken = process.env.HF_TOKEN;
const hfClient = hfToken ? new InferenceClient(hfToken) : null;

// Set FFmpeg and FFprobe paths
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    console.log("FFmpeg path set to:", ffmpegStatic);
} else {
    console.error("FFmpeg static not found");
}

if (ffprobeStatic) {
    ffmpeg.setFfprobePath(ffprobeStatic.path);
    console.log("FFprobe path set to:", ffprobeStatic.path);
} else {
    console.error("FFprobe static not found");
}

const app = express();
const port = 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Simple in-memory session store. For production, replace with a DB.
const sessions = new Map();

// Ensure a temp directory exists for file writes
const TEMP_DIR = join(__dirname, "tmp");
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

app.use(cors());

function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                console.error("ffprobe error:", err.message);
                reject(err);
            } else if (metadata && metadata.format && metadata.format.duration) {
                resolve(metadata.format.duration);
            } else {
                reject(new Error("Cannot determine audio duration from metadata"));
            }
        });
    });
}

function cleanTranscript(text) {
    return text.replace(/\s+/g, " ").trim();
}

function extractTranscript(result) {
    if (typeof result === "string") {
        return cleanTranscript(result);
    }
    if (result?.text) {
        return cleanTranscript(result.text);
    }
    if (result?.generated_text) {
        return cleanTranscript(result.generated_text);
    }
    if (Array.isArray(result) && result[0]?.text) {
        return cleanTranscript(result[0].text);
    }
    return cleanTranscript(JSON.stringify(result));
}

async function transcribeAudio(buffer) {
    if (!hfClient) {
        throw new Error("Missing HF_TOKEN environment variable");
    }

    const audioBlob = new Blob([buffer], { type: "audio/mpeg" });
    console.log("Transcribing audio blob size:", audioBlob.size, "bytes", "type:", audioBlob.type);

    const result = await hfClient.automaticSpeechRecognition({
        inputs: audioBlob,
        model: "openai/whisper-large-v3",
        provider: "hf-inference",
        // options: {
        //     language: "french",
        // },
    });

    return result;
}

app.post("/api/process-video", upload.single("video"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No video file uploaded" });
    }

    const videoPath = join(__dirname, `temp_video_${Date.now()}.webm`);
    const audioPath = join(__dirname, `temp_audio_${Date.now()}.mp3`);
    let conversionStartTime = Date.now();

    console.log("Starting video processing...");
    console.log("Video file:", req.file.originalname, "Size:", req.file.size, "bytes");
    console.log("Video path:", videoPath);
    console.log("Audio path:", audioPath);

    try {
        // Write video file to disk
        writeFileSync(videoPath, req.file.buffer);
        console.log("Video file written to disk successfully");

        // Convert video to audio using FFmpeg
        await new Promise((resolve, reject) => {
            console.log("Starting FFmpeg conversion...");

            ffmpeg(videoPath)
                .noVideo()
                .audioCodec("libmp3lame")
                .audioBitrate("128k")
                .audioChannels(2)
                .audioFrequency(44100)
                .format("mp3")
                .on("start", (commandLine) => {
                    console.log("FFmpeg command:", commandLine);
                })
                .on("progress", (progress) => {
                    if (progress.percent) {
                        console.log("Progress:", Math.round(progress.percent) + "%");
                    }
                })
                .on("end", () => {
                    console.log("FFmpeg conversion completed successfully");
                    resolve();
                })
                .on("error", (err, stdout, stderr) => {
                    console.error("FFmpeg conversion error:", err.message);
                    if (stdout) console.error("stdout:", stdout);
                    if (stderr) console.error("stderr:", stderr);
                    reject(new Error("FFmpeg conversion failed: " + err.message));
                })
                .save(audioPath);
        });

        console.log("Reading audio file...");
        const audioStats = statSync(audioPath);
        const audioSize = audioStats.size;
        console.log("Audio file size:", audioSize, "bytes");

        // Transcribe audio with Hugging Face
        const audioBuffer = readFileSync(audioPath);
        console.log("Sending audio to Hugging Face for transcription...");
        const modelOutput = await transcribeAudio(audioBuffer);
        console.log("Output received:", modelOutput);
        const transcript = extractTranscript(modelOutput);
        console.log("Transcript received:", transcript);

        // Get audio duration
        console.log("Getting audio duration...");
        const duration = await getAudioDuration(audioPath);
        const processingMs = Date.now() - conversionStartTime;

        console.log("Audio duration:", duration, "seconds");
        console.log("Total processing time:", processingMs, "ms");

        // Clean up temporary files
        try {
            unlinkSync(videoPath);
            console.log("Cleaned up video file");
        } catch (e) {
            console.log("Could not delete video file:", e.message);
        }

        try {
            unlinkSync(audioPath);
            console.log("Cleaned up audio file");
        } catch (e) {
            console.log("Could not delete audio file:", e.message);
        }

        const metadata = {
            videoInfo: {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
            },
            audioInfo: {
                format: "mp3",
                codec: "mp3",
                bitrate: 128,
                sampleRate: 44100,
                channels: 2,
                duration: Number(duration.toFixed(2)),
                size: audioSize,
            },
            transcript,
            processingMs,
            receivedAt: new Date().toISOString(),
        };

        console.log("Returning metadata:", JSON.stringify(metadata, null, 2));
        return res.json(metadata);
    } catch (err) {
        console.error("Error processing video:", err.message);
        console.error("Stack trace:", err.stack);

        try {
            unlinkSync(videoPath);
        } catch {
            console.log("Could not clean up video file");
        }
        try {
            unlinkSync(audioPath);
        } catch {
            console.log("Could not clean up audio file");
        }

        return res.status(500).json({
            error: "Video processing failed: " + err.message,
            details: err.stack
        });
    }
});

app.get("/api/status", (req, res) => {
    return res.json({ status: "backend running" });
});

app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});

// Health check endpoint (requirement 1)
app.get('/health', (req, res) => {
    return res.type('text').send('Connection Succeed!!!');
});

// List card decks (requirement 2)
app.get('/api/cards', (req, res) => {
    // Transform the words object into decks with titles and 20 items (or padding)
    const mapTitle = {
        Mic_Check_Cards: 'Mic Check Cards',
        Challenge_Cards: 'Challenge Cards',
        Sponsored_By_Cards: 'Sponsored By Cards',
        Script_Cards: 'Script Cards',
    };

    const decks = Object.keys(words).map((key) => {
        const cards = words[key].slice(0, 20);
        // pad to 20 if necessary
        while (cards.length < 20) cards.push(cards[cards.length % words[key].length]);
        return { title: mapTitle[key] || key, cards };
    });

    return res.json({ decks });
});

// Create speech session (requirement 3)
app.post('/api/sessions', express.json(), (req, res) => {
    const { prompt_cards } = req.body || {};
    if (!Array.isArray(prompt_cards) || prompt_cards.length !== 4 || !prompt_cards.every(p => typeof p === 'string')) {
        return res.status(400).json({ error: 'prompt_cards must be an array of exactly 4 strings' });
    }

    const id = `sess_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const session = {
        id,
        prompt_cards,
        status: 0, // 0: Created
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // placeholders for later
        filePath: null,
        transcript: null,
        report: null,
        error_message: null,
    };

    sessions.set(id, session);
    return res.status(201).json({ id });
});

// Upload media (requirement 4)
app.post('/api/sessions/:sessionId/upload', upload.single('file'), async (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (!req.file) return res.status(400).json({ error: 'file required' });

    // write buffer to disk
    const videoPath = join(TEMP_DIR, `upload_${sessionId}_${Date.now()}.webm`);
    writeFileSync(videoPath, req.file.buffer);
    session.filePath = videoPath;
    session.status = 1; // Uploaded
    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);

    // Kick off background processing: convert -> transcribe -> assess
    (async () => {
        try {
            session.status = 2; // Transcribing
            session.updatedAt = new Date().toISOString();
            sessions.set(sessionId, session);

            // Convert to audio (mp3)
            const audioPath = join(TEMP_DIR, `audio_${sessionId}_${Date.now()}.mp3`);
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .noVideo()
                    .audioCodec('libmp3lame')
                    .format('mp3')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(audioPath);
            });

            // Transcribe using HF if available, otherwise mock
            session.status = 3; // Assessing
            session.updatedAt = new Date().toISOString();
            sessions.set(sessionId, session);

            let transcript = null;
            try {
                const audioBuffer = readFileSync(audioPath);
                const result = hfClient ? await transcribeAudio(audioBuffer) : null;
                transcript = result ? extractTranscript(result) : 'This is a mock transcript because no HF/OpenAI key is set.';
            } catch (e) {
                transcript = null;
                console.error('Transcription failed:', e?.message || e);
                session.error_message = 'Transcription failed: ' + (e?.message || String(e));
                session.status = 5; // Failed
                sessions.set(sessionId, session);
                return;
            }

            session.transcript = transcript;

            // Generate report: if HF client available, call a model; otherwise create mock report
            let report = null;
            try {
                if (hfClient) {
                    // placeholder: call an LLM or pipeline for assessment (not implemented fully)
                    // For now use a mock until a real pipeline is provided
                    report = {
                        fluency: 3.5,
                        structure: 4,
                        clarity: 3.8,
                        confidence: 0.6,
                        overall_score: 78,
                        strengths: ['Clear opening', 'Good examples'],
                        improvements: ['Shorten pauses', 'Stronger closing'],
                    };
                } else {
                    report = {
                        fluency: 3.2,
                        structure: 3.9,
                        clarity: 3.6,
                        confidence: 0.55,
                        overall_score: 73,
                        strengths: ['Good pacing', 'Relevant content'],
                        improvements: ['More vocal variety', 'Cleaner transitions'],
                    };
                }
            } catch (e) {
                session.error_message = 'Assessment failed: ' + (e?.message || String(e));
                session.status = 5;
                sessions.set(sessionId, session);
                return;
            }

            session.report = report;
            session.status = 4; // Completed
            session.updatedAt = new Date().toISOString();
            sessions.set(sessionId, session);

            // cleanup temp files
            try { unlinkSync(videoPath); } catch {};
            try { unlinkSync(audioPath); } catch {};
        } catch (err) {
            console.error('Background processing error:', err?.message || err);
            session.error_message = err?.message || String(err);
            session.status = 5;
            session.updatedAt = new Date().toISOString();
            sessions.set(sessionId, session);
        }
    })();

    return res.status(202).json({ message: 'Upload received', session_id: sessionId });
});

// Poll session progress (requirement 5)
app.get('/api/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'session not found' });

    // Return minimal status info and error message if any
    return res.json({ id: session.id, status: session.status, error_message: session.error_message });
});

// Get AI report (requirement 6)
app.get('/api/sessions/:sessionId/report', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (session.status === 5) return res.status(409).json({ error: session.error_message || 'Processing failed' });
    if (session.status !== 4) return res.status(202).json({ message: 'Report not ready', status: session.status });

    const response = {
        transcript: session.transcript,
        report: session.report,
    };

    return res.json(response);
});
