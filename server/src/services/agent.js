import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { emit, waitForConfirm } from './applications.js';
import schemes from '../data/schemes.json' with { type: 'json' };

const storage = path.resolve('storage');
async function receipt(app, scheme) {
  await fs.mkdir(storage, { recursive: true });
  const receiptPath = path.join(storage, `${app.id}.pdf`);
  await new Promise((resolve, reject) => { const pdf = new PDFDocument(); const out = createWriteStream(receiptPath); pdf.pipe(out); pdf.fontSize(22).text('Saathi Demo Application Receipt'); pdf.moveDown().fontSize(12).text('DEMO PORTAL — not a government receipt'); pdf.moveDown().text(`Scheme: ${scheme.name.en}`).text(`Tracking ID: ${app.trackingId}`).text(`Application date: ${new Date().toLocaleDateString('en-IN')}`); pdf.end(); out.on('finish', resolve); out.on('error', reject); });
  app.receiptPath = receiptPath;
}
export async function runAgent(app, profile) {
  const scheme = schemes.find(row => row.id === app.schemeId);
  let browser;
  const started = Date.now();
  try {
    browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false' });
    const page = await browser.newPage(); page.setDefaultTimeout(8000);
    emit(app, 'step', { message: 'Opening the demo portal' });
    await page.goto(`${process.env.MOCK_PORTAL_URL || 'http://localhost:5001'}${scheme.portalPath.replace('pm-kisan','pmkisan').replace('post-matric-scholarship','scholarship').replace('ayushman-bharat','ayushman').replace('pm-awas-urban','awas').replace('nsap-old-age-pension','pension')}`, { waitUntil: 'domcontentloaded' });
    const initialIncome = profile.annualIncome ?? '';
    const values = { name: profile.name || 'Demo Applicant', age: profile.age ?? '', state: profile.state || '', income: process.env.PORTAL_HICCUP !== 'false' && initialIncome !== '' ? Number(initialIncome).toLocaleString('en-IN') : initialIncome, category: profile.category || '', bank: profile.bankAccount || '' };
    let count=0;
    for (const [field,value] of Object.entries(values)) { if (!value) continue; const locator=page.locator(`#${field}`); if(await locator.evaluate(el=>el.tagName==='SELECT')) await locator.selectOption({label:String(value)}); else await locator.fill(String(value)); count++; emit(app,'step',{message:`Filling ${field}`}); if(count%2===0) { const file=path.join(storage,`${app.id}-${count}.png`); await fs.mkdir(storage,{recursive:true}); await page.screenshot({path:file}); emit(app,'screenshot',{path:`/storage/${path.basename(file)}`}); } }
    app.filledValues = { ...values, bank: values.bank ? `••••${String(values.bank).slice(-4)}` : '' };
    const screenshot=path.join(storage,`${app.id}-review.png`); await fs.mkdir(storage,{recursive:true}); await page.screenshot({path:screenshot}); emit(app,'screenshot',{path:`/storage/${path.basename(screenshot)}`});
    app.status='awaiting_confirmation'; emit(app,'awaiting_confirmation',{values:app.filledValues,screenshot:`/storage/${path.basename(screenshot)}`});
    const confirmed = await waitForConfirm(app);
    if (app.cancelled) { app.status='failed'; emit(app,'error',{message:'Application cancelled.'}); return; }
    if (!confirmed) { app.status='failed'; emit(app,'error',{message:'Review timed out; application cancelled.'}); return; }
    await page.locator('form button[type="submit"]').click();
    if (await page.locator('#error').count()) { emit(app,'step',{message:'Portal rejected the income format; correcting and retrying.'}); await page.locator('#income').fill(String(values.income).replaceAll(',','')); await page.locator('form button[type="submit"]').click(); }
    app.trackingId=await page.locator('#tracking').innerText(); app.status='submitted'; await receipt(app,scheme); emit(app,'done',{trackingId:app.trackingId});
  } catch (error) { console.error('Application agent failed:', error.message); app.status='failed'; emit(app,'error',{message:Date.now()-started>60000?'The demo application timed out. Please try again.':'The demo portal could not complete the application. Please try again.'}); }
  finally { if(browser) await browser.close().catch(()=>{}); }
}
