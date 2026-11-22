import { Router } from 'express';
import mongoose from 'mongoose';
import Session from '../models/Session.js';
import { memorySessions } from './session.js';
import { generateJson } from '../services/gemini.js';

const router = Router();
const languageNames = { en: 'English', hi: 'Hindi', ta: 'Tamil', bn: 'Bengali' };
const fields = ['name','age','gender','state','occupation','annualIncome','category','landHolding','isStudent','courseLevel','bankAccount','aadhaarLast4'];
function missing(profile) { return ['age','state','occupation','landHolding','annualIncome','category','isStudent','gender'].filter(key => profile?.[key] == null || profile[key] === ''); }
function normalize(field,value,message) {
  if(value==null)return null;
  const text=String(value).trim();
  if(['age','annualIncome','landHolding'].includes(field)){
    const number=Number(text.replace(/,/g,'').match(/\d+(?:\.\d+)?/)?.[0]);if(!Number.isFinite(number))return null;
    if(field==='annualIncome'&&/lakh|lac/i.test(text))return Math.round(number*100000);
    if(field==='annualIncome'&&/thousand/i.test(text))return Math.round(number*1000);
    return number;
  }
  if(field==='occupation'&&/\b(farmer|kisan|kisaan)\b|किसान/i.test(`${text} ${message}`))return 'farmer';
  if(field==='isStudent'){
    if(/\b(student|studying|enrolled)\b|छात्र|विद्यार्थी/i.test(message))return true;
    if(/\b(not a student|no longer studying|not studying)\b|छात्र नहीं|पढ़ाई नहीं/i.test(message))return false;
    return null;
  }
  if(field==='gender'){
    if(/\b(female|woman|girl)\b|महिला|औरत/i.test(`${text} ${message}`))return 'female';
    if(/\b(male|man|boy)\b|पुरुष|आदमी/i.test(`${text} ${message}`))return 'male';
  }
  if(field==='category'){
    const category=text.match(/\b(SC|ST|OBC|General)\b/i)?.[0];return category?category.toUpperCase():text;
  }
  if(field==='state'){
    const known=['Bihar','Maharashtra','Uttar Pradesh','Madhya Pradesh','Rajasthan','Tamil Nadu','West Bengal'];
    return known.find(state=>state.toLowerCase()===text.toLowerCase())||text;
  }
  if(field==='aadhaarLast4')return text.replace(/\D/g,'').slice(-4);
  return value;
}
router.post('/', async (req, res) => {
  const { sessionId, message } = req.body || {};
  if (!sessionId || !message?.trim()) return res.status(400).json({ error: 'sessionId and message are required' });
  let session = memorySessions.get(sessionId);
  if (!session && mongoose.connection.readyState === 1) session = await Session.findById(sessionId).catch(() => null);
  if (!session) return res.status(404).json({ error: 'Session not found. Please start a new conversation.' });
  session.messages ??= [];
  session.messages.push({ role: 'user', text: message, ts: new Date() });
  const language = languageNames[session.language] || 'English';
  try {
    const result = await generateJson('profile', { message, profile: session.profile, language }, `Extract only facts explicitly stated. Return JSON with keys ${fields.join(', ')} and reply. Use null for unknown. Never guess or infer category or income. Reply in ${language}. Ask one short follow-up question about the most important missing profile field.`);
    const profile = { ...(session.profile?.toObject?.() || session.profile || {}) };
    for (const field of fields) if (result[field] !== undefined && result[field] !== null) { const value=normalize(field,result[field],message); if(value!==null)profile[field]=value; }
    session.profile = profile;
    const reply = typeof result.reply === 'string' ? result.reply : 'I understood. Could you share your age, state, or occupation?';
    session.messages.push({ role: 'assistant', text: reply, ts: new Date() });
    if (session.save) await session.save();
    res.json({ reply, profile, missingFields: missing(profile) });
  } catch {
    const reply = session.language === 'hi' ? 'माफ़ कीजिए, अभी मैं आपकी बात समझ नहीं पाया। कृपया फिर से कोशिश करें।' : 'Sorry, I could not process that just now. Please try again.';
    session.messages.push({ role: 'assistant', text: reply, ts: new Date() });
    if (session.save) await session.save();
    res.json({ reply, profile: session.profile || {}, missingFields: missing(session.profile), warning: 'AI is temporarily unavailable.' });
  }
});
export default router;
