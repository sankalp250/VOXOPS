import React, { useState } from "react";
import { Plus, Trash2, Key, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";

/**
 * MENTOR LESSON: Controlled Components & Dynamic Form State
 * In React, form inputs are "controlled" by linking their value to `useState`.
 * When managing dynamic arrays (like a list of tools), we use immutable updates:
 * e.g., `setTools([...tools, newTool])` or `setTools(tools.filter((_, i) => i !== index))`
 */
export default function ClientConfigurator({ onClientCreated }) {
  const [name, setName] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful voice assistant. Be warm, fast, and concise — responses are read aloud over the phone."
  );
  const [tools, setTools] = useState([
    { name: "book_appointment", description: "Books a slot for the user", api_url: "mock://" },
  ]);
  const [intentExamplesText, setIntentExamplesText] = useState(
    '{"book_appointment": ["I want to book an appointment", "Schedule a slot"]}'
  );
  
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [error, setError] = useState(null);

  // Helper: add a new tool row
  const addTool = () => {
    setTools([...tools, { name: "", description: "", api_url: "mock://" }]);
  };

  // Helper: remove a tool row
  const removeTool = (index) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  // Helper: update a specific tool property
  const updateTool = (index, field, value) => {
    const updated = [...tools];
    updated[index][field] = value;
    setTools(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreatedKey(null);

    try {
      let parsedIntents = {};
      if (intentExamplesText.trim()) {
        parsedIntents = JSON.parse(intentExamplesText);
      }

      const clientPayload = {
        name,
        system_prompt: systemPrompt,
        language_code: languageCode,
        tools: tools.filter((t) => t.name.trim() !== ""),
        intent_examples: parsedIntents,
      };

      const response = await api.createClient(clientPayload);
      setCreatedKey(response.api_key);
      if (onClientCreated) onClientCreated(response);
    } catch (err) {
      setError(err.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Building2 style={{ color: "var(--accent-cyan)", width: 28, height: 28 }} />
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Client Tenant Onboarding</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Create a distinct, isolated AI voice assistant for your clinic, grocery store, or enterprise.
          </p>
        </div>
      </div>

      {createdKey && (
        <div style={{
          background: "rgba(16, 185, 129, 0.15)",
          border: "1px solid var(--accent-emerald)",
          borderRadius: 12,
          padding: "1rem",
          marginBottom: "1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
            <CheckCircle2 size={20} /> Client Tenant Registered Successfully!
          </div>
          <p style={{ color: "var(--text-primary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            Save this API Key immediately (it will not be shown again):
          </p>
          <code style={{
            display: "block",
            background: "#0f172a",
            padding: "0.5rem",
            borderRadius: 6,
            marginTop: "0.25rem",
            color: "var(--accent-cyan)",
            wordBreak: "break-all"
          }}>
            {createdKey}
          </code>
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(244, 63, 94, 0.15)",
          border: "1px solid var(--accent-rose)",
          borderRadius: 12,
          padding: "1rem",
          marginBottom: "1.5rem",
          color: "var(--accent-rose)",
          fontSize: "0.9rem"
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 4 }}>
              Business / Tenant Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. City Dental Clinic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "#fff",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 4 }}>
              Primary Language Code
            </label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "#fff",
              }}
            >
              <option value="en">English (en)</option>
              <option value="hi">Hindi / Hinglish (hi)</option>
              <option value="ta">Tamil (ta)</option>
              <option value="te">Telugu (te)</option>
              <option value="kn">Kannada (kn)</option>
              <option value="bn">Bengali (bn)</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            System Prompt (Agent Persona & Behavior)
          </label>
          <textarea
            rows={3}
            required
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: 8,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              color: "#fff",
              fontSize: "0.9rem",
            }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Configured Tools & Actions
            </label>
            <button
              type="button"
              onClick={addTool}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "transparent",
                border: "none",
                color: "var(--accent-cyan)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <Plus size={16} /> Add Tool
            </button>
          </div>

          {tools.map((tool, idx) => (
            <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="text"
                placeholder="Tool Name (e.g. order_item)"
                value={tool.name}
                onChange={(e) => updateTool(idx, "name", e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.6rem",
                  borderRadius: 6,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "#fff",
                  fontSize: "0.85rem",
                }}
              />
              <input
                type="text"
                placeholder="Description"
                value={tool.description}
                onChange={(e) => updateTool(idx, "description", e.target.value)}
                style={{
                  flex: 2,
                  padding: "0.4rem 0.6rem",
                  borderRadius: 6,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "#fff",
                  fontSize: "0.85rem",
                }}
              />
              {tools.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTool(idx)}
                  style={{
                    background: "rgba(244, 63, 94, 0.2)",
                    border: "none",
                    borderRadius: 6,
                    color: "var(--accent-rose)",
                    padding: "0.4rem 0.6rem",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            Few-Shot Intent Examples (JSON Object)
          </label>
          <textarea
            rows={2}
            value={intentExamplesText}
            onChange={(e) => setIntentExamplesText(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: 8,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              color: "var(--accent-cyan)",
              fontFamily: "monospace",
              fontSize: "0.8rem",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem",
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 15px rgba(56, 189, 248, 0.3)",
          }}
        >
          <Sparkles size={18} />
          {loading ? "Registering Client..." : "Create Multi-Tenant Client"}
        </button>
      </form>
    </div>
  );
}
