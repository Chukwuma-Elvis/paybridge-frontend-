# PayBridge Demo Console (`paybridge-frontend`)

A static React console that demonstrates the entire PayBridge API (cross-border remittances, internal book-to-book transfers, NIBSS/Paystack payouts, FX rates & guaranteed quotes, double-entry ledger, sanctions/compliance holds, and partner settlement reconciliation) with an interactive Live Log Dock and Request Inspector.

Deployed as a pure static site on **Vercel Hobby** (free plan), communicating directly over HTTPS with the PayBridge backend deployed on **Render**.

---

## Features

- **Guided Demo Mode (`/guided/1` to `/guided/10`):** A 10-step scripted presentation narrative with *Say*, *Do*, *See*, and *Under the hood* guidance for live stakeholder walkthroughs.
- **Explorer API Desks:**
  - **Connect & Wake (`/connect`):** Render cold-start health probe with exponential backoff, API key desk, and backend capability flags.
  - **Customers & Accounts (`/customers`):** KYC tier upgrades (UNVERIFIED, BASIC, FULL), multi-currency account creation, and dev test funding.
  - **Ledger & Audit Trail (`/accounts/:id`):** Real-time double-entry append-only ledger entries with running balance proof.
  - **Internal Transfers (`/transfers/internal`):** Zero-sum book transfers, double-click prevention, and idempotent replay verification.
  - **External Payouts (`/transfers/external`):** NIBSS bank account resolution, beneficiary address book, and fake gateway outcome playground (`0000`, `1111`, `2222`, `3333`).
  - **FX Corridor & Quotes (`/fx`):** Live corridor rates, partner spread configuration, manual rate overrides, and guaranteed quotes with live second-by-second countdown.
  - **Remittance Engine (`/remittances`):** 12-state machine lifecycle, partner webhook simulation (valid, forged HMAC, duplicate replay, amount tampering), and multi-currency zero-sum ledger proof strip.
  - **Compliance Desk (`/compliance`):** AML sanctions screening queue, case inspection, and mandatory written audit reason decision forms.
  - **Settlement & Batch Reconciliation (`/settlement`):** Net partner position balance, cut-off closing, statement CSV file preview & upload, and breaks management.
  - **API Key Desk (`/admin/keys`):** Client and Admin key generation with one-time reveal dialog and instant revocation.
  - **Security Playground (`/admin/security`):** Interactive tests for 401 unauthenticated, 403 forbidden, and 429 rate limit with `Retry-After` cooldown timer.
  - **Operations & Telemetry (`/ops`):** Four operator questions (healthy, busy, failing, stuck), JVM heap/uptime metrics, and background scheduler specifications.
- **Live Log Dock:** Virtualized, tail-following server stream reader supporting `X-API-Key` authentication, interleaving client `->` sent and `<-` completed events, and `X-Request-Id` correlation chips.
- **Request Inspector:** Slide-out drawer displaying request timing, masked authorization headers, payload viewer, and formatted copy-as-cURL commands.

---

## Architectural & Security Invariants

1. **Zero Floats for Money:** All amounts, ledger entries, and fees are treated strictly as integers in minor currency units end-to-end (`100000` = \$1,000.00). The frontend never performs floating-point financial arithmetic.
2. **Single API Door (`src/services/apiClient.ts`):** 100% of network traffic routes through one centralized client that attaches client-generated `X-Request-Id` headers and logs all activity.
3. **Key Safety:** API keys live in memory by default (opt-in tab `sessionStorage` only; never `localStorage` or URLs). Keys are masked in all logs and inspector views, and wiped immediately upon changing the Backend Address.
4. **Pure Static Build:** No Vercel functions, server-side proxies, or middleware are used. Traffic flows directly from the user's browser to the Render API, preserving free-tier allowances.

---

## Local Development

### Prerequisites
- Node.js `22.x` or `24.x`
- npm `10+`

```bash
# Clean install dependencies
npm install

# Start Vite dev server with Hot Module Replacement
npm run dev

# Run full quality verification (typecheck, unit tests, production build)
npm run verify
```

The application will be available at `http://localhost:5173`.

---

## Deploying to Vercel (Hobby Free Tier)

### Step 1: Push Repository to GitHub
Create a repository named `paybridge-frontend` on GitHub under your personal account and push the codebase:
```bash
git remote add origin https://github.com/<your-username>/paybridge-frontend.git
git branch -M main
git push -u origin main
```

### Step 2: Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Select the `paybridge-frontend` GitHub repository.
4. Configure Project Settings:
   - **Framework Preset:** `Vite` (automatically detected via `vercel.json`)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `dist` (default)
   - **Install Command:** `npm install` (default)

### Step 3: Configure Environment Variables
Under the **Environment Variables** section in the Vercel project setup, add:
- `VITE_DEFAULT_BACKEND_URL`: `https://paybridge.onrender.com` (replace with your actual Render deployment address)

> **Note:** This variable is public at build time. Never place API keys, partner secrets, or sensitive credentials in environment variables or configuration files.

### Step 4: Deploy & Verify
Click **Deploy**. Vercel will build the application using the configuration in `vercel.json`:
- **Single Page App Routing:** Deep links (e.g. `/guided/5`, `/accounts/acc-1`) and page refreshes are handled by `/index.html` fallback rewriting.
- **Cache Policy:** Immutable 1-year caching on `/assets/*` with instant revalidation on `/index.html`.
- **Security Headers:** Strict Content Security Policy (CSP), Referrer-Policy, Frame-Options, and nosniff protection.

---

## Backend CORS Configuration (Render)

Because the console runs on Vercel and talks directly to the backend on Render, the backend must include your Vercel domain in its CORS allow-list:

1. In the **Render Dashboard**, open your PayBridge Web Service.
2. Under **Environment**, set or update `PAYBRIDGE_CORS_ALLOWED_ORIGINS`:
   ```
   https://<your-project-name>.vercel.app
   ```
   *(If testing locally as well, you can add comma-separated values: `https://<your-project-name>.vercel.app,http://localhost:5173`)*
3. Save changes. Render will redeploy the service.

---

## Verification & Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Vite local development server |
| `npm run build` | Compiles TypeScript and builds production bundles to `dist/` |
| `npm run typecheck` | Validates TypeScript with strict type checking (`tsc --noEmit`) |
| `npm run test` | Executes unit and smoke test suites via Vitest |
| `npm run verify` | Runs `typecheck`, `test`, and `build` in sequence |
| `npm run contract:generate` | Regenerates TypeScript types from `contract/openapi.json` |
