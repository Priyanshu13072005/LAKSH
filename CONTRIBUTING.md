# Contributing to LAKSH 🏋️‍♂️

Thank you for your interest in contributing to **LAKSH**! We welcome improvements, bug fixes, documentation updates, and feature suggestions.

---

## 🛠️ Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Priyanshu13072005/LAKSH.git
   cd LAKSH
   ```

2. **Backend Setup**:
   ```bash
   cd fitlog/backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup**:
   ```bash
   cd fitlog/frontend
   npm install
   npm run dev
   ```

---

## 📌 Coding Standards

- **FastAPI / Python**: Follow PEP 8 guidelines. Type hints are encouraged for schemas and dependencies.
- **React / Frontend**: Use functional components with React Hooks. Maintain modern aesthetics with Tailwind CSS.
- **Git Commits**: Use conventional commits (e.g. `feat:`, `fix:`, `docs:`, `perf:`).

---

## 🧪 Testing

Before submitting a Pull Request, please ensure the frontend builds cleanly:
```bash
cd fitlog/frontend
npm run build
```
And verify that backend Python files compile without syntax errors:
```bash
cd fitlog/backend
python -m py_compile app/main.py
```
