import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  language: { type: String, enum: ['en', 'hi', 'ta', 'bn', 'te'], default: 'en' },
  profile: { age: Number, state: String, occupation: String, annualIncome: Number, category: String, landHolding: Number, isStudent: Boolean, courseLevel: String },
  messages: [{ role: String, text: String, ts: { type: Date, default: Date.now } }],
  followUpCount: { type: Number, default: 0 },
  sensitiveWarningShown: { type: Boolean, default: false },
  consentDocs: { type: Boolean, default: false }
}, { timestamps: { createdAt: true, updatedAt: false } });

sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
export default mongoose.models.Session || mongoose.model('Session', sessionSchema);
