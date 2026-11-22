import { Router } from 'express';
import mongoose from 'mongoose';
import Session from '../models/Session.js';
import { memorySessions } from './session.js';
import schemes from '../data/schemes.json' with { type: 'json' };
import { evaluateEligibility } from '../services/eligibility.js';

const router = Router();
const copy = {
  en: { yes: 'Your shared answers match these simple demo checks. Confirm the current rules with the official scheme source.', no: 'Your shared answers do not meet one or more simplified demo checks.', maybe: 'Share more details if you want to check this scheme. The scheme office makes the final decision.', fields: 'Details still needed' },
  hi: { yes: 'आपके जवाब डेमो की सरल शर्तों से मेल खाते हैं। आधिकारिक योजना स्रोत पर मौजूदा नियम जाँचें।', no: 'आपके जवाब डेमो की एक या अधिक सरल शर्तों से मेल नहीं खाते।', maybe: 'इस योजना की जाँच के लिए चाहें तो और जानकारी दें। अंतिम निर्णय योजना कार्यालय का होगा।', fields: 'अभी आवश्यक जानकारी' },
  ta: { yes: 'நீங்கள் பகிர்ந்த பதில்கள் எளிய மாதிரி நிபந்தனைகளுடன் பொருந்துகின்றன. அதிகாரப்பூர்வ விதிகளைச் சரிபார்க்கவும்.', no: 'உங்கள் பதில்கள் ஒன்று அல்லது அதற்கு மேற்பட்ட எளிய மாதிரி நிபந்தனைகளுடன் பொருந்தவில்லை.', maybe: 'இந்தத் திட்டத்தைச் சரிபார்க்க விரும்பினால் மேலும் விவரங்களைப் பகிரவும். இறுதி முடிவு திட்ட அலுவலகத்தின்து.', fields: 'தேவையான விவரங்கள்' },
  bn: { yes: 'আপনার উত্তরগুলি ডেমোর সহজ শর্তের সঙ্গে মেলে। সরকারি উৎসে বর্তমান নিয়ম যাচাই করুন।', no: 'আপনার উত্তরগুলি ডেমোর এক বা একাধিক সহজ শর্ত পূরণ করে না।', maybe: 'এই প্রকল্প যাচাই করতে চাইলে আরও তথ্য দিন। চূড়ান্ত সিদ্ধান্ত প্রকল্প দপ্তরের।', fields: 'এখনও প্রয়োজন' },
  te: { yes: '\u0c2e\u0c40 \u0c38\u0c2e\u0c3e\u0c27\u0c3e\u0c28\u0c3e\u0c32\u0c41 \u0c21\u0c46\u0c2e\u0c4b \u0c38\u0c30\u0c33 \u0c28\u0c3f\u0c2c\u0c02\u0c27\u0c28\u0c32\u0c15\u0c41 \u0c38\u0c30\u0c3f\u0c2a\u0c4b\u0c24\u0c41\u0c28\u0c4d\u0c28\u0c3e\u0c2f\u0c3f. \u0c05\u0c27\u0c3f\u0c15\u0c3e\u0c30\u0c3f\u0c15 \u0c35\u0c28\u0c30\u0c41\u0c32\u0c4b \u0c24\u0c3e\u0c1c\u0c3e \u0c28\u0c3f\u0c2f\u0c2e\u0c3e\u0c32\u0c28\u0c41 \u0c24\u0c28\u0c3f\u0c16\u0c40 \u0c1a\u0c47\u0c2f\u0c02\u0c21\u0c3f.', no: '\u0c2e\u0c40 \u0c38\u0c2e\u0c3e\u0c27\u0c3e\u0c28\u0c3e\u0c32\u0c41 \u0c21\u0c46\u0c2e\u0c4b\u0c32\u0c4b\u0c28\u0c3f \u0c12\u0c15\u0c1f\u0c3f \u0c32\u0c47\u0c26\u0c3e \u0c05\u0c02\u0c24\u0c15\u0c02\u0c1f\u0c47 \u0c0e\u0c15\u0c4d\u0c15\u0c41\u0c35 \u0c38\u0c30\u0c33 \u0c28\u0c3f\u0c2c\u0c02\u0c27\u0c28\u0c32\u0c15\u0c41 \u0c38\u0c30\u0c3f\u0c2a\u0c4b\u0c32\u0c47\u0c26\u0c41.', maybe: '\u0c08 \u0c2a\u0c25\u0c15\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c24\u0c28\u0c3f\u0c16\u0c40 \u0c1a\u0c47\u0c2f\u0c3e\u0c32\u0c28\u0c41\u0c15\u0c41\u0c02\u0c1f\u0c47 \u0c2e\u0c30\u0c3f\u0c28\u0c4d\u0c28\u0c3f \u0c35\u0c3f\u0c35\u0c30\u0c3e\u0c32\u0c41 \u0c2a\u0c02\u0c1a\u0c41\u0c15\u0c02\u0c21\u0c3f. \u0c24\u0c41\u0c26\u0c3f \u0c28\u0c3f\u0c30\u0c4d\u0c23\u0c2f\u0c02 \u0c2a\u0c25\u0c15 \u0c15\u0c3e\u0c30\u0c4d\u0c2f\u0c3e\u0c32\u0c2f\u0c3e\u0c28\u0c3f\u0c26\u0c3f.', fields: '\u0c07\u0c02\u0c15\u0c3e \u0c05\u0c35\u0c38\u0c30\u0c2e\u0c48\u0c28 \u0c35\u0c3f\u0c35\u0c30\u0c3e\u0c32\u0c41' }
};
const fieldCopy = {
  en: { age:'age',state:'state',occupation:'work',annualIncome:'yearly income',landHolding:'land',category:'student category',isStudent:'student status' },
  hi: { age:'उम्र',state:'राज्य',occupation:'काम',annualIncome:'सालाना आय',landHolding:'ज़मीन',category:'छात्र श्रेणी',isStudent:'छात्र स्थिति' },
  ta: { age:'வயது',state:'மாநிலம்',occupation:'வேலை',annualIncome:'ஆண்டு வருமானம்',landHolding:'நிலம்',category:'மாணவர் வகை',isStudent:'மாணவர் நிலை' },
  bn: { age:'বয়স',state:'রাজ্য',occupation:'কাজ',annualIncome:'বার্ষিক আয়',landHolding:'জমি',category:'শিক্ষার্থীর বিভাগ',isStudent:'শিক্ষার্থী অবস্থা' },
  te: { age:'వయస్సు',state:'రాష్ట్రం',occupation:'పని',annualIncome:'వార్షిక ఆదాయం',landHolding:'భూమి',category:'విద్యార్థి వర్గం',isStudent:'విద్యార్థి స్థితి' }
};
router.get('/match/:sessionId', async (req, res) => {
  let session = memorySessions.get(req.params.sessionId);
  if (!session && mongoose.connection.readyState === 1) session = await Session.findById(req.params.sessionId).catch(() => null);
  if (!session) return res.status(404).json({ error: 'Session not found. Start a new conversation first.' });
  const lang = ['en','hi','ta','bn','te'].includes(session.language) ? session.language : 'en';
  const messages = copy[lang];
  const matches = schemes.map(scheme => {
    const check = evaluateEligibility(session.profile || {}, scheme.eligibility);
    const needed = check.missingFields.map(field => fieldCopy[lang][field] || field).join(', ');
    const explanation = check.eligible === true ? messages.yes : check.eligible === false ? messages.no : `${messages.maybe} ${messages.fields}: ${needed}.`;
    const whatWouldChange = check.failedRules.length ? check.failedRules.join('; ') : '';
    return { scheme, ...check, whatWouldChange, explanation, missingDocs: scheme.requiredDocs.filter(doc => !/aadhaar|identity|bank/i.test(doc)) };
  });
  res.json(matches);
});
export default router;
