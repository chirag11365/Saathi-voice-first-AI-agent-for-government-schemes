# Saathi

Saathi is a guided, multilingual demo that helps people discover public benefit schemes and practice an application on a mock portal. It is designed for farmers, students, senior citizens, people seeking housing, and others.

## Guided experience

1. Choose English, Hindi, Tamil, Bengali, or Telugu. The choice is remembered in the browser.
2. Answer a few optional questions about role, age group, state, income, and (when relevant) land or student category. Skip any answer or use a quick demo profile.
3. Review scheme matches, explanations, official sources, document checklists, and spoken summaries where the device has a matching voice.
4. Optionally try chat or voice. Saathi does not need a name, phone, email, identity number, Aadhaar, or bank details.
5. The application helper uses a mock portal and fixed demo values for any bank or Aadhaar fields. Review the demo form before confirming.

[Live Demo](https://saathi-ai07.netlify.app) | [Demo Script](DEMO_SCRIPT.md) | [Deployment Guide](DEPLOY.md)

Eligibility is a simplified guide, not a government decision. Always confirm current terms with the linked official source.

## Local development

Requirements: Node.js 20+. MongoDB and Gemini are optional; deterministic scheme matching and wizard profiles work without Gemini.

```sh
npm install
npm --prefix client install
npm --prefix server install
npm --prefix mock-portal install
npm --prefix server run install:browser
```

Copy `.env.example` to `.env` and configure optional values, then run `npm run dev`.

| Service | Local address |
|---|---|
| Client | http://localhost:5173 |
| API | http://localhost:5000 (`GET /health` returns `{"ok":true}`) |
| Mock portal | http://localhost:5001 |

### Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_API_URL` | Client build | API origin, such as `https://saathi-api.onrender.com`; trailing slashes are removed. Defaults to `http://localhost:5000`. |
| `GEMINI_API_KEY` | Server | Optional Gemini access for chat extraction and document/audio helpers. Keep secret and out of Git. |
| `GEMINI_MODEL` | Server | Primary Gemini model. |
| `GEMINI_FALLBACK_MODEL` | Server | Fallback Gemini model. |
| `MONGO_URI` | Server | Optional MongoDB URI; in-memory demo sessions are used when absent/unavailable. |
| `MOCK_PORTAL_URL` | Server | Mock portal origin; defaults to `http://localhost:5001`. |
| `PORTAL_HICCUP` | Server | Set `false` to disable the mock validation hiccup. |
| `HEADLESS` | Server | Set `false` to show the Playwright browser. |
| `PORT` | Server | HTTP listen port; defaults to 5000. |
| `CLIENT_ORIGIN` | Server | Allowed client origin for CORS. |

### Render and Netlify

- Deploy the API and mock portal as long-running services. On Render, set `PORT` (Render supplies it), `CLIENT_ORIGIN` to the deployed Netlify URL, `MOCK_PORTAL_URL` to the reachable mock portal service, and optional `MONGO_URI`/Gemini values. The API health check is `/health`.
- Deploy `client` as the Netlify site base directory. Build with `npm run build`; publish `dist`. Set `VITE_API_URL` to the Render API origin before the build. The `client/public/_redirects` rule is copied to `dist/_redirects` for SPA routes.
- Do not put server secrets in Netlify or any `VITE_*` variable.

## Tests and build

```sh
npm --prefix client run build
npm --prefix client test
npm --prefix server test
```

The client tests validate language-key completeness and wizard-to-profile mapping. Server tests cover the eligibility engine and other API behavior. For the browser smoke flow, start the app and run `npm --prefix server run smoke:browser`.

## Privacy and demo limits

- Scheme profile fields are limited to age, state, occupation, income, category, land, and student/course information.
- Sensitive-looking chat messages are discarded before storage or Gemini calls. No name, gender, bank, or Aadhaar fields are stored in session profiles.
- The mock application fills bank `000011112222` and Aadhaar ending `1234` only when those fields exist, masks them in the browser, and excludes them from review values, screenshots, receipts, and logs.
- Uploaded documents are processed in memory and only age, state, income, and category may be returned. Use the fictional sample document only.
- Sessions are temporary; the in-memory fallback clears after 24 hours.

Saathi is a hackathon prototype, not an official government service.
