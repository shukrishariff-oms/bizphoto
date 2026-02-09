import asyncio
import aiosqlite
import os

if os.path.exists("/app/data"):
    DB_PATH = "/app/data/business.db"
else:
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "business.db")

async def migrate():
    print(f"Connecting to {DB_PATH}...")
    async with aiosqlite.connect(DB_PATH) as db:
        # 1. Create Clients Table
        await db.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        print("Created 'clients' table.")

        # 2. Create Invoices Table
        await db.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            event_id TEXT,
            invoice_number TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'DRAFT',
            issued_date DATE,
            due_date DATE,
            total_amount REAL DEFAULT 0.0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id),
            FOREIGN KEY(event_id) REFERENCES events(id)
        );
        """)
        print("Created 'invoices' table.")

        # 3. Create Invoice Items Table
        await db.execute("""
        CREATE TABLE IF NOT EXISTS invoice_items (
            id TEXT PRIMARY KEY,
            invoice_id TEXT NOT NULL,
            description TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            unit_price REAL DEFAULT 0.0,
            amount REAL DEFAULT 0.0,
            FOREIGN KEY(invoice_id) REFERENCES invoices(id)
        );
        """)
        print("Created 'invoice_items' table.")

        await db.commit()
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
