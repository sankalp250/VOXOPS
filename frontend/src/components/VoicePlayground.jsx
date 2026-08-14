import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, Volume2, ShieldAlert, Zap, Radio, PhoneOff } from "lucide-react";
import { api } from "../services/api";

/**
 * MENTOR LESSON: useRef vs useState in Real-Time Voice Applications
 *
 * ❓ Common Interview Question: "Why do we use useRef for WebSockets & Audio elements instead of useState?"
 *
 * 💡 Answer:
 * 1. `useState` triggers a full component re-render every time its value changes.
 * 2. An active WebSocket or Audio stream must NOT be torn down and recreated every time a button is clicked or text is typed!
 * 3. `useRef` provides a stable, mutable container that persists across re-renders without causing unwanted UI re-renders.
 */
export default function VoicePlayground({ activeClient }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFiller, setCurrentFiller] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Mutable references for persistent instances
  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onplay = () => setIsPlayingAudio(true);
    audioRef.current.onended = () => setIsPlayingAudio(false);
    audioRef.current.onpause = () => setIsPlayingAudio(false);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Connect to WebSocket when active client changes
  useEffect(() => {
    if (!activeClient) return;

    const wsUrl = `ws://localhost:8000/api/v1/ws/voice?client_id=${activeClient.id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log("Connected to VoxOps WebSocket Gateway");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log("WebSocket Disconnected");
    };

    // Cleanup on unmount or client switch
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [activeClient]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentFiller]);

  // Handle incoming WebSocket frames
  const handleWebSocketMessage = (data) => {
    if (data.type === "filler") {
      setCurrentFiller(data.text);
      if (data.audio_base64) {
        playBase64Audio(data.audio_base64);
      }
    } else if (data.type === "agent_response") {
      setCurrentFiller(null);
      setIsProcessing(false);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.response_text,
          intent: data.intent,
          slots: data.slots,
          latency: data.turn_latency_ms,
          guardrail: data.guardrail_flag,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      if (data.audio_base64) {
        playBase64Audio(data.audio_base64);
      }
    }
  };

  const playBase64Audio = (base64String) => {
    try {
      const audioUrl = `data:audio/wav;base64,${base64String}`;
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch((e) => console.log("Audio autoplay blocked by browser:", e));
      }
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  // User Interruption (Barge-In)
  const handleInterrupt = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingAudio(false);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interruption" }));
    }
  };

  // Send turn over WebSocket or REST fallback
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeClient) return;

    const userText = inputText.trim();
    setInputText("");
    setIsProcessing(true);
    setCurrentFiller("Thinking & checking tools…");

    // Add user message to UI immediately
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userText,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // Send via WebSocket if connected, else use REST API
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "speech",
          transcript: userText,
        })
      );
    } else {
      try {
        const res = await api.runAgentTurn({
          transcript: userText,
          clientId: activeClient.id,
          languageCode: activeClient.language_code,
        });

        setCurrentFiller(null);
        setIsProcessing(false);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: res.response_text,
            intent: res.intent,
            slots: res.slots,
            latency: res.turn_latency_ms,
            guardrail: res.guardrail_flag,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } catch (err) {
        setIsProcessing(false);
        setCurrentFiller(null);
        console.error("Agent run error:", err);
      }
    }
  };

  if (!activeClient) {
    return (
      <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          Please select or register a Client Tenant in the Onboarding tab to start testing.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header bar */}
      <div className="glass-card" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Active Client Playground
          </span>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
            {activeClient.name} ({activeClient.language_code})
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
            <Radio size={16} color={wsConnected ? "var(--accent-emerald)" : "var(--accent-amber)"} />
            <span style={{ color: wsConnected ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
              {wsConnected ? "WebSocket Connected" : "REST Mode"}
            </span>
          </div>

          {isPlayingAudio && (
            <button
              onClick={handleInterrupt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.8rem",
                borderRadius: 8,
                background: "rgba(244, 63, 94, 0.2)",
                border: "1px solid var(--accent-rose)",
                color: "var(--accent-rose)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.8rem",
              }}
            >
              <PhoneOff size={14} /> Barge-In (Interrupt)
            </button>
          )}
        </div>
      </div>

      {/* Message Chat Container */}
      <div
        className="glass-card"
        style={{
          height: "420px",
          padding: "1.5rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)" }}>
            <Volume2 size={36} style={{ opacity: 0.5, marginBottom: "0.5rem" }} />
            <p>Start typing or speak to test this client's dynamic agent persona.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "75%",
            }}
          >
            <div
              style={{
                padding: "0.8rem 1rem",
                borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, #0284c7, #2563eb)"
                    : "rgba(30, 41, 59, 0.8)",
                border: msg.role === "user" ? "none" : "1px solid var(--border-color)",
                color: "#fff",
                fontSize: "0.95rem",
              }}
            >
              {msg.text}

              {msg.intent && (
                <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  <span
                    style={{
                      background: "rgba(56, 189, 248, 0.2)",
                      color: "var(--accent-cyan)",
                      padding: "0.15rem 0.4rem",
                      borderRadius: 4,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    Intent: {msg.intent}
                  </span>

                  {msg.latency && (
                    <span
                      style={{
                        background: "rgba(168, 85, 247, 0.2)",
                        color: "var(--accent-purple)",
                        padding: "0.15rem 0.4rem",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                      }}
                    >
                      <Zap size={10} style={{ display: "inline" }} /> {msg.latency}ms
                    </span>
                  )}

                  {msg.guardrail && (
                    <span
                      style={{
                        background: "rgba(244, 63, 94, 0.2)",
                        color: "var(--accent-rose)",
                        padding: "0.15rem 0.4rem",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                      }}
                    >
                      <ShieldAlert size={10} style={{ display: "inline" }} /> Guardrail Flagged
                    </span>
                  )}
                </div>
              )}
            </div>

            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2, display: "block", textAlign: msg.role === "user" ? "right" : "left" }}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {currentFiller && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div className="audio-bar"></div>
            <div className="audio-bar"></div>
            <div className="audio-bar"></div>
            <span style={{ color: "var(--accent-cyan)", fontSize: "0.85rem", fontStyle: "italic" }}>
              {currentFiller}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} style={{ display: "flex", gap: "0.75rem" }}>
        <input
          type="text"
          placeholder="Speak or type a message (e.g. I want to book an appointment tomorrow)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isProcessing}
          style={{
            flex: 1,
            padding: "0.8rem 1.2rem",
            borderRadius: 12,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            color: "#fff",
            fontSize: "0.95rem",
          }}
        />

        <button
          type="submit"
          disabled={isProcessing || !inputText.trim()}
          style={{
            padding: "0 1.5rem",
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Send size={18} /> Send
        </button>
      </form>
    </div>
  );
}
