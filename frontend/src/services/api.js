/**
 * VOXOPS API Client Service Layer
 */

const API_BASE = '/api/v1';

export async function fetchClients() {
  const res = await fetch(`${API_BASE}/clients`);
  if (!res.ok) throw new Error(`Failed to fetch clients: ${res.statusText}`);
  return res.json();
}

export async function createClient(payload) {
  const res = await fetch(`${API_BASE}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create client');
  }
  return res.json();
}

export async function getClientById(clientId) {
  const res = await fetch(`${API_BASE}/clients/${clientId}`);
  if (!res.ok) throw new Error('Client not found');
  return res.json();
}

export async function runAgentTurn({ transcript, clientId, apiKey, languageCode = 'en' }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-Client-API-Key'] = apiKey;
  }
  const body = {
    transcript,
    language_code: languageCode,
  };
  if (!apiKey && clientId) {
    body.client_id = clientId;
  }

  const res = await fetch(`${API_BASE}/agent/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Agent execution failed');
  }
  return res.json();
}

export async function transcribeAudio(audioBlob, languageCode = 'en') {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
  formData.append('language_code', languageCode);
  formData.append('preferred_provider', 'auto');

  const res = await fetch(`${API_BASE}/audio/transcribe`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Audio transcription failed');
  }
  return res.json();
}

export async function ingestMemory({ content, clientId, apiKey, metadata = {} }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Client-API-Key'] = apiKey;

  const res = await fetch(`${API_BASE}/memory/ingest`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content,
      client_id: clientId,
      metadata_info: metadata,
    }),
  });
  if (!res.ok) throw new Error('Memory ingestion failed');
  return res.json();
}

export async function searchMemory({ query, clientId, apiKey, topK = 3 }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Client-API-Key'] = apiKey;

  const res = await fetch(`${API_BASE}/memory/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      client_id: clientId,
      top_k: topK,
    }),
  });
  if (!res.ok) throw new Error('Memory search failed');
  return res.json();
}

export async function fetchRecentSessions() {
  const res = await fetch(`${API_BASE}/agent/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function checkSystemHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
