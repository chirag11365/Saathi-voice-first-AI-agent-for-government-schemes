import { Router } from 'express';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import Session from '../models/Session.js';
import { memorySessions } from './session.js';
import { applications, emit, newId } from '../services/applications.js';
import { runAgent } from '../services/agent.js';

const router=Router();
router.post('/',async(req,res)=>{const {sessionId,schemeId}=req.body||{};let session=memorySessions.get(sessionId);if(!session&&mongoose.connection.readyState===1)session=await Session.findById(sessionId).catch(()=>null);if(!session)return res.status(404).json({error:'Session not found'});const app={id:newId(),sessionId,schemeId,status:'queued',steps:[],events:[],clients:new Set(),filledValues:{},createdAt:new Date()};applications.set(app.id,app);app.status='running';runAgent(app,session.profile||{});res.status(202).json({applicationId:app.id});});
router.get('/:id/stream',(req,res)=>{const app=applications.get(req.params.id);if(!app)return res.sendStatus(404);res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.flushHeaders();app.clients.add(res);for(const event of app.events)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);req.on('close',()=>app.clients.delete(res));});
router.post('/:id/confirm',(req,res)=>{const app=applications.get(req.params.id);if(!app||app.status!=='awaiting_confirmation')return res.status(409).json({error:'Application is not waiting for confirmation'});app.resolveConfirm?.(true);res.json({ok:true});});
router.post('/:id/cancel',(req,res)=>{const app=applications.get(req.params.id);if(!app)return res.sendStatus(404);app.cancelled=true;app.resolveConfirm?.(false);res.json({ok:true});});
router.get('/:id/receipt',(req,res)=>{const app=applications.get(req.params.id);if(!app?.receiptPath||!fs.existsSync(app.receiptPath))return res.sendStatus(404);res.download(app.receiptPath,'saathi-receipt.pdf');});
export default router;
