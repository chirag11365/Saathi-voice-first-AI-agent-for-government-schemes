import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Session from '../models/Session.js';
import { memorySessions } from './session.js';
const router=Router();const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024}});
router.post('/',upload.single('audio'),async(req,res)=>{const id=req.body.sessionId;let session=memorySessions.get(id);if(!session&&mongoose.connection.readyState===1)session=await Session.findById(id).catch(()=>null);if(!session)return res.status(404).json({error:'Session not found'});if(!req.file)return res.status(400).json({error:'Audio file is required'});if(!process.env.GEMINI_API_KEY)return res.status(503).json({error:'Transcription is unavailable. Please type your message.'});try{const client=new GoogleGenerativeAI(process.env.GEMINI_API_KEY);const model=client.getGenerativeModel({model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'});const result=await model.generateContent([{inlineData:{mimeType:req.file.mimetype,data:req.file.buffer.toString('base64')}},`Transcribe this audio exactly in ${({en:'English',hi:'Hindi',ta:'Tamil',bn:'Bengali'})[session.language]||'English'}. Return only the transcript.`],{timeout:30000});res.json({text:result.response.text().trim()});}catch{res.status(503).json({error:'Could not transcribe that audio. Please try again or type your message.'});}});
export default router;
