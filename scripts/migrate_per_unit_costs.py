import asyncio
import aiosqlite
import os

DATABASE_URL = "business.db"

async def migrate():
    print(f"Migrating database: {DATABASE_URL}...")
    
    if not os.path.exists(DATABASE_URL):
        print("Database file not found!")
        return

    async with aiosqlite.connect(DATABASE_URL) as db:
        try:
            # Add rate_type column
            try:
                await db.execute("ALTER TABLE event_costs ADD COLUMN rate_type TEXT DEFAULT 'flat'")
                print("Added column: rate_type")
            except Exception as e:
                print(f"Column rate_type might already exist: {e}")

            # Add unit_price column
            try:
                await db.execute("ALTER TABLE event_costs ADD COLUMN unit_price REAL DEFAULT 0.0")
                print("Added column: unit_price")
            except Exception as e:
                print(f"Column unit_price might already exist: {e}")

            # Add quantity column
            try:
                await db.execute("ALTER TABLE event_costs ADD COLUMN quantity REAL DEFAULT 1.0")
                print("Added column: quantity")
            except Exception as e:
                print(f"Column quantity might already exist: {e}")

            await db.commit()
            print("Migration completed successfully.")
            
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
