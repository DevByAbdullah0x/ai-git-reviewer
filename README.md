<div align="center">
  <img src="assets/logo.png" alt="AI Git Reviewer Logo" width="460" />

  <h1>AI Git Reviewer</h1>
  <p><strong>automated code review, powered by AI</strong></p>

  [![Live Demo](https://img.shields.io/badge/Vercel-Live%20Demo-black?style=for-the-badge&logo=vercel)](https://ai-git-reviewer.vercel.app)
  [![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/DevByAbdullah0x/ai-git-reviewer)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6)
  ![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-61dafb)
  ![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933)
  ![Supabase](https://img.shields.io/badge/Database-Supabase%20%2F%20Postgres-3ECF8E?logo=supabase&logoColor=white)
  ![License](https://img.shields.io/badge/License-MIT-green)

  <br />
  <p><em>An automated GitHub App & Code Intelligence platform that inspects Pull Requests, performs deterministic static security scans, runs structured multi-category AI code reviews, and posts native inline comments with 1-click apply fixes.</em></p>
</div>

---

## 🚀 Why this is a Standout Portfolio Project

Most AI coding projects are simple chatbot wrappers (*"paste code $\rightarrow$ AI gives advice"*). **AI Git Reviewer** is built as an actual production-grade developer tool integrated into the GitHub developer lifecycle:

- **Deterministic Pre-Scanner + Structured AI Engine**: Catches hardcoded API secrets, JWTs, AWS credentials, and critical injection vulnerabilities before invoking LLMs.
- **Strict Structured JSON Schema**: Uses Zod validation to ensure the LLM returns actionable, structured findings across 5 core dimensions:
  1. 🔴 **Security** (SQLi, XSS, exposed secrets, auth bypass)
  2. 🟠 **Bugs & Stability** (Null pointers, edge conditions, unhandled async errors)
  3. 🟡 **Performance** (N+1 database queries in loops, memory bloat, unindexed lookups)
  4. 🔵 **Code Quality** (Duplication, high cyclomatic complexity, bad error handling)
  5. 🟢 **Best Practices** (Idiomatic conventions, strong typing, clean architecture)
- **Native GitHub Inline Suggestions**: Formats suggested fixes into native GitHub ````suggestion` blocks, enabling developers to commit fixes right from the PR review tab.
- **1-Click Apply Fix Engine**: Builds git patches and commits approved fixes directly onto the PR head branch via the GitHub Git Data API.
- **PR Health Score (0–100)**: Computes a weighted quality index and generates markdown PR badges.
- **Durable Cloud Persistence (Supabase)**: Synchronizes repositories, policies, and review history to PostgreSQL/Supabase so settings survive Vercel serverless cold starts.
- **Modern Web Dashboard & Diff Playground**: Full React analytics dashboard, PR inspector, repository rule manager, and an on-demand Diff Review Sandbox.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph GitHub ["GitHub Platform"]
        PR[Developer opens / updates PR] -->|Webhook Event| WH[Webhook Payload]
        InlineComment[PR Inline Comments & Suggestions]
        PRBranch[Head Branch / Auto-Commit]
    end

    subgraph Backend ["Backend Review Pipeline (Node.js + TS)"]
        WH -->|Verify HMAC Signature| Router[Webhook Router]
        Router --> Auth[GitHub App Octokit / JWT]
        Auth --> FetchDiff[Fetch Unified PR Diff]
        
        FetchDiff --> StaticScan[1. Deterministic Static Security Scan]
        FetchDiff --> AIRunner[2. Multi-Model AI Reviewer with Zod Schema]
        
        StaticScan --> Aggregator[Deduplication & Health Scoring]
        AIRunner --> Aggregator
        
        Aggregator --> ReviewPoster[GitHub Review API Formatter]
        ReviewPoster -->|Post Line Comments & Badges| InlineComment
        
        DB[(Supabase / Local Store)] <--> API[REST API]
    end

    subgraph FixEngine ["Patch & Fix Service"]
        API -->|Apply Fix| Committer[GitHub Commit Engine]
        Committer -->|Commit Patch| PRBranch
    end

    subgraph Frontend ["Web Dashboard (React + Vite + Tailwind)"]
        API <--> Dashboard[Metrics, PR Detail, Diff Viewer & Rules Config]
        Playground[Interactive Diff Review Playground] --> API
    end
```

---

## 📦 Project Structure

```text
ai-git-reviewer/
├── packages/
│   ├── shared/                         # Shared TypeScript interfaces & Zod schemas
│   │   ├── src/
│   │   │   ├── constants.ts            # Severities, categories, weights, badges
│   │   │   ├── types.ts                # ReviewResult, ReviewIssue, MetricsSummary
│   │   │   └── schemas.ts              # Zod validation schemas
│   │   └── package.json
│   │
│   ├── server/                         # Node.js + TypeScript Express Backend
│   │   ├── src/
│   │   │   ├── config/                 # Environment & credentials loader
│   │   │   ├── db/
│   │   │   │   └── schema.sql          # Supabase SQL table definition
│   │   │   ├── analyzer/
│   │   │   │   ├── diff-parser.ts      # Hunk line mapping for exact PR comments
│   │   │   │   ├── static/scanner.ts   # Regex / AST deterministic secret scanner
│   │   │   │   ├── ai/provider.ts      # Multi-model provider (Gemini/OpenAI/Mock)
│   │   │   │   ├── prompts/            # System & user review prompts
│   │   │   │   └── score.ts            # 0-100 Health score calculation
│   │   │   ├── github/
│   │   │   │   ├── app.ts              # Octokit GitHub App authentication
│   │   │   │   └── reviewer.ts         # GitHub Review API inline comment formatter
│   │   │   ├── services/
│   │   │   │   ├── db.service.ts       # Supabase & Local Fallback Database Service
│   │   │   │   ├── patch.service.ts    # 1-Click fix patch applier & commit engine
│   │   │   │   └── review.service.ts   # Core review orchestrator
│   │   │   ├── routes/
│   │   │   │   ├── webhook.routes.ts   # HMAC-verified GitHub Webhook receiver
│   │   │   │   └── api.routes.ts       # REST endpoints for dashboard & playground
│   │   │   ├── test/                   # Comprehensive automated test suite
│   │   │   └── index.ts                # Server entrypoint
│   │   └── package.json
│   │
│   └── client/                         # Modern React + Vite + Tailwind Web App
│       ├── src/
│       │   ├── components/
│       │   │   ├── dashboard/          # Metrics cards, severity charts, monitored repositories, recent PRs
│       │   │   ├── diff-viewer/        # Syntax diff viewer with inline AI callouts
│       │   │   ├── pr-viewer/          # PR detail modal & category score gauges
│       │   │   ├── playground/         # Interactive Diff Playground & Public PR tester
│       │   │   └── rules/              # Repository policy & custom prompt manager
│       │   ├── services/api.ts         # Axios API client
│       │   └── App.tsx                 # Main application shell
│       └── package.json
│
├── package.json                        # Root workspace configuration
└── README.md
```

---

## ⚡ Quickstart & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` in `packages/server/`:
```bash
cp packages/server/.env.example packages/server/.env
```
*Note: Supports Google Gemini 2.0/1.5/3.6 Flash, OpenAI GPT-4o, and an intelligent offline heuristic engine.*

### 3. Run Test Suite
```bash
npm test
```

### 4. Start Development Servers
Start both backend API (`http://localhost:4000`) and frontend dashboard (`http://localhost:5173`):
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

---

## 🗄️ Database & Cloud Persistence (Supabase)

To persist repository settings, review logs, and metric statistics across serverless cold starts (Vercel):

1. Create a free project at [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the schema from `packages/server/src/db/schema.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS reviewer_state (
     id TEXT PRIMARY KEY,
     data JSONB NOT NULL DEFAULT '{}'::jsonb,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );

   ALTER TABLE reviewer_state ENABLE ROW LEVEL SECURITY;
   ```
3. Copy your project credentials into `packages/server/.env` (and Vercel Project Environment Variables):
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
4. *Graceful Fallback*: If Supabase credentials are not provided, the server automatically falls back to local disk storage (`packages/server/data/store.json`) or in-memory storage without errors.

---

## 🔧 Configuring as a Live GitHub App

To run automated reviews on real GitHub Pull Requests:

1. Go to **GitHub Settings $\rightarrow$ Developer settings $\rightarrow$ GitHub Apps $\rightarrow$ New GitHub App**.
2. Set **Webhook URL** to your server endpoint (e.g. `https://ai-git-reviewer.vercel.app/api/webhooks/github`).
3. Set **Webhook Secret** matching `GITHUB_APP_WEBHOOK_SECRET` in `packages/server/.env`.
4. Grant the following Permissions:
   - **Pull requests**: `Read and write`
   - **Contents**: `Read and write` (to enable 1-Click Fix Commits)
   - **Metadata**: `Read-only`
5. Subscribe to events:
   - ☑ `Pull request`
6. Generate a **Private Key** (.pem) and copy your **App ID**.
7. Add credentials to `packages/server/.env`:
   ```env
   GITHUB_APP_ID=123456
   GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
   GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
   ```
8. Install the app on your target repository. Any newly opened or updated PR will automatically receive an intelligent AI review with inline comments!

---

## 📊 Live Web Dashboard Features

- **Reviews & Analytics**: Instant KPI overview of review velocity, critical vulnerabilities blocked, average health scores, and category radar distributions.
- **Monitored Repositories**: Track active repositories, view strictness policies, and trigger on-demand reviews for any open PR.
- **Diff Review Playground**: Paste any code snippet or raw unified diff, choose presets (SQLi, N+1 query, Clean code), and inspect real-time AI findings with 1-click patch buttons.
- **Public PR Inspector**: Input any public GitHub Pull Request URL (e.g., `facebook/react/pull/1234`) to review external PRs on-demand.
- **Rule Customization**: Adjust merge-block severity thresholds, toggle analysis categories, and customize project-specific guidelines (e.g., *"Enforce Zod validation on inputs; require strict TypeScript typing"*).
