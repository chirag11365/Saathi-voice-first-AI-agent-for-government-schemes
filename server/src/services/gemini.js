import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import AiCache from '../models/AiCache.js';

const memoryCache = new Map();
const hash = value => createHash('sha256').update(value).digest('hex');
async function cached(kind, input) {
  const id = hash(`${kind}:${JSON.stringify(input)}`);
  if (memoryCache.has(id)) return memoryCache.get(id);
  if (mongoose.connection.readyState === 1) {
    try { const row = await AiCache.findById(id).lean(); if (row) return row.response; } catch { /* cache is optional */ }
  }
  return null;
}
async function saveCache(kind, input, response) {
  const id = hash(`${kind}:${JSON.stringify(input)}`);
  memoryCache.set(id, response);
  if (mongoose.connection.readyState === 1) AiCache.updateOne({ _id: id }, { $set: { kind, response } }, { upsert: true }).catch(() => {});
}
export async function generateJson(kind, input, instruction) {
  const prior = await cached(kind, input);
  if (prior) return prior;
  if (!process.env.GEMINI_API_KEY) throw new Error('AI service is not configured');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite'].filter(Boolean);
  let lastError;
  for (let index = 0; index < models.length; index++) {
      try {
        const model = genAI.getGenerativeModel({ model: models[index], generationConfig: { responseMimeType: 'application/json' } });
        const result = await model.generateContent(`${instruction}\nReturn valid JSON only.\nINPUT:\n${JSON.stringify(input)}`, { timeout: 10000 });
        const value = JSON.parse(result.response.text());
        await saveCache(kind, input, value);
        return value;
      } catch (error) {
        lastError = error;
        const status = Number(error?.status || error?.statusCode) || 0;
        console.warn('Gemini request failed', { status });
      }
  }
  throw lastError || new Error('AI request failed');
}
