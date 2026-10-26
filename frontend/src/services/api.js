/**
 * VOXOPS API Client Service Layer — Production-grade Fail-safe Client
 */

const API_BASE = '/api/v1';

/**
 * Universal safe response parser that prevents "Unexpected end of JSON input".
 * Handles empty bodies (204 No Content), HTML gateway error pages, and plain text responses.
 */
async function handleResponse(res) {
  const text = await res.text();
  let data = null;

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g., HTML from proxy or plaintext from 500 handler)
      data = { message: text.length > 200 ? `${text.slice(0, 200)}...` : text };
    }
  }

  if (!res.ok) {
    let message = data?.detail || data?.message || data?.error;
    if (!message) {
      if (res.status === 504 || res.status === 502) {
        message = 'Backend server unreachable on port 8000. Please start the backend.';
      } else {
        message = `Request failed (${res.status}: ${res.statusText || 'Error'})`;
      }
    }
    throw new Error(message);
  }

  return data;
}

export async function fetchClients() {
  const res = await fetch(`${API_BASE}/clients`);
  return handleResponse(res);
}

export async function createClient(payload) {
  const res = await fetch(`${API_BASE}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function getClientById(clientId) {
  const res = await fetch(`${API_BASE}/clients/${clientId}`);
  return handleResponse(res);
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
  return handleResponse(res);
}

export async function transcribeAudio(audioBlob, languageCode = 'en') {
  const formData = new FormData();
  let filename = 'recording.webm';
  if (audioBlob.type) {
    if (audioBlob.type.includes('wav')) filename = 'recording.wav';
    else if (audioBlob.type.includes('ogg')) filename = 'recording.ogg';
    else if (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')) filename = 'recording.m4a';
    else if (audioBlob.type.includes('webm')) filename = 'recording.webm';
  }
  formData.append('file', audioBlob, filename);
  formData.append('language_code', languageCode);
  formData.append('preferred_provider', 'auto');

  const res = await fetch(`${API_BASE}/audio/transcribe`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
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
  return handleResponse(res);
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
  return handleResponse(res);
}

export async function fetchRecentSessions() {
  const res = await fetch(`${API_BASE}/agent/sessions`);
  return handleResponse(res);
}

export async function checkSystemHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await handleResponse(res);
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

/**
 * Calls the backend TTS engine (Deepgram Aura / Sarvam Bulbul / ElevenLabs) and plays
 * the returned audio. Falls back to browser speech synthesis only when the backend is offline.
 *
 * @param {string} text          - Text to speak
 * @param {string} languageCode  - ISO language code (en, hi, ta, …)
 * @returns {Promise<HTMLAudioElement|null>} The playing Audio element, or null on failure
 */
export async function synthesizeSpeech(text, languageCode = 'en') {
  if (!text || !text.trim()) return null;

  try {
    const res = await fetch(`${API_BASE}/audio/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        language_code: languageCode,
        preferred_provider: 'auto',
      }),
    });

    if (!res.ok) throw new Error(`TTS backend error ${res.status}`);

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
    return audio;
  } catch (err) {
    console.warn('[TTS] Backend TTS failed, falling back to browser synthesis:', err.message);
    // Graceful degradation: use browser voice so the UI is never silent
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    }
    return null;
  }
}
