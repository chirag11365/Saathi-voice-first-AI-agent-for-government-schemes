# Deployment

The API and mock portal are long-running Node services. Do not deploy the Playwright agent on a serverless host. Use Render or Railway Docker services for the API and portal, Vercel or Netlify for the client, and MongoDB Atlas for persistence.

## Environment

Set `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `MONGO_URI`, `MOCK_PORTAL_URL`, `PORTAL_HICCUP`, `HEADLESS`, `PORT`, and `CLIENT_ORIGIN`. Set the API URL in the client build as `VITE_API_URL`. Configure CORS `CLIENT_ORIGIN` to the deployed frontend origin. Configure the portal service URL as `MOCK_PORTAL_URL` reachable from the API container.

Build `Dockerfile.server` and `Dockerfile.portal` from the repository root. `docker-compose up --build` starts the API and mock portal locally; run the client separately with `npm --prefix client run dev`.

## Local fallback

If cloud deployment is unavailable, run all services locally with `npm run dev`. Set MongoDB to a local instance or leave it unavailable for the in-memory session fallback. Keep `HEADLESS=true` on hosted workers. Confirm Chromium can launch in the selected container before the demo.
