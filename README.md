## 1. Business & Technical Context

### Scenario – Financial Risk Monitoring Dashboard (Desensitized POC)

This POC abstracts a **financial risk monitoring dashboard** module that I previously built in a production trading system.  
Risk managers use it to observe **trading exposure**, **margin usage**, and **system health** in near real time so that they can react quickly to abnormal positions or infrastructure incidents.

All domain data and implementation here are **fully desensitized and rewritten with mock data** to avoid leaking any commercial secrets from the original system.

---

### Core Pain Points in the Original System

- **Slow First Paint**
  - The legacy SPA waited for multiple APIs (risk, trading, ledger, monitoring) before rendering any meaningful content.
- **Complex Client-side Orchestration**
  - The browser was responsible for fan-out/fan-in aggregation across several microservices, leading to complicated state management and duplicated business logic.
- **Poor User Experience Under Load**
  - Under latency spikes or partial outages, users saw blank pages or inconsistent tiles because some APIs failed while others succeeded.

This POC focuses on isolating and re-implementing **one core capability** from that system:  
> “Aggregate and serve a consistent, pre-optimized risk view model for the dashboard, with fast first paint and clear degradation behavior.”

---

## 2. Module Scope & Technical Challenges

### Selected Module

**Risk Aggregation BFF + SSR Dashboard Shell**

- The backend is modeled as a **Java BFF (Backend-for-Frontend)** responsible for:
  - Fan-out to multiple downstream sources (simulated here with in-memory/mock data).
  - Aggregation into a single **dashboard view model** (per account / per book exposure, alerts, health metrics).
  - Simple caching & degradation behavior.
- The frontend is an **Angular SSR dashboard shell** that consumes this view model and renders the first screen on the server.

### Technical Challenge Highlights

- **Concurrent fan-out / fan-in aggregation (Java)**
  - In the original system this was implemented with non-blocking IO; here we keep the same design principles and model the BFF as an asynchronous aggregator (the actual Java implementation can be extended on top of this POC).
- **SSR & Hydration**
  - The first screen is rendered on the server using Angular Universal-style SSR, which drastically improves *time-to-content* even if backend calls are slightly delayed.
- **“Top N” calculations**
  - Risk tiles show “Top N riskiest positions/accounts” derived from mock data; in the original system this was backed by Redis Sorted Sets to support \(O(\log N)\) updates.

The current repository contains the **SSR dashboard shell and infrastructure for containerization**; the Java BFF and data layer are intentionally kept light-weight / mock-driven to stay within POC scope, but the architecture is laid out to reflect how it worked in the real system.

---

## 3. Technology Stack (Aligned with Challenge)

### Language Choice

- **Primary implementation language for backend:** **Java**  
  (Matches the requirement of using *Python / C# / Java*; the BFF design and contracts here are based on a Java WebFlux-style aggregator module from my previous project. The concrete BFF implementation can be expanded under a `bff-java/` folder using Spring Boot 3.x + WebFlux.)

### Frontend

- **Framework**: Angular 21+ with SSR (Universal-style `@angular/ssr`)
- **State Management**: Signals & RxJS
- **Visualization**: (Can be extended with ECharts / ngx-charts for richer charts)
- **Communication**: REST + (future) WebSocket for live updates （Simulate）

### Backend (BFF – Conceptual Design)

- **Runtime**: Java 17/21 & Spring Boot 3.x (WebFlux)
- **Concurrency Model**: Non-blocking IO (Project Reactor), used for concurrent calls to:
  - Risk engine
  - Trading feeds
  - Ledger / balances
  - System monitoring endpoints
- **Data Access**:
  - Redis (for cached metrics and “Top N” rankings)
  - Mock Services read from Redis (pre-loaded data for demonstration)

> In this POC repository, the downstream dependencies are **mocked**, and the focus is on the **frontend shell + containerization** and the **architecture/README explanation** rather than standing up full infra.

### Infrastructure

- **Runtime**: Node.js container serving Angular SSR output
- **Containerization**: `Dockerfile` + `docker-compose.yml`
- **Supporting Services** (Dockerized for this POC):
  - Redis (caching and Top N rankings, shared data store for Mock Services)
  - Mock Risk Service (port 9001)
  - Mock Trading Service (port 9002)
  - Mock Ledger Service (port 9003)

---

## 4. Architectural Decisions & Trade-offs

### Why BFF + Aggregation Layer (Java)?

- Risk dashboards always depend on **multiple slow and heterogeneous services**.
- Pushing all orchestration to the frontend makes:
  - Error handling complex.
  - Performance tuning hard (you cannot easily cache partial aggregations).
- A dedicated BFF:
  - Centralizes aggregation and caching.
  - Presents a **single, UI-friendly view model** to the frontend.
  - Allows independent scaling of aggregation logic (e.g., with WebFlux + backpressure support).

### Why SSR for the Dashboard Shell?

- Risk managers often open the dashboard under **time pressure**.
- SSR minimizes **time-to-first-meaningful-content**, even if some backend calls are not yet resolved.
- With Hydration:
  - The initial HTML is server-rendered.
  - The browser then “takes over” without a visible flicker.

### Why Cache & “Top N” in a Separate Layer?

- Ranking “Top N riskiest positions” and other aggregates are:
  - Expensive if recomputed from the primary database on each request.
  - Easy to maintain incrementally in a cache (e.g., Redis Sorted Sets).
- Separation allows:
  - Fast reads for the BFF.
  - Tuning of eviction / refresh policies independently of the UI.

### Trade-offs in This POC

- **Mocked Data Instead of Real Feeds**
  - All data is generated locally / in-memory with fake accounts and positions.
  - This keeps the POC safe from any data-leak concerns while still demonstrating data-flow and aggregation patterns.

---

## 5. How to Run & Verify (Validation Guide)

This section aligns with the “validation guide” requirement in the challenge.

**What to Expect**

- The first page is rendered on the server (fast first paint).
- Mock tiles display:
  - Sample exposure metrics.
  - “Top N” style lists based on mock data.
  - Basic health indicators.

> In a full version, these tiles would be backed by the Java BFF and real infra; in this POC, the emphasis is on the **architecture and SSR behavior**.

### 5.2 Docker / Docker Compose (One-Click Setup)

**Prerequisites**

- Docker
- Docker Compose

**Steps**

```bash
# At repository root
docker-compose up --build
```

Then open `http://localhost:4000` in your browser.

**What This Does**

- Builds a Node-based image using the `Dockerfile`.
- Runs the Angular SSR server inside a container.
- Exposes port `4000` on your host.

---

## 6. AI Collaboration Notes

This POC was built with assistance from **AI tools (primarily Cursor)**, in line with the challenge’s encouragement to leverage AI.

- **Where AI Helped**
  - Drafting and iterating on this `README` structure to align precisely with the challenge requirements (business context, technical challenge points, architectural trade-offs, validation guide, etc.).
  - Generating boilerplate for the Angular SSR setup and Docker / Docker Compose files.
  - Suggesting phrasing and organization for documenting architectural trade-offs.
- **What I Did Manually**
  - Chose the business scenario and module scope based on my real project experience.
  - Designed the overall architecture (BFF + SSR + caching) and decided which parts to keep / simplify for the POC.
  - Reviewed and adjusted AI-generated content to:
    - Remove any vendor-specific or sensitive details.
    - Keep the POC focused, small, and aligned with how the real system behaved.

All code and documentation in this repository are **newly written for this challenge** and use **mock / synthetic data** only.
