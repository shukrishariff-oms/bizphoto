import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_postgres():
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    server = os.getenv("POSTGRES_server", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "business_photography")

    print(f"Connecting to Postgres: {user}@{server}:{port}/{db_name}")

    try:
        conn = await asyncpg.connect(user=user, password=password,
                                     database=db_name, host=server, port=port)
        print("Connected successfully!")
        
        # Check tables
        rows = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        print("Tables found:", [r['table_name'] for r in rows])

        # Check users
        try:
            users = await conn.fetch("SELECT * FROM users LIMIT 5")
            print(f"Users found: {len(users)}")
            for u in users:
                print(dict(u))
        except Exception as e:
            print(f"Could not read users: {e}")

        await conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(check_postgres())
