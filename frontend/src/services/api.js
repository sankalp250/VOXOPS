/**
 * VOXOPS API Client Service
 * Connects to FastAPI Backend at http://localhost:8000/api/v1
 */

const API_BASE_URL = "http://localhost:8000/api/v1";

export const api = {
  // 1. Health Check
  async checkHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.json();
  },

  // 2. Client Management (Multi-Tenancy)
  async listClients() {
    const res = await fetch(`${API_BASE_URL}/clients`);
    if (!res.ok) throw new Error("Failed to load clients");
    return res.json();
  },

  async createClient(clientData) {
    const res = await fetch(`${API_BASE_URL}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create client");
    }
    return res.json();
  },

  // 3. Agent Execution Turn
  async runAgentTurn({ transcript, clientId, apiKey, languageCode = "en" }) {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["X-Client-API-Key"] = apiKey;

    const res = await fetch(`${API_BASE_URL}/agent/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        transcript,
        client_id: clientId,
        language_code: languageCode,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to run agent turn");
    }
    return res.json();
  },

  // 4. Vector Memory (RAG)
  async ingestMemory({ content, clientId, apiKey, metadata = {} }) {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["X-Client-API-Key"] = apiKey;

    const res = await fetch(`${API_BASE_URL}/memory/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content,
        client_id: clientId,
        metadata_info: metadata,
      }),
    });
    if (!res.ok) throw new Error("Failed to ingest memory");
    return res.json();
  },

  async searchMemory({ query, clientId, apiKey, topK = 3 }) {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["X-Client-API-Key"] = apiKey;

    const res = await fetch(`${API_BASE_URL}/memory/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        client_id: clientId,
        top_k: topK,
      }),
    });
    if (!res.ok) throw new Error("Failed to search memory");
    return res.json();
  },

  // 5. Telemetry & Sessions
  async listSessions() {
    const res = await fetch(`${API_BASE_URL}/agent/sessions`);
    if (!res.ok) throw new Error("Failed to load sessions");
    return res.json();
  },
};
