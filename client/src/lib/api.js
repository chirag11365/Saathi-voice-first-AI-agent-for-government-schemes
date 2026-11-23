const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
export const API_BASE_URL = (configuredApiUrl || 'http://localhost:5000').replace(/\/+$/, '');
export async function request(path, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: options?.signal || controller.signal });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed');
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The server took too long to respond. Please try again.');
    throw error;
  } finally { clearTimeout(timer); }
}
export const createSession = language => request('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language }) });
export const sendChat = (sessionId, message) => request('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, message }) });
