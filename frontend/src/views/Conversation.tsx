// Extracted from original App.tsx, preserving conversation UI and logic
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "../services/socket";
import "../App.css";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Conversation() {
  const [socket, setSocket] = useState<Socket>();
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<{
    timeRemaining: number;
    messageCount: number;
    isActive: boolean;
  } | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [logs, setLogs] = useState<string[]>([]);

  const recognitionRef = useRef<any>();
  const shouldListenRef = useRef(false);
  const isRecognitionActiveRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);

  const latencyStartTime = useRef<number>(0);
  const speechToTextTime = useRef<number>(0);
  const textToSpeechStartTime = useRef<number>(0);
  const textToSpeechEndTime = useRef<number>(0);

  const startRecognition = useCallback(() => {
    if (
      !recognitionRef.current ||
      isRecognitionActiveRef.current ||
      trialExpired
    ) {
      return;
    }
    try {
      recognitionRef.current.start();
      isRecognitionActiveRef.current = true;
    } catch (_error) {
      isRecognitionActiveRef.current = false;
    }
  }, [trialExpired]);

  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current || !isRecognitionActiveRef.current) return;
    try {
      recognitionRef.current.stop();
      isRecognitionActiveRef.current = false;
    } catch (_error) {}
  }, []);

  const logoutUser = useCallback(() => {
    try {
      localStorage.removeItem('userAccessToken');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('userPassword');
    } catch (_e) {}
    try {
      if (socket) {
        socket.disconnect();
        setSocket(undefined);
      }
    } catch (_e) {}
    window.location.href = '/login';
  }, [socket]);

  // Delay socket connection until startConversation
  useEffect(() => {
    const s = socket;
    if (!s) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onAuthSuccess = ({ timeRemaining }: { timeRemaining: number }) => {
      setAuthenticated(true);
      setSessionInfo({ timeRemaining, messageCount: 0, isActive: true });
    };
    const onAuthError = () => setAuthenticated(false);
    const onConversationStarted = ({
      sessionId,
      messageCount,
      timeRemaining,
    }: any) => {
      shouldListenRef.current = true;
      setConversationActive(true);
      startRecognition();
      setSessionInfo({ timeRemaining, messageCount, isActive: true });
    };
    const onConversationError = ({ message }: any) => {
      if (
        message.includes("expired") ||
        message.includes("No active session")
      ) {
        setTrialExpired(true);
      }
    };
    const onConversationStopped = () => {};
    const onConversationTimeUpdate = ({ timeRemaining, isActive }: any) => {
      if (isActive && conversationActive) {
        setSessionInfo((prev) => (prev ? { ...prev, timeRemaining } : null));
        if (timeRemaining <= 0) {
          setTrialExpired(true);
          stopConversation();
          setShowExpiredModal(true);
        }
      }
    };
    const onSessionExpired = () => {
      setAuthenticated(false);
      setSessionInfo(null);
      setConversationActive(false);
      setProcessing(false);
      setBotSpeaking(false);
      setRecognizing(false);
      setTrialExpired(true);
      stopRecognition();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      setShowExpiredModal(true);
    };
    const onAiResponse = ({ text, timeRemaining }: any) => {
      const aiResponseTime = Date.now();
      const sttToAiTime = aiResponseTime - speechToTextTime.current;
      setMessages((m) => [...m, { role: "assistant", text }]);
      if (timeRemaining !== undefined) {
        setSessionInfo((prev) => (prev ? { ...prev, timeRemaining } : null));
      }
    };
    const onAiAudio = ({ audio }: any) => {
      textToSpeechStartTime.current = Date.now();
      setBotSpeaking(true);
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
        textToSpeechEndTime.current = Date.now();
        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;
        if (shouldListenRef.current && !trialExpired) {
          setTimeout(() => startRecognition(), 300);
        }
      };
      audioEl.onerror = () => {
        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;
        if (shouldListenRef.current && !trialExpired) {
          setTimeout(() => startRecognition(), 300);
        }
      };
      audioEl.play().catch(() => {
        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;
        if (shouldListenRef.current && !trialExpired) {
          setTimeout(() => startRecognition(), 300);
        }
      });
    };
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("auth_success", onAuthSuccess);
    s.on("auth_error", onAuthError);
    s.on("conversation_started", onConversationStarted);
    s.on("conversation_error", onConversationError);
    s.on("conversation_stopped", onConversationStopped);
    s.on("conversation_time_update", onConversationTimeUpdate);
    s.on("session_expired", onSessionExpired);
    s.on("ai_response", onAiResponse);
    s.on("ai_audio", onAiAudio);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("auth_success", onAuthSuccess);
      s.off("auth_error", onAuthError);
      s.off("conversation_started", onConversationStarted);
      s.off("conversation_error", onConversationError);
      s.off("conversation_stopped", onConversationStopped);
      s.off("conversation_time_update", onConversationTimeUpdate);
      s.off("session_expired", onSessionExpired);
      s.off("ai_response", onAiResponse);
      s.off("ai_audio", onAiAudio);
    };
  }, [socket, conversationActive, startRecognition]);

  useEffect(() => {
    if (!conversationActive) return;
    const s = socket;
    const interval = setInterval(() => {
      if (s && connected) s.emit("get_conversation_time");
    }, 1000);
    return () => clearInterval(interval);
  }, [conversationActive, socket, connected]);

  // Auto-scroll to latest message
  useEffect(() => {
    const el = historyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, processing]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.lang = "en-US";
    rec.onstart = () => {
      setRecognizing(true);
      isRecognitionActiveRef.current = true;
    };
    rec.onerror = (e: any) => {
      setRecognizing(false);
      isRecognitionActiveRef.current = false;
      if (
        e.error === "no-speech" &&
        shouldListenRef.current &&
        !botSpeaking &&
        !trialExpired
      ) {
        setTimeout(() => startRecognition(), 1000);
      } else if (
        e.error === "audio-capture" &&
        shouldListenRef.current &&
        !trialExpired
      ) {
        setTimeout(() => startRecognition(), 2000);
      }
    };
    rec.onend = () => {
      setRecognizing(false);
      isRecognitionActiveRef.current = false;
      if (
        shouldListenRef.current &&
        !botSpeaking &&
        !processing &&
        !trialExpired
      ) {
        setTimeout(() => startRecognition(), 500);
      }
    };
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (audioElementRef.current && !audioElementRef.current.paused) {
          audioElementRef.current.pause();
          audioElementRef.current = null;
          setBotSpeaking(false);
        }
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          latencyStartTime.current = Date.now();
          speechToTextTime.current = Date.now();
          if (text && socket && connected && !trialExpired) {
            setMessages((m) => [...m, { role: "user", text }]);
            socket.emit("text_message", { text });
            setProcessing(true);
            stopRecognition();
          }
        }
      }
    };
    recognitionRef.current = rec;
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_e) {}
      }
    };
  }, [
    socket,
    connected,
    botSpeaking,
    processing,
    startRecognition,
    stopRecognition,
    trialExpired,
  ]);

  const getSessionInfo = () => {
    if (socket && connected) socket.emit("get_session_info");
  };

  const startConversation = () => {
    if (!recognitionRef.current || !authenticated) return;
    const email = sessionStorage.getItem("username");
    const password = sessionStorage.getItem("userPassword");
    if (!email || !password) {
      alert("Please login first.");
      window.location.href = "/login";
      return;
    }
    const s = getSocket();
    setSocket(s);
    const emitAuth = () => {
      s.emit("authenticate", { username: email, password });
    };
    const onAuthSuccess = () => {
      s.emit("start_conversation");
      s.off("auth_success", onAuthSuccess);
    };
    s.on("auth_success", onAuthSuccess);
    if (!s.connected) {
      s.once("connect", emitAuth);
      s.connect();
    } else {
      emitAuth();
    }
  };

  const stopConversation = () => {
    shouldListenRef.current = false;
    setConversationActive(false);
    stopRecognition();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setProcessing(false);
    setBotSpeaking(false);
    if (socket) socket.emit("stop_conversation");
  };

  const formatTime = (ms: number) => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="App">
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
          <div
            className={`connection-status ${
              authenticated ? "connected" : "disconnected"
            }`}
          >
            {authenticated ? "🔐 Authenticated" : "🔒 Not Authenticated"}
          </div>
          {sessionInfo && (
            <div className="latency">
              ⏰ {formatTime(sessionInfo.timeRemaining)} remaining
            </div>
          )}
        <button onClick={logoutUser} className="logout-button">Logout</button>
        </div>
      </header>

      {trialExpired && (
        <section className="trial-expired-section">
          <div className="trial-expired-container">
            <div className="trial-expired-icon">⏰</div>
            <h2>Session Expired</h2>
            <p>Your session has ended. Please ask the admin to increase your session limit.</p>
            <button
              onClick={() => {
                setTrialExpired(false);
                logoutUser();
              }}
              className="retry-button"
            >
              OK
            </button>
          </div>
        </section>
      )}

      {!trialExpired && (
        <main className="main-content">
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

          <section className="conversation-section">
            <div className="conversation-history" ref={historyRef}>
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

          <section className="controls-section">
            <div className="audio-visualizer">
              <div
                className="audio-level-bar"
                style={{
                  width: recognizing ? `${Math.random() * 60 + 20}%` : "2px",
                  opacity: recognizing ? 1 : 0.3,
                }}
              ></div>
            </div>
            {authenticated && sessionInfo && (
              <div className="session-info">
                <div className="session-stats">
                  <div className="stat-item">
                    <span className="stat-label">Time Remaining:</span>
                    <span className="stat-value">
                      {formatTime(sessionInfo.timeRemaining)}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Messages:</span>
                    <span className="stat-value">
                      {sessionInfo.messageCount}/20
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Status:</span>
                    <span className="stat-value">
                      {sessionInfo.isActive ? "Active" : "Expired"}
                    </span>
                  </div>
                </div>
                <button onClick={getSessionInfo} className="info-button">
                  🔄 Refresh Session Info
                </button>
              </div>
            )}
            <div className="main-controls">
              <button
                className={`voice-button ${
                  conversationActive ? "recording" : ""
                } ${processing ? "processing" : ""}`}
                onClick={
                  conversationActive ? stopConversation : startConversation
                }
                disabled={!authenticated}
              >
                {processing ? (
                  <>
                    <span className="button-icon">⏳</span>Processing...
                  </>
                ) : conversationActive ? (
                  <>
                    <span className="button-icon">🛑</span>Stop Conversation
                  </>
                ) : (
                  <>
                    <span className="button-icon">🎤</span>Start Conversation
                  </>
                )}
              </button>
            </div>
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
      )}

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
