import React, { useEffect, useRef, useState } from 'react';
import { createSession, request } from './lib/api.js';
import { t } from './lib/i18n.js';

const suggestions = ['askBenefits','askDocuments','askApply','askDeadline','askEligible','askSimple'];
const sensitive = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?91[\s-]?)?[6-9]\d(?:[\s-]?\d){8}|\d(?:[\s-]?\d){11}|\b(?:my name|name is|bank account|bank details|phone number|email address|aadhaar|aadhar|identity number)\b/i;

export function AskSaathi() {
  const [open,setOpen]=useState(false);const [language,setLanguage]=useState(()=>localStorage.getItem('saathi-language')||'en');const [schemeId,setSchemeId]=useState('');const [messages,setMessages]=useState([]);const [question,setQuestion]=useState('');const [busy,setBusy]=useState(false);const [fallback,setFallback]=useState(false);const input=useRef(null);
  useEffect(()=>{const changed=event=>setLanguage(event.detail||localStorage.getItem('saathi-language')||'en');const ask=event=>{setSchemeId(event.detail?.schemeId||'');setOpen(true);setTimeout(()=>input.current?.focus(),0)};window.addEventListener('saathi:language',changed);window.addEventListener('saathi:ask',ask);return()=>{window.removeEventListener('saathi:language',changed);window.removeEventListener('saathi:ask',ask)}},[]);
  const send=async(value=question)=>{const text=value.trim();if(!text||busy)return;setQuestion('');if(sensitive.test(text)){setMessages(items=>[...items,{role:'assistant',text:t(language,'privacyReply')}]);return}setMessages(items=>[...items,{role:'user',text}]);setBusy(true);setFallback(false);try{let sessionId=sessionStorage.getItem('saathi-session');if(!sessionId){const created=await createSession(language);sessionId=created.sessionId;sessionStorage.setItem('saathi-session',sessionId)}const data=await request('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,question:text,schemeId})});setMessages(items=>[...items,{role:'assistant',text:data.answer}]);setFallback(Boolean(data.fallback))}catch{setMessages(items=>[...items,{role:'assistant',text:t(language,'askUnknown')}]);setFallback(true)}finally{setBusy(false)}};
  return <>
    <button type="button" className="ask-fab" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>💬 {t(language,'askSaathi')}</button>
    {open&&<aside className="ask-drawer" role="dialog" aria-modal="false" aria-labelledby="ask-title"><header className="ask-drawer-head"><div><span className="avatar" aria-hidden="true">S</span><div><h2 id="ask-title">{t(language,'askSaathi')}</h2><p>{t(language,'askNote')}</p></div></div><button className="outline-button" type="button" aria-label={t(language,'askClose')} onClick={()=>setOpen(false)}>×</button></header>
      <div className="ask-suggestions">{suggestions.map(key=><button type="button" key={key} onClick={()=>send(t(language,key))}>{t(language,key)}</button>)}</div>
      <div className="ask-messages" aria-live="polite">{messages.map((item,index)=><p key={index} className={`bubble ${item.role}`}>{item.text}</p>)}{busy&&<p className="bubble assistant" role="status">…</p>}</div>
      {fallback&&<small className="ask-fallback" role="status">{t(language,'askOffline')}</small>}
      <form className="ask-form" onSubmit={event=>{event.preventDefault();send()}}><label className="sr-only" htmlFor="ask-question">{t(language,'askPlaceholder')}</label><input id="ask-question" ref={input} value={question} onChange={event=>setQuestion(event.target.value)} placeholder={t(language,'askPlaceholder')} maxLength={500}/><button className="primary-button" disabled={busy||!question.trim()}>{t(language,'askSend')}</button></form>
    </aside>}
  </>;
}

export function ThemeToggle() {
  const [dark,setDark]=useState(()=>localStorage.getItem('saathi-theme')==='dark'||(!localStorage.getItem('saathi-theme')&&window.matchMedia?.('(prefers-color-scheme: dark)').matches));const [language,setLanguage]=useState(()=>localStorage.getItem('saathi-language')||'en');
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('saathi-theme',dark?'dark':'light')},[dark]);
  useEffect(()=>{const changed=event=>setLanguage(event.detail||'en');window.addEventListener('saathi:language',changed);return()=>window.removeEventListener('saathi:language',changed)},[]);
  return <button type="button" className="theme-toggle" aria-pressed={dark} onClick={()=>setDark(value=>!value)}>{dark?'☀️':'🌙'} {t(language,dark?'lightMode':'darkMode')}</button>;
}
