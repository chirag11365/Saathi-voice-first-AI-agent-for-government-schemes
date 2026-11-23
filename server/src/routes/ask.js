import { Router } from 'express';
import mongoose from 'mongoose';
import Session from '../models/Session.js';
import { memorySessions } from './session.js';
import schemes from '../data/schemes.json' with { type: 'json' };
import { evaluateEligibility } from '../services/eligibility.js';
import { generateJson } from '../services/gemini.js';

const router = Router();
const windows = new Map();
const sensitive = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?91[\s-]?)?[6-9]\d(?:[\s-]?\d){8}|\d(?:[\s-]?\d){11}|\b(?:my name|name is|bank account|bank details|phone number|email address|aadhaar|aadhar|identity number)\b/i;
const fallback = {
  en: { unknown: 'I cannot confirm that from the scheme details here. Please check the official source:', docs: 'The demo checklist shows: ', apply: 'To try the demo, choose Apply for me, review the mock form, and confirm only if it looks right.', eligible: 'The rule based check shows: ', disclaimer: 'The scheme office makes the final decision.' },
  hi: { unknown: 'यह जानकारी योजना विवरण में नहीं है। आधिकारिक स्रोत देखें:', docs: 'डेमो सूची में ये दस्तावेज़ हैं: ', apply: 'डेमो के लिए “मेरे लिए आवेदन करें” चुनें, नकली फ़ॉर्म देखें, और सही लगे तभी पुष्टि करें।', eligible: 'नियम आधारित जाँच का परिणाम: ', disclaimer: 'अंतिम निर्णय योजना कार्यालय का है।' },
  ta: { unknown: 'இந்தத் தகவல் திட்ட விவரங்களில் இல்லை. அதிகாரப்பூர்வ மூலத்தைப் பார்க்கவும்:', docs: 'மாதிரி பட்டியலில் உள்ள ஆவணங்கள்: ', apply: 'மாதிரியை முயற்சிக்க “எனக்காக விண்ணப்பிக்கவும்” என்பதைத் தேர்ந்து, படிவத்தைப் பார்த்து, சரியாக இருந்தால் உறுதிப்படுத்தவும்.', eligible: 'விதி அடிப்படையிலான சரிபார்ப்பு: ', disclaimer: 'இறுதி முடிவு திட்ட அலுவலகத்தின்து.' },
  bn: { unknown: 'এই তথ্য প্রকল্পের বিবরণে নেই। সরকারি উৎস দেখুন:', docs: 'ডেমো তালিকায় থাকা নথি: ', apply: 'ডেমো চেষ্টা করতে “আমার জন্য আবেদন” নির্বাচন করুন, মক ফর্ম দেখুন, ঠিক থাকলে নিশ্চিত করুন।', eligible: 'নিয়মভিত্তিক যাচাইয়ের ফল: ', disclaimer: 'চূড়ান্ত সিদ্ধান্ত প্রকল্প দপ্তরের।' },
  te: { unknown: 'ఈ సమాచారం పథక వివరాల్లో లేదు. అధికారిక వనరును చూడండి:', docs: 'డెమో జాబితాలోని పత్రాలు: ', apply: 'డెమో ప్రయత్నించడానికి “నా కోసం దరఖాస్తు” ఎంచుకుని, నమూనా ఫారమ్ చూసి, సరైనదైతే నిర్ధారించండి.', eligible: 'నియమాల ఆధారిత తనిఖీ ఫలితం: ', disclaimer: 'తుది నిర్ణయం పథక కార్యాలయానిది.' }
};
function filteredDocs(scheme) { return scheme.requiredDocs.filter(doc => !/aadhaar|identity|bank/i.test(doc)); }
function faqAnswer(question, scheme, language, result) {
  const copy = fallback[language] || fallback.en;
  const text = question.toLowerCase();
  if (/document|paper|दस्तावेज़|ஆவண|নথি|పత్రం/i.test(text)) return copy.docs + (filteredDocs(scheme).join(', ') || copy.unknown);
  if (/benefit|offer|मिलता|लाभ|உதவி|সুবিধা|ప్రయోజనం/i.test(text)) return scheme.benefitsByLanguage?.[language] || scheme.benefits;
  if (/apply|application|आवेदन|விண்ணப்ப|আবেদন|దరఖాస్తు/i.test(text)) return copy.apply;
  if (/deadline|last date|due date|तारीख|கடைசி தேதி|শেষ তারিখ|చివరి తేదీ/i.test(text)) return `${copy.unknown} ${scheme.sourceUrl}`;
  if (/eligible|qualify|पात्र|தகுதி|যোগ্য|అర్హ/i.test(text)) return copy.eligible + (result.eligible === true ? 'Eligible.' : result.eligible === false ? 'Not eligible under the simplified rules.' : 'Maybe; more details are needed.') + ' ' + copy.disclaimer;
  return `${copy.unknown} ${scheme.sourceUrl}`;
}
router.post('/', async (req, res) => {
  const { sessionId, question, schemeId, simple = false } = req.body || {};
  if (!sessionId || typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: 'sessionId and question are required' });
  let session = memorySessions.get(sessionId);
  if (!session && mongoose.connection.readyState === 1) session = await Session.findById(sessionId).catch(() => null);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const now = Date.now();
  const current = windows.get(sessionId) || { start: now, count: 0 };
  if (now - current.start > 60000) { current.start = now; current.count = 0; }
  current.count += 1; windows.set(sessionId, current);
  const lang = ['en','hi','ta','bn','te'].includes(session.language) ? session.language : 'en';
  const scheme = schemes.find(item => item.id === schemeId) || schemes[0];
  const profile = session.profile?.toObject?.() || session.profile || {};
  const check = evaluateEligibility(profile, scheme.eligibility);
  const answerFallback = faqAnswer(question, scheme, lang, check);
  const source = scheme.sourceUrl;
  if (current.count > 15 || sensitive.test(question)) return res.json({ answer: sensitive.test(question) ? fallback[lang].unknown : answerFallback, source, fallback: true });
  const grounding = {
    scheme: { name: scheme.name[lang] || scheme.name.en, summary: scheme.summary, benefit: scheme.benefitsByLanguage?.[lang] || scheme.benefits, documents: filteredDocs(scheme), officialSource: source, verifiedDate: scheme.lastVerified },
    profile: Object.fromEntries(['age','state','occupation','annualIncome','category','landHolding','isStudent','courseLevel'].filter(key => profile[key] != null).map(key => [key, profile[key]])),
    ruleCheck: { result: check.eligible, missingFields: check.missingFields, failedRules: check.failedRules }
  };
  const cacheQuestion = question.trim().slice(0, 500) + (simple ? ' [simple]' : '');
  const task = generateJson('ask-saathi', { question: cacheQuestion, schemeId: scheme.id, language: lang }, `Grounding facts: ${JSON.stringify(grounding)}. Answer only from these scheme facts and deterministic ruleCheck. Never make an eligibility decision; if asked, report the supplied ruleCheck exactly and say the scheme office decides. Never promise approval or request personal details, bank, Aadhaar, phone, email, name, or ID. If facts do not answer the question, say that and point to officialSource. Reply in language ${lang}, no more than 3 short sentences. ${simple ? 'Use very simple words.' : ''} Return JSON {answer:string}.`);
  try {
    const result = await Promise.race([task, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 9500))]);
    const answer = typeof result.answer === 'string' ? result.answer.split(/(?<=[.!?।])\s+/u).slice(0, 3).join(' ').slice(0, 700) : answerFallback;
    res.json({ answer, source, fallback: false });
  } catch (error) {
    if (error?.message === 'timeout') console.warn('Ask Saathi Gemini request failed', { status: 0 });
    res.json({ answer: answerFallback, source, fallback: true, note: 'AI is unavailable; using verified scheme information.' });
  }
});
export default router;
