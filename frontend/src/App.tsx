// src/App.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import AdminPanel from "./AdminPanel";
import "./App.css";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [socket, setSocket] = useState<Socket>();
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [logs, setLogs] = useState<string[]>([]);

  const recognitionRef = useRef<any>();
  const shouldListenRef = useRef(false);
  const isRecognitionActiveRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Latency tracking refs
  const latencyStartTime = useRef<number>(0);
  const speechToTextTime = useRef<number>(0);
  const textToSpeechStartTime = useRef<number>(0);
  const textToSpeechEndTime = useRef<number>(0);

  // Logging helper
  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString();
    const entry = `[${t}] ${msg}`;
    console.log(entry);
    setLogs((prev) => [...prev.slice(-15), entry]);
  }, []);

  // Safe recognition start/stop helpers
  const startRecognition = useCallback(() => {
    addLog(
      `🎤 Attempting to start recognition: recognitionRef=${!!recognitionRef.current}, isActive=${
        isRecognitionActiveRef.current
      }, trialExpired=${trialExpired}`
    );
    if (!recognitionRef.current || isRecognitionActiveRef.current) {
      addLog(
        `❌ Cannot start recognition: recognitionRef=${!!recognitionRef.current}, isActive=${
          isRecognitionActiveRef.current
        }`
      );
      return;
    }
    if (trialExpired) {
      addLog(`❌ Cannot start recognition: Trial session has expired`);
      return;
    }
    try {
      addLog(`🎤 Starting speech recognition...`);
      recognitionRef.current.start();
      isRecognitionActiveRef.current = true;
      addLog(`✅ Speech recognition started successfully`);
    } catch (error) {
      addLog(`❌ Failed to start recognition: ${error}`);
      isRecognitionActiveRef.current = false;
    }
  }, [trialExpired]);

  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current || !isRecognitionActiveRef.current) return;
    try {
      recognitionRef.current.stop();
      isRecognitionActiveRef.current = false;
    } catch (error) {
      addLog(`❌ Failed to stop recognition: ${error}`);
    }
  }, []);

  // Initialize socket once
  useEffect(() => {
    addLog("🔧 Connecting to server...");
    const backendUrl =
      process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
    addLog(`🌐 Backend URL: ${backendUrl}`);
    const s = io(backendUrl, {
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
    s.on("auth_success", ({ sessionId, expiresAt, timeRemaining }) => {
      addLog(
        `✅ Authenticated successfully! Session expires in ${Math.round(
          timeRemaining / 1000
        )}s`
      );
      setAuthenticated(true);
      setSessionInfo({
        timeRemaining,
        messageCount: 0,
        isActive: true,
      });

    });

    s.on("auth_error", ({ message }) => {
      addLog(`❌ Authentication failed: ${message}`);
      setAuthenticated(false);
      setAuthError(message); // Display error in UI

      // Show specific message for blocked users
      if (message.includes("monthly session limit")) {
        addLog(`📅 This email has already used its monthly session limit`);
        addLog(
          `⏰ Please try again next month or use a different email address`
        );
      } else if (
        message.includes("daily session limit") ||
        message.includes("blocked")
      ) {
        addLog(`🚫 This email has already used its daily session limit`);
        addLog(`⏰ Please try again tomorrow or use a different email address`);
      } else if (message.includes("Session limit reached")) {
        addLog(`🚫 Session limit reached for this user`);
        addLog(`⏰ Please contact admin for new credentials`);
      }
    });

    s.on("conversation_started", ({ sessionId, messageCount, timeRemaining }) => {
      addLog(`✅ Conversation started successfully`);
      addLog(`📊 Session ID: ${sessionId}`);
      addLog(`💬 Message count: ${messageCount}`);
      addLog(`⏰ Time remaining: ${Math.floor(timeRemaining / 1000)}s`);
      
      // Start the actual conversation
      shouldListenRef.current = true;
      setConversationActive(true);
      addLog("🚀 Conversation mode ON");
      addLog(`🎤 Starting recognition: recognitionRef=${!!recognitionRef.current}`);
      startRecognition();
    });

    s.on("conversation_error", ({ message }) => {
      addLog(`❌ Conversation start failed: ${message}`);
      setAuthError(message);
      
      // If session expired, set trial expired state
      if (message.includes("expired") || message.includes("No active session")) {
        setTrialExpired(true);
        addLog("⏰ Session has expired. Please start a new session.");
      }
    });

    s.on("conversation_stopped", ({ success }) => {
      if (success) {
        addLog("✅ Conversation stopped successfully");
      }
    });

    s.on("conversation_time_update", ({ timeRemaining, isActive }) => {
      if (isActive && conversationActive) {
        setSessionInfo(prev => prev ? { ...prev, timeRemaining } : null);
        
        // Check if time is up
        if (timeRemaining <= 0) {
          addLog("⏰ Conversation time expired");
          setTrialExpired(true);
          stopConversation();
        }
      }
    });

    s.on("session_expired", ({ message, timeRemaining }) => {
      addLog(`⏰ Session expired: ${message}`);
      addLog(`🔄 Setting trial expired state and stopping all activities`);

      // Stop all activities immediately
      setAuthenticated(false);
      setSessionInfo(null);
      setConversationActive(false);
      setProcessing(false);
      setBotSpeaking(false);
      setRecognizing(false);
      setTrialExpired(true);

      // Stop recognition
      stopRecognition();

      // Stop any playing audio
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      addLog(`✅ Trial expired UI should now be visible`);
    });

    s.on("session_info", (info) => {
      if (info.error) {
        addLog(`❌ Session error: ${info.error}`);
      } else {
        setSessionInfo(info);
        addLog(
          `📊 Session info: ${Math.round(
            info.timeRemaining / 1000
          )}s remaining, ${info.messageCount} messages`
        );
      }
    });

    s.on("ai_response", ({ text, timeRemaining }) => {
      const aiResponseTime = Date.now();
      const sttToAiTime = aiResponseTime - speechToTextTime.current;

      addLog(`🤖 AI says: "${text}"`);
      addLog(
        `⏱️ AI Response received at: ${aiResponseTime} (${sttToAiTime}ms after STT)`
      );
      setMessages((m) => [...m, { role: "assistant", text }]);

      // Update session info if provided
      if (timeRemaining !== undefined) {
        setSessionInfo((prev) => (prev ? { ...prev, timeRemaining } : null));
      }
    });
    s.on("ai_audio", ({ audio }) => {
      textToSpeechStartTime.current = Date.now();
      const aiToTtsTime =
        textToSpeechStartTime.current - speechToTextTime.current;

      addLog("🔊 Playing AI audio...");
      addLog(
        `⏱️ TTS started at: ${textToSpeechStartTime.current} (${aiToTtsTime}ms after STT)`
      );
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
        textToSpeechEndTime.current = Date.now();
        const totalLatency =
          textToSpeechEndTime.current - latencyStartTime.current;
        const ttsDuration =
          textToSpeechEndTime.current - textToSpeechStartTime.current;

        addLog("🎵 AI audio ended");
        addLog(`⏱️ TTS ended at: ${textToSpeechEndTime.current}`);
        addLog(`⏱️ TTS duration: ${ttsDuration}ms`);
        addLog(
          `⏱️ TOTAL LATENCY: ${totalLatency}ms (from user speech to bot audio end)`
        );

        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;

        // Resume recognition after a short delay
        if (shouldListenRef.current && !trialExpired) {
          addLog("▶️ Resuming recognition");
          setTimeout(() => startRecognition(), 300);
        } else if (trialExpired) {
          addLog("❌ Not resuming recognition: Trial session has expired");
        }
      };

      audioEl.onerror = (e) => {
        const errorTime = Date.now();
        const totalLatency = errorTime - latencyStartTime.current;

        addLog(`❌ Audio error: ${e}`);
        addLog(`⏱️ Error occurred at: ${errorTime}`);
        addLog(`⏱️ TOTAL LATENCY (with error): ${totalLatency}ms`);

        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;

        if (shouldListenRef.current && !trialExpired) {
          setTimeout(() => startRecognition(), 300);
        } else if (trialExpired) {
          addLog("❌ Not resuming recognition: Trial session has expired");
        }
      };

      audioEl.play().catch((e) => {
        const playErrorTime = Date.now();
        const totalLatency = playErrorTime - latencyStartTime.current;

        addLog(`❌ Audio play error: ${e.message}`);
        addLog(`⏱️ Play error occurred at: ${playErrorTime}`);
        addLog(`⏱️ TOTAL LATENCY (with play error): ${totalLatency}ms`);

        setProcessing(false);
        setBotSpeaking(false);
        audioElementRef.current = null;

        if (shouldListenRef.current && !trialExpired) {
          setTimeout(() => startRecognition(), 300);
        } else if (trialExpired) {
          addLog("❌ Not resuming recognition: Trial session has expired");
        }
      });
    });
    return () => {
      s.disconnect();
    };
  }, [startRecognition, stopRecognition, addLog]);

  // Timer for conversation time updates
  useEffect(() => {
    if (!conversationActive || !socket || !connected) return;

    const interval = setInterval(() => {
      if (socket && connected) {
        socket.emit("get_conversation_time");
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [conversationActive, socket, connected]);

  // Setup speech recognition once
  useEffect(() => {
    addLog("🎤 Setting up speech recognition...");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addLog("❌ SpeechRecognition not supported");
      return;
    }
    addLog("✅ SpeechRecognition is supported");

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.lang = "en-US";
    addLog("✅ Speech recognition configured");

    rec.onstart = () => {
      addLog("🎙️ Listening started");
      setRecognizing(true);
      isRecognitionActiveRef.current = true;
    };

    rec.onerror = (e: any) => {
      addLog(`❌ Recognition error: ${e.error} - ${e.message || "No message"}`);
      setRecognizing(false);
      isRecognitionActiveRef.current = false;

      // Handle different error types
      if (
        e.error === "no-speech" &&
        shouldListenRef.current &&
        !botSpeaking &&
        !trialExpired
      ) {
        addLog("🔄 No speech detected, restarting...");
        setTimeout(() => startRecognition(), 1000);
      } else if (
        e.error === "audio-capture" &&
        shouldListenRef.current &&
        !trialExpired
      ) {
        addLog("🎤 Audio capture error, retrying...");
        setTimeout(() => startRecognition(), 2000);
      } else if (e.error === "not-allowed" && shouldListenRef.current) {
        addLog("🚫 Microphone permission denied");
      } else if (trialExpired) {
        addLog("❌ Not restarting recognition: Trial session has expired");
      } else {
        addLog(`❌ Unhandled recognition error: ${e.error}`);
      }
    };

    rec.onend = () => {
      addLog("🛑 Recognition ended");
      setRecognizing(false);
      isRecognitionActiveRef.current = false;

      // Only restart if we should be listening and bot isn't speaking and trial hasn't expired
      if (
        shouldListenRef.current &&
        !botSpeaking &&
        !processing &&
        !trialExpired
      ) {
        addLog("▶️ Auto-restarting recognition");
        setTimeout(() => startRecognition(), 500);
      } else if (trialExpired) {
        addLog("❌ Not restarting recognition: Trial session has expired");
      }
    };

    rec.onresult = (e: any) => {
      addLog(
        `🎤 Speech recognition result received: ${e.results.length} results`
      );
      for (let i = e.resultIndex; i < e.results.length; i++) {
        addLog(
          `🎤 Result ${i}: isFinal=${e.results[i].isFinal}, transcript="${e.results[i][0].transcript}"`
        );

        console.log(
          "value of botSpeaking && audioElementRef.current",
          botSpeaking && audioElementRef.current,
          botSpeaking,
          audioElementRef.current
        );
        // Stop bot speaking when user starts speaking (even interim results)
        // Check if audio element exists and is playing, regardless of botSpeaking state
        if (audioElementRef.current && !audioElementRef.current.paused) {
          addLog(`🔇 Stopping bot speech - user started speaking`);
          audioElementRef.current.pause();
          audioElementRef.current = null;
          setBotSpeaking(false);
        }

        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          addLog(`📝 Final transcript: "${text}"`);

          // Start latency tracking
          latencyStartTime.current = Date.now();
          speechToTextTime.current = Date.now();

          addLog(`📝 Heard: "${text}"`);
          addLog(`⏱️ Speech-to-Text completed at: ${speechToTextTime.current}`);

          if (text && socket && connected && !trialExpired) {
            addLog(`📤 Sending text_message to socket`);
            setMessages((m) => [...m, { role: "user", text }]);
            addLog(`📤 Sending text_message`);
            socket.emit("text_message", { text });
            setProcessing(true);

            // Stop recognition while processing
            stopRecognition();
          } else if (trialExpired) {
            addLog(`❌ Cannot send message: Trial session has expired`);
          } else {
            addLog(
              `❌ Cannot send message: text="${text}", socket=${!!socket}, connected=${connected}`
            );
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
  }, [
    socket,
    connected,
    botSpeaking,
    processing,
    startRecognition,
    stopRecognition,
    trialExpired,
  ]); // Only recreate when socket/connection changes

  const handleAuthenticate = () => {
    if (!socket || !connected || !email.trim() || !password.trim()) {
      addLog("❌ Please enter both email and password");
      return;
    }

    // Reset trial expired state and clear any previous auth errors when starting new authentication
    setTrialExpired(false);
    setAuthError(null);
    addLog(`🔐 Authenticating with email: ${email}`);
    socket.emit("authenticate", {
      email: email.trim(),
      password: password.trim(),
    });
  };

  const getSessionInfo = () => {
    if (socket && connected) {
      socket.emit("get_session_info");
    }
  };

  const startConversation = () => {
    addLog(
      `🚀 Starting conversation: recognitionRef=${!!recognitionRef.current}, connected=${connected}, authenticated=${authenticated}, trialExpired=${trialExpired}`
    );
    if (!recognitionRef.current || !connected || !authenticated) {
      addLog("❌ Please authenticate first");
      return;
    }
    if (trialExpired) {
      addLog("❌ Trial session has expired");
      return;
    }
    
    // Emit start_conversation event to backend
    if (socket) {
      addLog("📤 Emitting start_conversation event");
      socket.emit("start_conversation");
    } else {
      addLog("❌ Socket not available");
    }
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
    
    // Emit stop_conversation event to backend
    if (socket) {
      addLog("📤 Emitting stop_conversation event");
      socket.emit("stop_conversation");
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Add error boundary logging
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      addLog(`❌ JavaScript Error: ${error.message}`);
      console.error("App Error:", error);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  // Check for admin route
  useEffect(() => {
    const path = window.location.pathname;
    setIsAdminRoute(path === "/admin");
  }, []);

  // Log app initialization
  useEffect(() => {
    addLog("🚀 App initialized");
    addLog(`🌍 Environment: ${process.env.NODE_ENV}`);
    addLog(`🔗 Backend URL: ${process.env.REACT_APP_BACKEND_URL || "Not set"}`);
  }, [addLog]);

  // Show admin panel if on admin route
  if (isAdminRoute) {
    return <AdminPanel />;
  }

  // Show loading state if no logs yet
  if (logs.length === 0) {
    return (
      <div className="App">
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h1>Loading Voice Assistant...</h1>
          <p>Initializing application...</p>
        </div>
      </div>
    );
  }

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
          {/* <a href="/admin" className="admin-link" target="_blank" rel="noopener noreferrer">
            👑 Admin Panel
          </a> */}
        </div>
      </header>

      {/* Authentication Section */}
      {!authenticated && !trialExpired && (
        <section className="auth-section">
          <div className="auth-container">
            <h2>🔐 Authentication Required</h2>
            <p>
              Enter your credentials to start a 5-minute voice conversation
              session
            </p>
            {authError && (
              <div className="auth-error">
                <p>❌ {authError}</p>
              </div>
            )}
            <div className="auth-form">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="email-input"
                disabled={!connected}
              />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAuthenticate()}
                className="password-input"
                disabled={!connected}
              />
              <button
                onClick={handleAuthenticate}
                disabled={!connected || !email.trim() || !password.trim()}
                className="auth-button"
              >
                {connected ? "Start Session" : "Connecting..."}
              </button>
            </div>
            <div className="auth-info">
              <p>⏰ Each session lasts 5 minutes</p>
              <p>💬 Limited to 20 messages per session</p>
              <p>🔑 Valid credentials required to access</p>
              <p>👑 Admin users have unlimited access</p>
            </div>
          </div>
        </section>
      )}

      {/* Trial Expired Section */}
      {trialExpired && (
        <section className="trial-expired-section">
          <div className="trial-expired-container">
            <div className="trial-expired-icon">⏰</div>
            <h2>Trial Session Expired</h2>
            <p>
              Your 5-minute trial session has ended. Thank you for trying our
              voice assistant!
            </p>
            <div className="trial-expired-info">
              <div className="info-item">
                <span className="info-icon">⏱️</span>
                <span>Session Duration: 5 minutes</span>
              </div>
              <div className="info-item">
                <span className="info-icon">💬</span>
                <span>Message Limit: 20 messages</span>
              </div>
              <div className="info-item">
                <span className="info-icon">🔄</span>
                <span>New credentials needed for another session</span>
              </div>
            </div>
            <button
              onClick={() => {
                setTrialExpired(false);
                setEmail("");
                setPassword("");
              }}
              className="retry-button"
            >
              Try Again with New Credentials
            </button>
          </div>
        </section>
      )}

      {/* Main Content */}
      {!trialExpired && (
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

            {/* Session Info */}
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

            {/* Main Controls */}
            <div className="main-controls">
              <button
                className={`voice-button ${
                  conversationActive ? "recording" : ""
                } ${processing ? "processing" : ""}`}
                onClick={
                  conversationActive ? stopConversation : startConversation
                }
                disabled={!connected || !authenticated}
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
      )}

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
