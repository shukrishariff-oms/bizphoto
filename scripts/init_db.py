import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "business_photography")

# Connection string for the default 'postgres' database to create the target DB if it doesn't exist
ROOT_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/postgres"
TARGET_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"

async def create_database_if_not_exists():
    conn = await asyncpg.connect(ROOT_DATABASE_URL)
    try:
        exists = await conn.fetchval(f"SELECT 1 FROM pg_database WHERE datname = '{POSTGRES_DB}'")
        if not exists:
            print(f"Creating database {POSTGRES_DB}...")
            await conn.execute(f'CREATE DATABASE "{POSTGRES_DB}"')
        else:
            print(f"Database {POSTGRES_DB} already exists.")
    except Exception as e:
        print(f"Error creating database: {e}")
    finally:
        await conn.close()

async def run_sql_file(conn, file_path):
    print(f"Running {file_path}...")
    with open(file_path, 'r') as f:
        sql = f.read()
        await conn.execute(sql)

async def init_db():
    await create_database_if_not_exists()
    
    conn = await asyncpg.connect(TARGET_DATABASE_URL)
    try:
        # Determine paths relative to this script
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        schema_path = os.path.join(base_dir, 'database', 'schema.sql')
        procedures_path = os.path.join(base_dir, 'database', 'procedures.sql')
        seed_path = os.path.join(base_dir, 'database', 'seed.sql')

        await run_sql_file(conn, schema_path)
        await run_sql_file(conn, procedures_path)
        await run_sql_file(conn, seed_path)
        
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(init_db())
