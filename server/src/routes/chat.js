import { Router } from 'express';
import mongoose from 'mongoose';
import Session from '../models/Session.js';
import { memorySessions } from './session.js';
import { generateJson } from '../services/gemini.js';

const router = Router();
const fields = ['age','state','occupation','annualIncome','category','landHolding','isStudent','courseLevel'];
const sensitive = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?91[\s-]?)?[6-9]\d(?:[\s-]?\d){8}|\d(?:[\s-]?\d){11}|\b(?:my name|name is|i am called|my gender|bank account|bank details|phone number|email address|aadhaar|aadhar|आधार|बैंक खाता|फोन नंबर)\b|(?:bank|account|phone|mobile|बैंक|खाता|फ़ोन)[^\d]{0,24}\d{6,}/i;
const privacyReply = { en: "You don’t need to share that. I’ll use demo values for the form.", hi: 'आपको यह जानकारी साझा करने की ज़रूरत नहीं है। फ़ॉर्म में डेमो जानकारी इस्तेमाल होगी।', ta: 'இந்த விவரத்தைப் பகிர வேண்டாம். படிவத்தில் மாதிரி விவரங்களைப் பயன்படுத்துவோம்.', bn: 'এই তথ্য দেওয়ার দরকার নেই। ফর্মে ডেমো তথ্য ব্যবহার করা হবে।', te: 'ఈ వివరాలు పంచుకోవాల్సిన అవసరం లేదు. ఫారమ్‌లో డెమో వివరాలు ఉపయోగిస్తాం.' };
const fallbackReply = { en: 'You can skip this. Share your age group, state, or work if you like.', hi: 'आप इसे छोड़ सकते हैं। चाहें तो उम्र, राज्य या काम बताएं।', ta: 'இதைத் தவிர்க்கலாம். விரும்பினால் வயது, மாநிலம் அல்லது வேலையைச் சொல்லுங்கள்.', bn: 'এটি এড়িয়ে যেতে পারেন। চাইলে বয়স, রাজ্য বা কাজ বলুন।', te: 'దీన్ని వదిలేయవచ్చు. కావాలంటే వయస్సు, రాష్ట్రం లేదా పని చెప్పండి.' };
function missing(profile = {}) { return ['age','state','occupation'].filter(key => profile?.[key] == null || profile[key] === ''); }
function normalize(field, value) {
  if (value == null) return null;
  if (['age','annualIncome','landHolding'].includes(field)) { const n = Number(String(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0]); return Number.isFinite(n) && n >= 0 ? n : null; }
  if (field === 'occupation') return /farmer|kisan/i.test(String(value)) ? 'farmer' : /student/i.test(String(value)) ? 'student' : String(value).slice(0, 80);
  if (field === 'isStudent') return typeof value === 'boolean' ? value : null;
  if (field === 'category') return /^(sc|st|obc|general)$/i.test(String(value)) ? String(value).toUpperCase() : null;
  if (field === 'state') return String(value).slice(0, 80);
  if (field === 'courseLevel') return String(value).slice(0, 80);
  return null;
}
router.post('/', async (req, res) => {
  const { sessionId, message } = req.body || {};
  if (typeof message !== 'string' || !sessionId || !message.trim()) return res.status(400).json({ error: 'sessionId and message are required' });
  let session = memorySessions.get(sessionId);
  if (!session && mongoose.connection.readyState === 1) session = await Session.findById(sessionId).catch(() => null);
  if (!session) return res.status(404).json({ error: 'Session not found. Please start a new conversation.' });
  session.messages ??= [];
  const lang = ['en','hi','ta','bn','te'].includes(session.language) ? session.language : 'en';
  if (sensitive.test(message)) {
    const reply = session.sensitiveWarningShown ? '' : privacyReply[lang];
    session.sensitiveWarningShown = true;
    if (reply) session.messages.push({ role: 'assistant', text: reply, ts: new Date() });
    if (session.save) await session.save();
    return res.json({ reply, profile: session.profile || {}, missingFields: missing(session.profile), sensitiveInputDiscarded: true });
  }
  const profile = { ...(session.profile?.toObject?.() || session.profile || {}) };
  if (/^(skip|no|don't know|do not know|not sure|ಪತಾ नहीं|மறுக்கிறேன்)$/i.test(message.trim())) {
    return res.json({ reply: fallbackReply[lang], profile, missingFields: missing(profile), skipped: true });
  }
  session.messages.push({ role: 'user', text: message.slice(0, 500), ts: new Date() });
  let reply = fallbackReply[lang];
  try {
    const result = await generateJson('profile', { message: message.slice(0, 500), profile, language: lang }, `Extract only explicitly stated facts from this permitted scheme profile information. Return JSON keys ${fields.join(', ')} and reply. Do not request or return name, gender, phone, email, ID, Aadhaar, or bank details. Use null for unknown. Reply in language code ${lang}. Ask at most one short question, and only if follow-up count is below 2.`);
    for (const field of fields) if (result[field] != null) { const value = normalize(field, result[field]); if (value != null) profile[field] = value; }
    if (typeof result.reply === 'string') reply = result.reply.split(/(?<=[.!?।])\s+/u).slice(0, 2).join(' ').slice(0, 360);
    if (/[?？]$/.test(reply) && (session.followUpCount || 0) < 2) session.followUpCount = (session.followUpCount || 0) + 1;
    else if ((session.followUpCount || 0) >= 2) reply = reply.replace(/[^.!?।]*[?？]/g, '').trim() || fallbackReply[lang];
  } catch { /* deterministic profile remains usable without Gemini */ }
  session.profile = profile;
  session.messages.push({ role: 'assistant', text: reply, ts: new Date() });
  if (session.save) await session.save();
  res.json({ reply, profile, missingFields: missing(profile) });
});
export default router;
