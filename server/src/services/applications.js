import { randomUUID } from 'node:crypto';
export const applications = new Map();
export function emit(app, type, data = {}) { app.events.push({ type, data, ts: new Date().toISOString() }); for (const client of app.clients) client.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); }
export function waitForConfirm(app, timeoutMs = 120000) { return new Promise(resolve => { const timer = setTimeout(() => resolve(false), timeoutMs); app.resolveConfirm = value => { clearTimeout(timer); resolve(value); }; }); }
export const newId = () => randomUUID();
