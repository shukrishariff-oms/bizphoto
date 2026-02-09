import asyncio
import aiosqlite
import os
import sys

# Add project root to sys.path to allow imports from backend
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.database import DATABASE_URL

async def check_db():
    print(f"--- DATABASE DIAGNOSTIC ---")
    print(f"Current Working Directory: {os.getcwd()}")
    print(f"Detected DATABASE_URL: {DATABASE_URL}")
    
    # Extract path
    if "sqlite+aiosqlite:///" in DATABASE_URL:
        db_path = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
    elif "sqlite:///" in DATABASE_URL:
        db_path = DATABASE_URL.replace("sqlite:///", "")
    else:
        db_path = DATABASE_URL
        
    print(f"Resolved DB Path: {db_path}")
    
    # Check file
    if os.path.exists(db_path):
        size = os.path.getsize(db_path)
        print(f"File Status: EXISTS")
        print(f"File Size: {size} bytes ({size/1024:.2f} KB)")
        
        # Check permissions (basic)
        try:
            with open(db_path, "r+b") as f:
                print("Permission Check: READ/WRITE OK")
        except Exception as e:
            print(f"Permission Check: FAILED ({e})")
    else:
        print(f"File Status: NOT FOUND at {db_path}")
        # Identify where it might be
        if os.path.exists("/app/data/business.db"):
             print("NOTE: Found /app/data/business.db but DATABASE_URL is not pointing to it?")
        
    # Connect and Count
    print("\n--- TABLE COUNTS ---")
    try:
        async with aiosqlite.connect(db_path) as db:
            tables = ["users", "events", "transactions", "invoices", "clients", "cameras"]
            for table in tables:
                try:
                    cursor = await db.execute(f"SELECT COUNT(*) FROM {table}")
                    count = await cursor.fetchone()
                    print(f"{table}: {count[0]} rows")
                except Exception as e:
                    print(f"{table}: ERROR ({e})")
                    
            # Check Admin User
            print("\n--- ADMIN USER CHECK ---")
            cursor = await db.execute("SELECT id, username, email FROM users WHERE username='admin'")
            admin = await cursor.fetchone()
            if admin:
                print(f"Admin User: FOUND (ID: {admin[0]}, Email: {admin[2]})")
            else:
                print("Admin User: NOT FOUND")

    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
