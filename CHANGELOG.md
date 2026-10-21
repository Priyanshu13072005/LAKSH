# 📋 Changelog — LAKSH

All notable changes to the **LAKSH** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-21

### 🚀 Added
- **Live Workout Mode**: Stopwatch timer with pause, resume, and UTC time synchronization.
- **Stopwatch Reset Feature**: Direct reset button to restore stopwatch to `00:00:00` anytime.
- **Exercise Library**: 15+ standard compound and isolation movements pre-seeded with muscle groups.
- **Rest Timer & Audio Cue**: Customizable rest countdown with audio chime on completion.
- **Plate Calculator & 1RM Estimator**: Instant barbell weight plate loading breakdown and estimated 1-rep-maxes using Epley's formula.
- **Hydration Tracking**: One-tap quick add water logs (+250ml, +500ml) with daily target progress bars.
- **Daily Steps & Activity**: Manual logging and Google Fitness / Health Connect sync.
- **Personal Records**: Automatic detection of Weight PRs and Rep PRs per exercise.
- **PWA Support**: Full PWA manifest, service worker offline asset caching, and standalone mobile app installation.
- **Production Deployment**: Configurations for Render (backend) and Vercel (frontend) with auto-fallback database support.

### 🛡️ Security
- Password hashing using native bcrypt with 72-byte truncation safety.
- JWT bearer token authentication with configurable expiration.
- Hardened `.gitignore` to prevent database or secrets leaks.

### ⚡ Performance
- Lazy loading and route-based code splitting reducing initial bundle size by over 20%.
- SQLite/MySQL automatic fallback with connection pooling.
