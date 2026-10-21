# Intent: PayBridge Demo Console with live logs

Author: Chukwuma (project owner and learner), drafted with Claude from the conversation of 2026-10-21 and 2026-10-22 and from `plans/frontend-demo-console.plan.md`. Status: **draft, awaiting the product owner's acceptance** (nobody has accepted it yet). Date: 2026-10-22.

## Problem
PayBridge (a Spring Boot payments back end on Render) can only be demonstrated today with `curl`, a bash script (`demo/demo.sh`) or the Swagger page. These show requests and answers but not what the server is doing, they cannot show the money story as a whole (internal transfers, Paystack/fake-bank transfers, FX remittance, compliance review, settlement), and they are hard for a non-engineer audience to follow. The free Render service also sleeps for 4 to 5 minutes, which makes a live demo awkward and hides why requests fail.

## Proposed outcome
A web console that:
- runs every PayBridge feature from a screen, in a **guided demo** that tells the story and an **explorer** that reaches every endpoint;
- shows a **live log pane** next to every click: the server's own log lines in real time and, for every click, the exact endpoint the console called;
- uses the Render service by its public address, **editable in the console**, and can **wake** a sleeping Render service and explain the wait;
- is hosted on **Vercel's free tier** as a static site.

## Affected users and systems
- Audience: the project owner presenting the demo; reviewers and lecturers watching; later maintainers.
- Systems: the PayBridge API (repository `paybridge`, Render), the new console (repository `paybridge-frontend`, Vercel), Paystack test mode (through the API), Render Postgres (indirectly).
- Back-end changes required before the console can work: CORS, a log stream, a partner-funding simulator and a system-info endpoint (plan Steps 29 to 32).

## Constraints
- Must run on Vercel Hobby and Render free with no paid feature (non-commercial use only).
- No secret may reach the browser: not the partner secret, not the Paystack key; an admin key is pasted by the user and kept in memory by default.
- Money is never a floating-point number in the browser.
- The ledger and business rules of the API are not changed.
- All new back-end features are admin-only and off by default.
- The console must work while the API is asleep (it explains the wait instead of showing errors).
- Plain-language, accessible (WCAG 2.2 AA), keyboard-complete.

## Out of scope
Sign-up and login for end customers, any real-money use, mobile-first design, offline use, translation, changing fees or limits, and any back-end feature not listed above.

## Open questions
1. Hosting: separate Vercel static site (recommended, plan D1/D12) or served by the Spring Boot app?
2. Partner secret: simulator endpoint inside the API (recommended, D2) or a separate small server?
3. Dev funding: switch it on for the demo deployment (recommended, D3) or require a completed remittance first?
4. Stack: React/TypeScript/Vite (recommended, D5) or plain HTML and JavaScript?
5. Is the optional recorded walkthrough video wanted?
6. Preview deployments on Vercel cannot reach the API unless a strictly validated origin pattern is allowed. Is that wanted, or are previews UI-only?
7. Does anyone besides the owner need access to the production console URL (it is public on Hobby)?

## Source of truth
This file, the spec and the plan in this repository are authoritative. No Jira or other tracker is involved. See `docs/ai-sdlc/source-of-truth.md`.
