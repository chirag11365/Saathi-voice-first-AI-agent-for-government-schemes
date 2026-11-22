import { Router } from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import Session from '../models/Session.js';

const router = Router();
const memorySessions = new Map();
const expiryTimer = setInterval(() => { const cutoff=Date.now()-86400000; for(const [id,session] of memorySessions) if(new Date(session.createdAt).getTime()<cutoff) memorySessions.delete(id); }, 60*60*1000);
expiryTimer.unref();
router.post('/', async (req, res) => {
  const language = ['en', 'hi', 'ta', 'bn'].includes(req.body?.language) ? req.body.language : 'en';
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
