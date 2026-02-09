import asyncio
import aiosqlite

DATABASE_URL = "business.db"

async def inspect():
    async with aiosqlite.connect(DATABASE_URL) as db:
        async with db.execute("SELECT * FROM event_costs") as cursor:
            rows = await cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            print(f"Columns: {columns}")
            print(f"Row Count: {len(rows)}")
            for row in rows:
                print(dict(zip(columns, row)))

if __name__ == "__main__":
    asyncio.run(inspect())
