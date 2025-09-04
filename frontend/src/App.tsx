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
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [logs, setLogs] = useState<string[]>([]);

  const recognitionRef = useRef<any>();
  const shouldListenRef = useRef(false);

  // Logging helper
  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString();
    const entry = `[${t}] ${msg}`;
    console.log(entry);
    setLogs((prev) => [...prev.slice(-15), entry]);
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
      const bin = atob(audio);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const audioEl = new Audio(
        URL.createObjectURL(new Blob([u8], { type: "audio/mp3" }))
      );
      audioEl.onended = () => {
        addLog("🎵 AI audio ended");
        setProcessing(false);
        if (shouldListenRef.current) {
          addLog("▶️ Resuming recognition");
          recognitionRef.current.start();
        }
      };
      audioEl.play().catch((e) => addLog(`❌ Audio play error: ${e.message}`));
    });
    return () => {
      s.disconnect();
    };
  }, []);

  // Setup one continuous recognizer
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addLog("❌ SpeechRecognition not supported");
      return;
    }
    const rec = new SR();
    rec.continuous = true; // Keep it running
    rec.interimResults = false; // Only finals
    rec.maxAlternatives = 1;
    rec.lang = "en-US";

    rec.onstart = () => {
      addLog("🎙️ Listening started");
      setRecognizing(true);
    };
    rec.onerror = (e: any) => {
      addLog(`❌ Recognition error: ${e.error}`);
      setRecognizing(false);
      // Auto-restart on no-speech
      if (e.error === "no-speech" && shouldListenRef.current) {
        setTimeout(() => rec.start(), 500);
      }
    };
    rec.onend = () => {
      addLog("🛑 Recognition ended");
      setRecognizing(false);
      if (shouldListenRef.current && !processing) {
        addLog("▶️ Auto-restarting recognition");
        setTimeout(() => rec.start(), 500);
      }
    };
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          addLog(`📝 Heard: "${text}"`);
          if (text) {
            setMessages((m) => [...m, { role: "user", text }]);
            if (socket && connected) {
              addLog(`📤 Sending text_message`);
              socket.emit("text_message", { text });
              setProcessing(true);
              // pause recognition
              rec.stop();
            }
          }
        }
      }
    };
    recognitionRef.current = rec;
  }, [connected, processing]);

  const startConversation = () => {
    if (!recognitionRef.current) return;
    shouldListenRef.current = true;
    setConversationActive(true);
    addLog("🚀 Conversation mode ON");
    recognitionRef.current.start();
  };

  const stopConversation = () => {
    shouldListenRef.current = false;
    setConversationActive(false);
    addLog("🛑 Conversation mode OFF");
    recognitionRef.current.stop();
  };

  return (
    <div>
      <h1>🎤 Continuous Voice Chat</h1>
      <div>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</div>
      <div>Listening: {recognizing ? "🎙️ Yes" : "🔇 No"}</div>
      <div>Processing: {processing ? "🔄 Yes" : "✅ No"}</div>
      <div>
        Conversation: {conversationActive ? "🟢 Active" : "🔴 Inactive"}
      </div>

      <div>
        <button
          onClick={startConversation}
          disabled={!connected || conversationActive}
        >
          ▶️ Start Conversation
        </button>
        <button onClick={stopConversation} disabled={!conversationActive}>
          🛑 Stop Conversation
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Chat:</h3>
        {messages.map((m, i) => (
          <p key={i}>
            <b>{m.role}:</b> {m.text}
          </p>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Logs:</h3>
        <div
          style={{
            background: "#000",
            color: "#0f0",
            padding: 10,
            height: 200,
            overflow: "auto",
            fontFamily: "monospace",
          }}
        >
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
