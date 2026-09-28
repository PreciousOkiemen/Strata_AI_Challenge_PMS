# Strata Performance Management System — Phase 1 & Phase 2

An enterprise-grade, configuration-driven Performance Management System built for **Strata Advisory**. This architecture pairs an interactive browser-based dashboard with a Node.js/Express backend and a PostgreSQL database.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                          │
│                                                                        │
│   • public/index.html (Interactive Dashboard & Verification UI)        │
│   • public/rules_config.json (Single Source of Truth Config)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST API / JWT Tokens
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND ENGINE (Node.js / Express)                 │
│                                                                        │
│   • server.js (Express Application & Static Asset Server)              │
│   • routes/auth.js (JWT Authentication & Login Route)                  │
│   • seed.js (Auto-builds schema.sql & seeds public/rules_config.json)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Encrypted SQL Connection Pool
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     DATA VAULT (PostgreSQL Database)                   │
│                                                                        │
│   ┌──────────────┐       ┌──────────────┐       ┌──────────────────┐   │
│   │    users     │ ───►  │  scorecards  │ ───►  │    signatures    │   │
│   └──────────────┘       └──────────────┘       └──────────────────┘   │
│          │                      │                                      │
│          ▼                      ▼                                      │
│   ┌──────────────┐       ┌──────────────┐       ┌──────────────────┐   │
│   │ parent_goals │       │     kpis     │       │    audit_logs    │   │
│   └──────────────┘       └──────────────┘       └──────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