import { Router } from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import Session from '../models/Session.js';

const router = Router();
const memorySessions = new Map();
const expiryTimer = setInterval(() => { const cutoff=Date.now()-86400000; for(const [id,session] of memorySessions) if(new Date(session.createdAt).getTime()<cutoff) memorySessions.delete(id); }, 60*60*1000);
expiryTimer.unref();
router.post('/', async (req, res) => {
  const language = ['en', 'hi', 'ta', 'bn', 'te'].includes(req.body?.language) ? req.body.language : 'en';
  try {
    if (mongoose.connection.readyState === 1) {
      const session = await Session.create({ language, profile: {}, messages: [] });
      return res.status(201).json({ sessionId: session.id });
    }
  } catch { /* continue with the demo fallback */ }
  const sessionId = randomUUID();
  memorySessions.set(sessionId, { language, profile: {}, messages: [], createdAt: new Date() });
  res.status(201).json({ sessionId });
});

router.post('/:id/profile', async (req, res) => {
  let session = memorySessions.get(req.params.id);
  if (!session && mongoose.connection.readyState === 1) session = await Session.findById(req.params.id).catch(() => null);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const allowed = ['age','state','occupation','annualIncome','category','landHolding','isStudent','courseLevel'];
  const incoming = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  for (const key of ['age','annualIncome','landHolding']) if (incoming[key] != null) {
    const number = Number(incoming[key]);
    if (!Number.isFinite(number) || number < 0) return res.status(400).json({ error: 'Invalid profile value' });
    incoming[key] = number;
  }
  const prior = session.profile?.toObject?.() || session.profile || {};
  session.profile = { ...prior, ...incoming };
  if (session.save) await session.save();
  res.json({ profile: session.profile });
});

router.post('/:id/consent', async (req, res) => {
  let session = memorySessions.get(req.params.id);
  if (!session && mongoose.connection.readyState === 1) session = await Session.findById(req.params.id).catch(() => null);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.consentDocs = req.body?.consent === true;
  if (session.save) await session.save();
  res.json({ consentDocs: session.consentDocs });
});

export { memorySessions };
export default router;
