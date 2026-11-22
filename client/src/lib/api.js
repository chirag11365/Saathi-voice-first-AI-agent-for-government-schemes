const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export async function request(path, options) {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed');
  return response.json();
}
export const createSession = language => request('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language }) });
export const sendChat = (sessionId, message) => request('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, message }) });
