# SDD: Saathi – Voice-First AI Agent for Government Schemes

Hackathon: IDEA//FORGE Online Hackathon, Track 1 (Civic Pulse, Digital Governance & Public Information). Combines problem 1 (Multilingual Policy, Rights & Scheme Explainer) and problem 3 (Autonomous Public Service Execution Agent).

Build rule: a flawless, demo-able end-to-end flow beats breadth. Keep code simple, readable, and runnable at every step. If something is ambiguous, choose the simplest option and note it in the README.

---

## 1. Goal

A web app where a citizen speaks or types in their own language (Hindi, English, Tamil, Bengali) and Saathi:
1. Understands their situation (age, income, state, occupation, category, land, etc.)
2. Finds government schemes they may be eligible for, explains each in simple language, and for non-eligible schemes explains why not and what would need to change
3. Extracts details from an uploaded document (income certificate / ID) using Gemini Vision
4. Autonomously fills the application on a mock government portal using Playwright, streaming live progress
5. Pauses for the user to review and confirm before submitting
6. Returns a tracking ID and a downloadable receipt PDF

Pitch line: "Schemes exist, but most eligible people never claim them because of language, jargon, and portal friction. Saathi speaks their language and does the paperwork for them."

## 2. Tech Stack

- Frontend: React (Vite) + Tailwind CSS + React Router
- Backend: Node.js + Express
- DB: MongoDB (Mongoose)
- AI: Google Gemini API via `@google/generative-ai`. Model names from env: `GEMINI_MODEL` (primary, a fast Flash model) and `GEMINI_FALLBACK_MODEL`. Use vision for documents, structured/JSON output for extraction.
- Browser agent: Playwright (Node), headless toggle via env
- Voice in: browser Web Speech API (SpeechRecognition), lang codes hi-IN, en-IN, ta-IN, bn-IN, with an audio-upload fallback (see 11 and 17)
- Voice out: browser SpeechSynthesis
- Live progress: Server-Sent Events (SSE)
- Receipt PDF: `pdfkit`
- Mock portal: separate Express app (port 5001) serving simple HTML forms per scheme
- Root `npm run dev` starts client, server, and mock portal together (use `concurrently`)

## 3. Folder Structure

```
saathi/
  client/                 # React app
    src/
      pages/ (Home.jsx, Matches.jsx, Upload.jsx, AgentView.jsx)
      components/ (ChatBubble, ProfileCard, SchemeCard, StepTimeline, MicButton, LangSwitch, DemoChips, ConfirmReview)
      lib/ (api.js, speech.js, i18n.js)
  server/
    src/
      routes/ (session.js, chat.js, schemes.js, documents.js, apply.js, transcribe.js, health.js)
      services/ (gemini.js, eligibility.js, agent.js, receipt.js, cache.js)
      models/ (Application.js, Session.js, AiCache.js)
      data/schemes.json
      tests/ (eligibility.test.js)
  mock-portal/
    server.js
    views/ (scholarship.html, pmkisan.html, ayushman.html, ujjwala.html, awas.html, pension.html, success.html)
  Dockerfile.server
  Dockerfile.portal
  docker-compose.yml
  README.md
  DEPLOY.md
  DEMO_SCRIPT.md
  .env.example
```

## 4. Scheme Knowledge Base (`server/src/data/schemes.json`)

Seed 6 schemes: PM-KISAN, Post-Matric Scholarship (SC/ST/OBC), Ayushman Bharat PM-JAY, PM Ujjwala Yojana, PM Awas Yojana (Urban), National Social Assistance Programme (old-age pension).

Each scheme object:
```json
{
  "id": "pm-kisan",
  "name": { "en": "PM-KISAN", "hi": "पीएम-किसान" },
  "ministry": "Ministry of Agriculture & Farmers Welfare",
  "summary": "...",
  "benefits": "...",
  "eligibility": [
    { "field": "occupation", "op": "eq", "value": "farmer", "label": "Must be a farmer" },
    { "field": "landHolding", "op": "gt", "value": 0, "label": "Must own cultivable land" }
  ],
  "requiredDocs": ["Aadhaar", "Land record", "Bank passbook"],
  "portalPath": "/pmkisan",
  "formFields": { "name": "#name", "age": "#age", "state": "#state", "annualIncome": "#income", "bankAccount": "#bank" },
  "sourceUrl": "<official scheme page URL>",
  "lastVerified": "YYYY-MM-DD"
}
```
Supported rule ops: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `isTrue`. Each rule has a human-readable `label` used in explanations.

IMPORTANT:
- Eligibility rules are simplified for the demo. Put `sourceUrl` and `lastVerified` on every scheme and show both on the scheme card.
- Show a persistent UI disclaimer: "Eligibility is indicative. Please verify on the official website before applying."
- Leave a `// TODO verify against official source` comment on each rule set. Do not invent rules you are unsure of; prefer fewer, well-known rules.

## 5. Data Models

