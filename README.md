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
> "Aggregate and serve a consistent, pre-optimized risk view model for the dashboard, with fast first paint and clear degradation behavior."

---

## 2. Module Scope & Technical Challenges

### Selected Module

**Risk Aggregation BFF + SSR Dashboard Shell**

- The backend is modeled as a **Java BFF (Backend-for-Frontend)** responsible for:
  - Fan-out to multiple downstream sources (simulated here with mock services).
  - Aggregation into a single **dashboard view model** (per account / per book exposure, alerts, health metrics).
  - Redis-backed caching for "Top N" rankings.
- The frontend is an **Angular SSR dashboard shell** that consumes this view model and renders the first screen on the server.

### Technical Challenge Highlights

- **Concurrent fan-out / fan-in aggregation (Java)**
  - Implemented with non-blocking IO using Spring WebFlux and Project Reactor's `Mono.zip()` for parallel service calls.
- **SSR & Hydration**
  - The first screen is rendered on the server using Angular SSR, which drastically improves *time-to-content* even if backend calls are slightly delayed.
- **"Top N" calculations**
  - Risk tiles show "Top N riskiest positions/accounts" backed by Redis Sorted Sets to support O(log N) updates.

The current repository contains a complete implementation including:
- **Angular SSR dashboard** with D3.js visualizations
- **Java BFF** with WebFlux-based concurrent aggregation
- **Three mock microservices** (Risk, Trading, Ledger) with Redis integration
- **Docker Compose** for one-click deployment

---

## 3. Technology Stack

### Language Choice

- **Primary implementation language for backend:** **Java**  
  (The BFF is implemented under `bff-java/` using Spring Boot 3.x + WebFlux for non-blocking concurrent aggregation.)

### Frontend

- **Framework**: Angular 21+ with SSR (Universal-style `@angular/ssr`)
- **State Management**: Signals & RxJS
- **Visualization**: D3.js for bar charts and data visualization
- **Communication**: REST API

### Backend (BFF)

- **Runtime**: Java 17/21 & Spring Boot 3.x (WebFlux)
- **Concurrency Model**: Non-blocking IO (Project Reactor), used for concurrent calls to:
  - Risk Service
  - Trading Service
  - Ledger Service
- **Data Access**:
  - Redis (for cached metrics and "Top N" rankings)
  - Mock Services with Redis-backed data storage

### Infrastructure

- **Runtime**: Node.js container serving Angular SSR output
- **Containerization**: `Dockerfile` + `docker-compose.yml`
- **Services** (all Dockerized):
  - Dashboard UI (port 4000)
  - BFF Java (port 8080)
  - Redis (port 6379)
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
  - The browser then "takes over" without a visible flicker.

### Why Cache & "Top N" in a Separate Layer?

- Ranking "Top N riskiest positions" and other aggregates are:
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

### 5.1 Docker / Docker Compose (One-Click Setup)

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

- Builds all services (Frontend, BFF, Mock Services)
- Starts Redis for caching
- Exposes ports: 4000 (UI), 8080 (BFF), 9001-9003 (Mock Services)

### 5.2 Verifying SSR

| Method | Steps |
|--------|-------|
| **View Page Source** | Right-click → "View Page Source". You should see pre-rendered HTML with actual data. |
| **Disable JavaScript** | Chrome DevTools → Settings → Disable JavaScript. Refresh. The page should still display data and charts. |
| **curl Command** | `curl http://localhost:4000` should return HTML with embedded dashboard data. |

### 5.3 Verifying BFF Aggregation

**Direct API Test**
```bash
curl http://localhost:8080/api/dashboard | jq .
```

**Concurrent Aggregation Verification**
```bash
time curl -s http://localhost:8080/api/dashboard > /dev/null
```
- With concurrent calls (Mono.zip), total time ≈ max(service latencies) ≈ 100-150ms
- If sequential, would be sum of latencies ≈ 300ms+

**Redis Top N Check**
```bash
docker exec -it dashboard_platform-redis-1 redis-cli
ZREVRANGE top:risky:accounts 0 4 WITHSCORES
```

---

## 6. AI Collaboration Notes

This POC was built with assistance from **AI tools (primarily Cursor)**, in line with the challenge's encouragement to leverage AI.

- **Where AI Helped**
  - Drafting and iterating on this `README` structure.
  - Generating boilerplate for Angular SSR setup and Docker files.
  - Implementing D3.js visualizations with SSR support.
- **What I Did Manually**
  - Chose the business scenario and module scope based on my real project experience.
  - Designed the overall architecture (BFF + SSR + caching).
  - Reviewed and adjusted AI-generated content.

All code and documentation in this repository are **newly written for this challenge** and use **mock / synthetic data** only.
