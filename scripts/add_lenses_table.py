import asyncio
import aiosqlite
import os
import sys

# Add project root to sys.path to allow imports from backend
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.db_init import DB_PATH

async def migrate_lenses():
    print(f"Migrating database at: {DB_PATH}")
    
    async with aiosqlite.connect(DB_PATH) as db:
        # Enable Foreign Keys
        await db.execute("PRAGMA foreign_keys = ON;")

        # Create Lenses Table
        print("Creating 'lenses' table...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS lenses (
                id TEXT PRIMARY KEY,
                model_name TEXT NOT NULL,
                serial_number TEXT,
                purchase_date DATE,
                purchase_price REAL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id TEXT REFERENCES users(id)
            );
        """)
        
        await db.commit()
        print("Migration complete: 'lenses' table created.")

if __name__ == "__main__":
    asyncio.run(migrate_lenses())
