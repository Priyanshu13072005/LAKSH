"""
LAKSH Backend - Root Entry Point
Allows cloud hosts (like Render or Railway) that run from the repository root
to import and serve the FastAPI application seamlessly.
"""

import sys
import os

# Add fitlog/backend directory to Python path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fitlog", "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Import and expose the FastAPI app instance
from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
