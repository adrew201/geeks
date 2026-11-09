# Play2Pro: Technical Architecture & Hackathon Tool Mapping

**Project:** Play2Pro (BARBAH PlayEconomy Ecosystem)  
**Hackathon:** PayPal AI Hackathon  
**Target:** Scalable Full-Stack Architecture & Sponsor Tool Integration  

---

## 1. Complete Tech Stack Overview

| Layer | Primary Technologies | Purpose & Description |
| :--- | :--- | :--- |
| **Frontend UI** *(Nigel)* | React, Vite, Tailwind CSS | Single-page application driving the mobile-responsive swipe voting interface, Skills Passport profiles, video embedding, and push-to-pay prompts. |
| **Backend API** *(Your Domain)* | Node.js, TypeScript, Fastify | High-performance, type-safe API server handling user authentication, profile scoring, clip ingest, and payment routes. |
| **Database & ORM** | PostgreSQL, Prisma ORM | Relational data store for Users, Skills Passports, Video Clips, Swipe Votes, Bounties, Wallets, and Payment Transactions. |
| **Queue & Background Jobs** | Redis, BullMQ | Asynchronous job engine handling heavy tasks (Claude Vision clip analysis and Elo rating recalculations) without blocking HTTP threads. |
| **AI Intelligence Engine** | Claude Vision API | Multimodal vision model running in background workers to analyze clip performance, extract metadata, and auto-draft Skills Passport summaries. |
| **Financial Engine** | PayPal Developer Platform | Core payment integration handling one-tap unlock fees, bounty escrow authorization/capture, subscriptions, payouts, and webhooks. |

---

## 2. Hackathon Sponsor Tools & Tech Stack Mapping

The following table details the specific sponsor tools selected for **Play2Pro**, their implementation roles, the tech stack components involved, and the key architectural benefits:

| Sponsor Tool | Hackathon Purpose | Play2Pro Implementation & Role | Tech Stack Components Used | Architectural & Strategic Benefit |
| :--- | :--- | :--- | :--- | :--- |
| **PayPal Developer Platform** *(Primary Requirement)* | Payments, escrow authorization, subscriptions, payouts, and webhook processing. | • **Orders API (Auth & Capture):** Hold bounty funds in escrow when brands post challenges.<br>• **Payouts API:** Execute instant automated payouts to gamers/coaches.<br>• **Subscriptions API:** Manage ad-free & premium Skills Passport tiers.<br>• **Webhooks:** Instant balance updates via cryptographic signature validation. | • Node.js / Fastify Backend<br>• Node `crypto` (Signature Verification)<br>• React / Vite Frontend (Push-to-Pay UI) | Primary hackathon requirement. Serves as the central monetary gateway for the BARBAH PlayEconomy. |
| **AG Grid / AG Studio** *(Partner Bonus Eligible)* | Enterprise data grids, interactive charts, dynamic dashboards, and AI analytics. | • Power the **Skills Analytics Dashboard** on player profiles.<br>• Render verified gameplay stats, community ranking metrics, and sponsor ROI reports using AG Charts. | • React / Vite Frontend<br>• AG Grid React & AG Charts<br>• Fastify REST Analytics Endpoints | **Eligible for AG Grid Sponsor Prize ($5,000 top prize).** Provides production-ready dashboard visualizations. |
| **Postman** | API design, sandbox testing, mock payloads, and webhook verification. | • Used by backend engineers to test PayPal REST endpoints (Orders, Payouts) and mock webhook responses before Nigel wires them into the React frontend. | • Postman Collection / Environment<br>• Fastify / Express Backend Routes<br>• PayPal Sandbox Credentials | Accelerates backend iteration and eliminates payload errors before frontend integration. |
| **Render** *(Partner Bonus Eligible)* | Unified cloud hosting for web applications, databases, and background services. | • Hosts your **Node.js/Fastify API server**, managed **PostgreSQL database** (via Prisma), and **Redis worker node**. | • Render Web Service (Node.js)<br>• Managed PostgreSQL (Prisma ORM)<br>• Managed Redis (BullMQ Workers) | **Eligible for Render Sponsor Prize ($1,000 credits).** Provides unified, reliable deployment infrastructure. |
| **Zapier MCP** | Connects AI tools and backend events to external business automations. | • Automatically trigger WhatsApp/email notifications to gamers when a bounty payout is released or a coach unlocks footage. | • Fastify Webhook Emitters<br>• Zapier MCP Server<br>• WhatsApp Business / Email APIs | Bridges backend state changes directly to real-time mobile push notifications for users. |

---

## 3. Data & Core System Flow

```text
[ Gamer Uploads Video Clip ]
            │
            ▼
[ Fastify API (POST /api/v1/clips) ] ──► [ Redis / BullMQ Queue ]
                                                   │
                                                   ▼
[ Claude Vision API Workers ] ◄────────────────────┘
            │
            ▼ (Extracts tags & skill summaries)
[ PostgreSQL Database (Prisma) ]
            ▲
            │ (Updates Elo score on swipe vote)
[ Swipe Engine Node (AG Grid visualizer on Frontend) ]
            │
            ▼ (Coach unlocks or Brand posts bounty)
[ PayPal REST API (Orders / Auth & Capture / Webhooks) ]
            │
            ▼ (Webhook confirms transaction)
[ Zapier MCP Emitter ] ──► [ WhatsApp / Mobile Push Notification ]
```

---

## 4. Summary of Strategy & Execution

1. **Focused Integration:** Unnecessary tools (e.g., Bryntum or Channel3) have been excluded to maximize team velocity and avoid scope creep during the sprint.
2. **Prize Alignment:** Integrating PayPal, AG Grid, and Render maximizes eligibility across both the main prize pool ($60,000+) and individual partner bonus categories ($5,000 AG Grid prize + $1,000 Render credits).
3. **Clear Boundary:** Nigel works on the React frontend and AG Grid components, while you lead the Node.js/Fastify API, Prisma data models, Redis queues, and PayPal webhook validation.