- Session: `{ _id, language, profile: {name, age, gender, state, occupation, annualIncome, category, landHolding, isStudent, courseLevel, bankAccount, aadhaarLast4}, messages: [{role, text, ts}], consentDocs: Boolean, createdAt }` with a TTL index deleting sessions 24 hours after `createdAt`.
- Application: `{ _id, sessionId, schemeId, status (queued|running|awaiting_confirmation|submitted|failed), steps: [{ts, message, screenshotPath}], filledValues: {}, trackingId, receiptPath, createdAt }`
- AiCache: `{ _id (hash), kind, response, createdAt }` with a TTL of 7 days.

Privacy: never store a full Aadhaar number, only the last 4 digits. Mask bank account in the UI and receipt (show last 4 only). Do not log profile data to the console. Use fake data in demos.

## 6. API

- `GET /health` → `{ok: true}`
- `POST /api/session` `{language}` → `{sessionId}`
- `POST /api/chat` `{sessionId, message}` → Gemini extracts profile fields from the conversation (structured JSON), replies in the user's language, asks ONE follow-up question about the most important missing field. Returns `{reply, profile, missingFields}`.
- `POST /api/transcribe` (multipart audio, `sessionId`) → Gemini transcribes in the session language. Returns `{text}`. Used as the voice fallback.
- `GET /api/schemes/match/:sessionId` → deterministic eligibility check against `schemes.json`, then Gemini explains each result in the session language. Returns `[{scheme, eligible: true|false|maybe, reasons[], failedRules[], missingFields[], missingDocs[], whatWouldChange, explanation}]`.
- `POST /api/documents` (multipart image/PDF, requires `consentDocs` true) → Gemini Vision extracts fields as JSON, merges into the profile only after user confirmation, returns extracted fields for review.
- `POST /api/apply` `{sessionId, schemeId}` → creates Application, starts the Playwright agent asynchronously, returns `{applicationId}`.
- `GET /api/apply/:id/stream` → SSE events: `step`, `screenshot`, `awaiting_confirmation`, `done`, `error`.
- `POST /api/apply/:id/confirm` → user approves; the agent resumes and submits.
- `POST /api/apply/:id/cancel` → aborts the run.
- `GET /api/apply/:id/receipt` → downloads the PDF.

## 7. Eligibility Logic

Deterministic JS in `services/eligibility.js`, NOT the LLM. The LLM only (a) extracts profile data and (b) explains results.
- `eligible: true` when all rules pass
- `false` when any rule definitively fails (list `failedRules` and a plain-language `whatWouldChange`)
- `maybe` when required fields are missing (list `missingFields`)
Write unit tests (`node --test` or Vitest) covering: all pass, one fail, missing field, `in`/`notIn`, boundary values.

## 8. Gemini Service (`services/gemini.js`)

Prompts:
- Profile extractor: "Extract only facts the user explicitly stated. Return JSON matching the schema. Use null for unknown. Never guess. Do not infer category or income from other facts."
- Explainer: "Explain in {language}, at a 6th grade reading level, in max 4 short sentences: what the scheme gives, why this person qualifies or does not, what to do next. No jargon. Never promise approval."
- Document extractor: "Read this document image. Return JSON with the fields you can see. Use null if not visible. Do not invent values."
- Transcriber: "Transcribe this audio exactly in the language spoken. Return only the transcript."

Reliability requirements:
- Use structured output / JSON mode. On malformed JSON, retry once.
- On 429/503 or timeout, retry once with `GEMINI_FALLBACK_MODEL`.
- Cache responses by hash of (kind + input) in AiCache so repeated demo inputs are instant and survive rate limits.
- Never let a Gemini failure crash the app. Return a friendly, translated retry message.

## 9. Playwright Agent (`services/agent.js`)

Flow per application:
1. Launch Chromium, open `MOCK_PORTAL_URL + scheme.portalPath`. Emit step "Opening the portal".
2. For each field in `formFields`: fill from the profile, emit a step like "Filling name", screenshot every 2 steps.
3. Upload the document to the file input if required.
4. Handle one realistic hiccup in the mock portal (a dropdown that loads late, or a validation error on first submit, e.g. income with a comma). The agent detects the error text on the page, applies a rule (or asks Gemini) to fix the field, retries once, and emits a step like "Portal rejected income format, correcting and retrying".
5. Before clicking Submit: save `filledValues` and a screenshot, set status `awaiting_confirmation`, emit `awaiting_confirmation` with the values. Wait for `POST /confirm` (timeout 120s, then cancel gracefully).
6. After confirmation: submit, read the tracking ID from the success page, save it, generate the receipt PDF.
7. Emit `done` with `trackingId`.
Rules: explicit waits only, no fixed sleeps over 500ms. Timeout the automated part at 60s (excluding the confirmation wait) and emit `error` with a friendly message. Always close the browser in a `finally` block. Screenshots saved under `server/storage/` and served statically.

## 10. Mock Portal

Simple, clean HTML forms that look like government sites (header, tricolor strip, prominent banner: "DEMO PORTAL – not a real government website"). Each form has name, age, state (dropdown), income, category, bank account (fake), document upload, and a Submit button. Server-side validation (income must be digits only). The success page shows a generated tracking ID like `SAATHI-2026-XXXXXX`. Make the PM-KISAN and scholarship forms contain the deliberate hiccup described in section 9 (toggle with env `PORTAL_HICCUP=true`, default true).

## 11. Frontend

Pages:
1. **Home/Chat** (main): language selector (EN / हिं / தமிழ் / বাংলা), big mic button, text input, chat bubbles, replies spoken aloud (toggle). Side panel shows a "What I understood about you" profile card that fills in live. Demo chips (see 17E).
2. **Matches**: one card per scheme with green Eligible / amber Maybe / grey Not eligible badge, plain-language explanation, "why not and what would change" for non-eligible, required-docs checklist, source link + last verified date, and an "Apply for me" button on eligible ones. Persistent disclaimer.
3. **Document upload**: consent checkbox first, drag-drop, shows extracted fields for the user to confirm or edit.
4. **Live Agent View**: left: streamed step timeline; right: latest screenshot. When `awaiting_confirmation` arrives, show the **Review and confirm** screen (all filled values, masked bank number, screenshot) with Confirm and Cancel buttons. On completion: tracking ID, "Download receipt", and "Speak summary".

Voice behavior:
- Use SpeechRecognition when available. If unavailable or it errors, show a visible banner and switch to a record button that uploads audio to `/api/transcribe`.
- If no SpeechSynthesis voice exists for the selected language, hide the speak toggle and show a small note.
- UI strings for the 4 languages live in `lib/i18n.js` (keep to a small set of labels).

Design: mobile-friendly, large tap targets, high contrast, simple. Warm color palette (not generic purple), clear typography, accessible contrast, visible loading and error states.

## 12. Demo Mode (`?demo=1`)

- Show one-click chips that prefill the input: Hindi farmer ("Main 45 saal ka kisan hoon, Bihar se, 2 acre zameen hai"), SC student, senior citizen.
- Include a sample income certificate image in `client/public/samples/`.
- Combined with the AI cache, repeated runs are instant.
- A "Reset demo" button clears the session.

## 13. Non-Goals

No real portal automation, no real Aadhaar/OTP/CAPTCHA handling, no login/auth, no payments. State clearly in README and the UI that the agent runs on a demo portal because real portals use OTP and CAPTCHA, and automating them requires official permission.

## 14. Build Order (each step must run before moving on)

1. Scaffold repo, env, Mongo connection, `/health`, `/api/session`, root `npm run dev`
2. schemes.json + deterministic eligibility + unit tests
3. Gemini service (with retry, fallback, cache) + `/api/chat` + chat UI with live profile card
4. Matches endpoint + explainer + Matches UI (including "why not")
5. Mock portal (2 schemes first, then the rest)
6. Playwright agent + SSE + confirm step + Live Agent View + receipt PDF
7. Voice in/out + language switching + audio fallback
8. Document upload with Gemini Vision + consent
9. Demo mode, Docker + DEPLOY.md, polish, error states, README, DEMO_SCRIPT.md

Cut list if time runs out (in order): document upload, Tamil and Bengali, receipt PDF styling.
Never cut: the Hindi voice flow, the Matches page, the live agent run with one handled error and the confirm step.

## 15. Acceptance Criteria

- Spoken Hindi "Main 45 saal ka kisan hoon, Bihar se, 2 acre zameen hai" produces a correct profile and a Hindi reply
- Matches show PM-KISAN as Eligible with a Hindi explanation; a non-eligible scheme shows why and what would change
- Apply shows a live timeline, a screenshot, one handled error-and-retry, then the Review and confirm screen; after Confirm it ends with a tracking ID and a downloadable PDF, automated part under 60 seconds
- App never crashes on a Gemini failure; it shows a friendly retry message; fallback model is used on 429/503
- Voice fallback works when SpeechRecognition is unavailable
- Eligibility unit tests pass
- `npm run dev` at the root starts client, server, and mock portal together
- `docker-compose up` starts server and mock portal

## 16. Env (`.env.example`)

```
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_FALLBACK_MODEL=
MONGO_URI=
MOCK_PORTAL_URL=http://localhost:5001
PORTAL_HICCUP=true
HEADLESS=true
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

## 17. Deployment

- Dockerfile.server and Dockerfile.portal based on the official Playwright Node image; a `docker-compose.yml` for local runs.
- DEPLOY.md: backend + mock portal on Render or Railway (Docker), frontend on Vercel or Netlify, MongoDB Atlas. List required env vars and CORS setup. Include a local fallback plan.
- Playwright must not be required on serverless hosts.

## 18. Deliverables

Working repo, README (setup steps, architecture diagram in Mermaid, tech choices, responsible-AI notes, known limitations), `DEMO_SCRIPT.md` (2-minute script with a backup plan), `DEPLOY.md`, and a seeded demo path.

## 19. Responsible AI Notes (include in README and UI)

- Deterministic eligibility rules; the AI never decides eligibility
- User reviews and confirms before anything is submitted
- Consent before document upload; only last 4 digits of Aadhaar stored; sessions auto-delete after 24h
- Eligibility is indicative; every scheme links to its official source
- Demo portal only; no unauthorized automation of real government sites