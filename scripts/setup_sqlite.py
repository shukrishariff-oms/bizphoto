import asyncio
import aiosqlite
import os
import bcrypt

def get_password_hash(password):
    # Determine if password is bytes or str
    if isinstance(password, str):
        password = password.encode('utf-8')
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')

DATABASE_URL = "business.db"

async def setup_sqlite():
    # Delete existing if any (optional, but safer for fresh start)
    # if os.path.exists(DATABASE_URL):
    #     os.remove(DATABASE_URL)
    
    print(f"Setting up SQLite database: {DATABASE_URL}...")

    async with aiosqlite.connect(DATABASE_URL) as db:
        # Enable Foreign Keys
        await db.execute("PRAGMA foreign_keys = ON;")

        # Create Tables
        # Users
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, /* UUID stored as TEXT */
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'photographer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Cameras
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cameras (
                id TEXT PRIMARY KEY,
                model_name TEXT NOT NULL,
                serial_number TEXT UNIQUE NOT NULL,
                purchase_date DATE,
                initial_shutter_count INTEGER DEFAULT 0,
                current_shutter_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Events (Replaces stored procedure logic with standard table)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                event_date DATE NOT NULL,
                description TEXT,
                base_price REAL DEFAULT 0.00,
                status TEXT DEFAULT 'planned',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Event Costs
        await db.execute("""
            CREATE TABLE IF NOT EXISTS event_costs (
                id TEXT PRIMARY KEY,
                event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
                cost_type TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0.00,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # General Transactions (Capital, Overhead, etc.)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                date DATE NOT NULL,
                type TEXT NOT NULL, -- 'Credit' or 'Debit'
                category TEXT NOT NULL, -- 'Capital', 'Equipment', 'Marketing', etc.
                amount REAL NOT NULL DEFAULT 0.00,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        print("Tables created.")

        # Seed Admin User
        admin_pass = get_password_hash("password")
        import uuid
        
        # Check if admin exists
        cursor = await db.execute("SELECT 1 FROM users WHERE username = 'admin'")
        exists = await cursor.fetchone()
        
        if not exists:
            admin_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO users (id, username, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
            """, (admin_id, 'admin', 'admin@example.com', admin_pass, 'admin'))
            print("Admin user seeded.")
        else:
            print("Admin user already exists.")

        # Seed Sample Events
        cursor = await db.execute("SELECT count(*) FROM events")
        count = await cursor.fetchone()
        if count[0] == 0:
            print("Seeding sample events...")
            events = [
                ("Summer Wedding", "2024-06-15", "Full day coverage", 2500.0, "planned"),
                ("Corporate Headshots", "2024-05-20", "Office staff photos", 1200.0, "completed"),
                ("Family Portrait", "2024-07-01", "Park session", 450.0, "shooting")
            ]
            for evt in events:
                await db.execute("""
                    INSERT INTO events (id, name, event_date, description, base_price, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), evt[0], evt[1], evt[2], evt[3], evt[4]))

        await db.commit()
        print("Setup completed successfully.")

if __name__ == "__main__":
    asyncio.run(setup_sqlite())
