// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [socket, setSocket] = useState<Socket>();
  const [connected, setConnected] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [logs, setLogs] = useState<string[]>([]);

  const recognitionRef = useRef<any>();
  const shouldListenRef = useRef(false);
  const isRecognitionActiveRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Logging helper
  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString();
    const entry = `[${t}] ${msg}`;
    console.log(entry);
    setLogs((prev) => [...prev.slice(-15), entry]);
  };

  // Safe recognition start/stop helpers
  const startRecognition = () => {
    if (!recognitionRef.current || isRecognitionActiveRef.current) return;
    try {
      recognitionRef.current.start();
      isRecognitionActiveRef.current = true;
    } catch (error) {
      addLog(`❌ Failed to start recognition: ${error}`);
      isRecognitionActiveRef.current = false;
    }
  };

  const stopRecognition = () => {
    if (!recognitionRef.current || !isRecognitionActiveRef.current) return;
    try {
      recognitionRef.current.stop();
      isRecognitionActiveRef.current = false;
    } catch (error) {
      addLog(`❌ Failed to stop recognition: ${error}`);
    }
  };

  // Initialize socket once
  useEffect(() => {
    addLog("🔧 Connecting to server...");
    const s = io("http://localhost:4000", {
      transports: ["websocket"],
    });
    setSocket(s);
    s.on("connect", () => {
      addLog(`🔌 Connected: ${s.id}`);
      setConnected(true);
    });
    s.on("disconnect", (r) => {
      addLog(`📴 Disconnected: ${r}`);
      setConnected(false);
    });
    s.on("ai_response", ({ text }) => {
      addLog(`🤖 AI says: "${text}"`);
      setMessages((m) => [...m, { role: "assistant", text }]);
    });
    s.on("ai_audio", ({ audio }) => {
      addLog("🔊 Playing AI audio...");
      setBotSpeaking(true);

      // Stop any existing audio
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      const bin = atob(audio);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);

      const audioEl = new Audio(
        URL.createObjectURL(new Blob([u8], { type: "audio/mp3" }))
      );
      audioElementRef.current = audioEl;

      audioEl.onended = () => {
        addLog("🎵 AI audio ended");
        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;

        // Resume recognition after a short delay
        if (shouldListenRef.current) {
          addLog("▶️ Resuming recognition");
          setTimeout(() => startRecognition(), 300);
        }
      };

      audioEl.onerror = (e) => {
        addLog(`❌ Audio error: ${e}`);
        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;

        if (shouldListenRef.current) {
          setTimeout(() => startRecognition(), 300);
        }
      };

      audioEl.play().catch((e) => {
        addLog(`❌ Audio play error: ${e.message}`);
        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;

        if (shouldListenRef.current) {
          setTimeout(() => startRecognition(), 300);
        }
      });
    });
    return () => {
      s.disconnect();
    };
  }, []);

  // Setup speech recognition once
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addLog("❌ SpeechRecognition not supported");
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.lang = "en-US";

    rec.onstart = () => {
      addLog("🎙️ Listening started");
      setRecognizing(true);
      isRecognitionActiveRef.current = true;
    };

    rec.onerror = (e: any) => {
      addLog(`❌ Recognition error: ${e.error}`);
      setRecognizing(false);
      isRecognitionActiveRef.current = false;

      // Handle different error types
      if (e.error === "no-speech" && shouldListenRef.current && !botSpeaking) {
        addLog("🔄 No speech detected, restarting...");
        setTimeout(() => startRecognition(), 1000);
      } else if (e.error === "audio-capture" && shouldListenRef.current) {
        addLog("🎤 Audio capture error, retrying...");
        setTimeout(() => startRecognition(), 2000);
      } else if (e.error === "not-allowed" && shouldListenRef.current) {
        addLog("🚫 Microphone permission denied");
      }
    };

    rec.onend = () => {
      addLog("🛑 Recognition ended");
      setRecognizing(false);
      isRecognitionActiveRef.current = false;

      // Only restart if we should be listening and bot isn't speaking
      if (shouldListenRef.current && !botSpeaking && !processing) {
        addLog("▶️ Auto-restarting recognition");
        setTimeout(() => startRecognition(), 500);
      }
    };

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          addLog(`📝 Heard: "${text}"`);

          if (text && socket && connected) {
            setMessages((m) => [...m, { role: "user", text }]);
            addLog(`📤 Sending text_message`);
            socket.emit("text_message", { text });
            setProcessing(true);

            // Stop recognition while processing
            stopRecognition();
          }
        }
      }
    };

    recognitionRef.current = rec;

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [socket, connected]); // Only recreate when socket/connection changes

  const startConversation = () => {
    if (!recognitionRef.current || !connected) return;
    shouldListenRef.current = true;
    setConversationActive(true);
    addLog("🚀 Conversation mode ON");
    startRecognition();
  };

  const stopConversation = () => {
    shouldListenRef.current = false;
    setConversationActive(false);
    addLog("🛑 Conversation mode OFF");
    stopRecognition();

    // Stop any playing audio
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    // Reset states
    setProcessing(false);
    setBotSpeaking(false);
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <h1>Voice Assistant</h1>
        <div className="status-bar">
          <div
            className={`connection-status ${
              connected ? "connected" : "disconnected"
            }`}
          >
            {connected ? "🟢 Connected" : "🔴 Disconnected"}
          </div>
          <div className="latency">
            {conversationActive ? "Active Session" : "Ready"}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Video/Avatar Section */}
        <section className="video-section">
          <div className="video-container">
            <div className="avatar-placeholder">
              <div className={`avatar ${botSpeaking ? "speaking" : ""}`}>
                <div className="avatar-face">
                  <div className="avatar-eyes">
                    <div className="eye left"></div>
                    <div className="eye right"></div>
                  </div>
                  <div className="avatar-mouth"></div>
                </div>
                {botSpeaking && (
                  <div className="sound-waves">
                    <div className="wave"></div>
                    <div className="wave"></div>
                    <div className="wave"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Conversation Section */}
        <section className="conversation-section">
          <div className="conversation-history">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>Start a conversation to see messages here</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`conversation-entry ${m.role}`}>
                  <div className="entry-content">
                    <div className="entry-text">{m.text}</div>
                    <div className="entry-time">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {processing && (
              <div className="conversation-entry assistant processing">
                <div className="entry-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Transcript */}
          {recognizing && (
            <div className="current-transcript">
              <div className="transcript-label">Listening...</div>
              <div className="transcript-text">
                <div className="listening-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Controls Section */}
        <section className="controls-section">
          {/* Audio Visualizer */}
          <div className="audio-visualizer">
            <div
              className="audio-level-bar"
              style={{
                width: recognizing ? `${Math.random() * 60 + 20}%` : "2px",
                opacity: recognizing ? 1 : 0.3,
              }}
            ></div>
          </div>

          {/* Main Controls */}
          <div className="main-controls">
            <button
              className={`voice-button ${
                conversationActive ? "recording" : ""
              } ${processing ? "processing" : ""}`}
              onClick={
                conversationActive ? stopConversation : startConversation
              }
              disabled={!connected}
            >
              {processing ? (
                <>
                  <span className="button-icon">⏳</span>
                  Processing...
                </>
              ) : conversationActive ? (
                <>
                  <span className="button-icon">🛑</span>
                  Stop Conversation
                </>
              ) : (
                <>
                  <span className="button-icon">🎤</span>
                  Start Conversation
                </>
              )}
            </button>
          </div>

          {/* Status Indicators */}
          <div className="status-indicators">
            <div className={`status-item ${recognizing ? "active" : ""}`}>
              <span className="status-icon">🎙️</span>
              <span className="status-text">Listening</span>
            </div>
            <div className={`status-item ${processing ? "active" : ""}`}>
              <span className="status-icon">🔄</span>
              <span className="status-text">Processing</span>
            </div>
            <div className={`status-item ${botSpeaking ? "active" : ""}`}>
              <span className="status-icon">🔊</span>
              <span className="status-text">Speaking</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Powered by OpenAI GPT & ElevenLabs</p>
        <div className="tech-info">
          <span>WebRTC</span>
          <span>•</span>
          <span>Socket.IO</span>
          <span>•</span>
          <span>Speech Recognition</span>
        </div>
      </footer>

      {/* Debug Panel (Collapsible) */}
      <div className="debug-panel">
        <details>
          <summary>Debug Logs</summary>
          <div className="debug-logs">
            {logs.map((l, i) => (
              <div key={i} className="debug-log">
                {l}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
