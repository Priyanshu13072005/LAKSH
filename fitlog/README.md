# LAKSH — Full-Stack Gym Workout & Fitness Tracker

**LAKSH** is a personal gym workout and fitness tracking platform designed to log exercises, repetitions, sets, weights, workout duration, daily steps, and hydration.

---

## 🌟 Key Features

1. **Live Workout Tracking**:
   - Real-time elapsed stopwatch timer with pause/resume capability.
   - Built-in rest timer countdown (e.g. 90s) between sets.
   - Add exercises from library or custom movements.
   - Log set weight (kg), target reps, and toggle completion.
   - Workout session metrics: exercises count, total sets, completed reps, and total volume lifted ($kg \times reps$).

2. **Fitness Dashboard**:
   - Greeting and live workout banner (instant jump back to in-progress workout).
   - Metrics cards: Today's gym duration, total exercises, sets/reps, total training volume, and weekly sessions.
   - Interactive daily step logger with progress bar against daily goal.
   - Water consumption logger with one-click preset buttons (+250ml glass, +500ml bottle).
   - Recharts visual analytics: Weekly workout duration bar chart & daily step activity trend.
   - Recent workouts log table with status badges and details modal.

3. **Exercise Library & Progression**:
   - 15+ pre-seeded standard compound and isolation movements (Bench Press, Squat, Deadlift, Overhead Press, Lat Pulldown, etc.).
   - Search by name and filter by muscle group & equipment.
   - Add custom user exercises.
   - **Exercise Progression & PRs**: Historical charts of max weight and volume over time, personal record badges (weight PR & rep PR).

4. **Hydration & Daily Activity**:
   - Timestamped hydration logging with daily target progress bar.
   - Daily step tracker with distance (km) and calorie burn estimations.
   - **Automatic Android Step Sync**: Synchronizes steps recorded by your Android phone via **Health Connect** / **Google Fit** using Google Fitness REST API & OAuth 2.0. Accessible and updated on both your Android phone and laptop browser!

5. **Workout Analytics**:
   - Cumulative metrics: Total workouts, gym time, and tonnage lifted.
   - Training volume load curve across sessions.
   - Workout frequency breakdown by week.

---

## 🛠 Technology Stack

- **Backend**: Python 3.12+ / 3.14 with FastAPI, SQLAlchemy 2.0, Pydantic v2, PyMySQL, JWT authentication (`python-jose`), and `passlib`/`bcrypt`.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React icons, and Recharts.
- **Database**: MySQL Server 8.0+ (with seamless fallback / SQLite testing compatibility).

---

## 🚀 Quick Start Guide

### 1-Click Launch (Windows)
Double click `start_laksh.bat` in the root folder, which will open two terminal windows running both servers:
- **Backend**: http://localhost:8000 (Interactive Swagger Docs at `http://localhost:8000/docs`)
- **Frontend**: http://localhost:5173

### Or Run Individually:

#### Backend
```powershell
cd backend
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend
```powershell
cd frontend
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm run dev
```

---

## 🔑 Demo Account

For instant testing, click the **"⚡ Fill Demo Credentials"** button on the Login page or use:
- **Email**: `athlete@laksh.app`
- **Password**: `fitness123`
