#!/usr/bin/env python3
"""
Personal Finance Tracker API Server
Run this script to start the FastAPI server
"""

import uvicorn
import os
from pathlib import Path
from main import app

def main():
    print("🚀 Starting Personal Finance Tracker API Server...")
    print("💰 100% Free - No costs involved!")
    print("📁 Using SQLite database (file-based, no server needed)")
    print("=" * 50)
    
    # Ensure the database directory exists
    db_path = Path("finance_tracker.db")
    if db_path.exists():
        print(f"📊 Database found: {db_path.absolute()}")
    else:
        print("📊 Creating new database...")
    
    print("\n🌐 Server will be available at:")
    print("   • Main API: http://localhost:8000")
    print("   • Documentation: http://localhost:8000/docs")
    print("   • Alternative docs: http://localhost:8000/redoc")
    print("\n⏹️  Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )

if __name__ == "__main__":
    main()
