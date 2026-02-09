import asyncio
import aiosqlite

import os

if os.path.exists("/app/data"):
    DATABASE_URL = "/app/data/business.db"
else:
    DATABASE_URL = "business.db"

async def inspect_all():
    async with aiosqlite.connect(DATABASE_URL) as db:
        # Get list of tables
        async with db.execute("SELECT name FROM sqlite_master WHERE type='table';") as cursor:
            tables = await cursor.fetchall()
            print("Tables found:", [t[0] for t in tables])

        # Inspect specific tables
        for table_name in ["users", "events", "clients"]:
            print(f"\n--- Data in '{table_name}' ---")
            try:
                async with db.execute(f"SELECT * FROM {table_name} LIMIT 5") as cursor:
                    rows = await cursor.fetchall()
                    columns = [description[0] for description in cursor.description]
                    print(f"Columns: {columns}")
                    for row in rows:
                        print(dict(zip(columns, row)))
            except Exception as e:
                print(f"Could not read table {table_name}: {e}")

if __name__ == "__main__":
    asyncio.run(inspect_all())
