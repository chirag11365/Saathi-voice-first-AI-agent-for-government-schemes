import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
dotenv.config({ path: path.resolve('../.env') });
dotenv.config();
import sessionRoutes from './routes/session.js';
import chatRoutes from './routes/chat.js';
import schemesRoutes from './routes/schemes.js';
import applyRoutes from './routes/apply.js';
import documentRoutes from './routes/documents.js';
import transcribeRoutes from './routes/transcribe.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/session', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/schemes', schemesRoutes);
app.use('/api/apply', applyRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/transcribe', transcribeRoutes);
app.use('/storage', express.static(path.resolve('storage')));

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`Saathi API listening on ${port}`));

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected')).catch(() => {
    console.warn('MongoDB unavailable; sessions will use in-memory storage.');
  });
}
