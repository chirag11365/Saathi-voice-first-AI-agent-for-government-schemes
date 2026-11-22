import { Router } from 'express';
import mongoose from 'mongoose';
import Session from '../models/Session.js';
import { memorySessions } from './session.js';
import schemes from '../data/schemes.json' with { type: 'json' };
import { evaluateEligibility } from '../services/eligibility.js';
import { generateJson } from '../services/gemini.js';

const router = Router();
router.get('/match/:sessionId', async (req, res) => {
  let session = memorySessions.get(req.params.sessionId);
  if (!session && mongoose.connection.readyState === 1) session = await Session.findById(req.params.sessionId).catch(() => null);
  if (!session) return res.status(404).json({ error: 'Session not found. Start a new conversation first.' });
  const language = { en: 'English', hi: 'Hindi', ta: 'Tamil', bn: 'Bengali' }[session.language] || 'English';
  const matches = await Promise.all(schemes.map(async scheme => {
    const check = evaluateEligibility(session.profile || {}, scheme.eligibility);
    const whatWouldChange = check.failedRules.length ? `This simplified check needs: ${check.failedRules.join('; ')}.` : '';
    let explanation = check.eligible === true ? `${scheme.benefits} Your shared details pass the simplified demo checks. Verify the current rules before applying.` : check.eligible === false ? `This scheme may not fit based on the details shared. ${whatWouldChange}` : `We need ${check.missingFields.join(', ')} to check this scheme. ${scheme.benefits}`;
    if (language === 'Hindi') {
      const labels = { occupation: 'काम', landHolding: 'खेती की ज़मीन', isStudent: 'छात्र होने की जानकारी', category: 'श्रेणी', state: 'राज्य', gender: 'लिंग', age: 'उम्र' };
      if (check.eligible === true) explanation = `आपकी दी हुई जानकारी इस योजना की सरल डेमो शर्तों से मेल खाती है। आवेदन से पहले आधिकारिक वेबसाइट पर मौजूदा नियम जाँचें।`;
      else if (check.eligible === false) explanation = `आपकी जानकारी के आधार पर यह योजना अभी मेल नहीं खाती। जाँचें: ${check.failedRules.map(rule => rule.replace('Must be a farmer', 'आवेदक किसान होना चाहिए').replace('Must own cultivable land', 'खेती की ज़मीन होनी चाहिए').replace('Must be a student', 'आवेदक छात्र होना चाहिए').replace('Must belong to an eligible category', 'योग्य श्रेणी की शर्त पूरी होनी चाहिए').replace('Must be at least 18 years old', 'आवेदक की उम्र कम से कम 18 वर्ष होनी चाहिए')).join(' और ')}।`;
      else explanation = `इस योजना की जाँच के लिए ${check.missingFields.map(field => labels[field] || field).join(', ')} की जानकारी चाहिए। कृपया यह जानकारी साझा करें।`;
    }
    try {
      const result = await generateJson('scheme-explanation', { scheme: scheme.name.en, eligibility: check.eligible, reasons: check.failedRules, missing: check.missingFields, language }, `Explain in ${language}, 6th grade reading level, at most 4 short sentences: what scheme gives, why person qualifies or does not, and next step. Never promise approval. Return JSON {explanation: string}.`);
      if (typeof result.explanation === 'string') explanation = result.explanation;
    } catch { /* keep a simple explanation if AI is unavailable */ }
    return { scheme, ...check, whatWouldChange, explanation, missingDocs: scheme.requiredDocs };
  }));
  res.json(matches);
});
export default router;
