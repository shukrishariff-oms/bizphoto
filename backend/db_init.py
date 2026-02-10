import asyncio
import aiosqlite
import os
import bcrypt
import uuid
from backend.database import DATABASE_URL

def get_password_hash(password):
    if isinstance(password, str):
        password = password.encode('utf-8')
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')

def get_db_path(url):
    if "sqlite+aiosqlite:///" in url:
        return url.replace("sqlite+aiosqlite:///", "")
    elif "sqlite:///" in url:
        return url.replace("sqlite:///", "")
    return url

DB_PATH = get_db_path(DATABASE_URL)

async def init_db():
    print(f"Initializing database to: {DB_PATH}")
    
    # Ensure directory exists if path is absolute or relative
    # For /app/data, it should exist. For local ./business.db, it exists.
    # If using /app/data/business.db, the folder /app/data must exist.
    # It is checked in DATABASE_URL logic in main.py/database.py mainly.

    async with aiosqlite.connect(DB_PATH) as db:
        # Enable Foreign Keys
        await db.execute("PRAGMA foreign_keys = ON;")

        # --- CORE TABLES ---
        
        # Users
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
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
                purchase_price REAL DEFAULT 0.00,
                max_shutter_life INTEGER DEFAULT 150000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id TEXT REFERENCES users(id)
            );
        """)

        # Lenses
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

        # Events
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rate_type TEXT DEFAULT 'flat',
                unit_price REAL DEFAULT 0.0,
                quantity REAL DEFAULT 1.0
            );
        """)

        # Transactions
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                date DATE NOT NULL,
                type TEXT NOT NULL, 
                category TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0.00,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # --- CRM TABLES ---

        # Clients
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

        # Invoices
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

        # Invoice Items
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
        
        # --- GALLERY TABLES ---

        # Albums
        await db.execute("""
        CREATE TABLE IF NOT EXISTS albums (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """)

        # Photos
        await db.execute("""
        CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            album_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            original_path TEXT NOT NULL,
            watermarked_path TEXT,
            price REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE
        );
        """)
        
        # Determine if we need to migrate existing tables (SaaS support)
        # Checking if tables were just created or old without user_id
        # We can just attempt ALTER TABLE unconditionally safely with try/except
        
        tables_to_check = ['events', 'clients', 'cameras', 'transactions', 'invoices', 'albums']
        for table in tables_to_check:
             try:
                 await db.execute(f"ALTER TABLE {table} ADD COLUMN user_id TEXT REFERENCES users(id)")
             except Exception:
                 pass # Column likely exists

        # Also check event_costs columns (from migrate_per_unit_costs.py)
        try:
            await db.execute("ALTER TABLE event_costs ADD COLUMN rate_type TEXT DEFAULT 'flat'")
        except: pass
        try:
            await db.execute("ALTER TABLE event_costs ADD COLUMN unit_price REAL DEFAULT 0.0")
        except: pass
        try:
             await db.execute("ALTER TABLE event_costs ADD COLUMN quantity REAL DEFAULT 1.0")
        except: pass

        await db.commit()
        print("Database tables initialized.")

        # --- SEED DATA ---
        
        # Seed Admin User
        cursor = await db.execute("SELECT 1 FROM users WHERE username = 'admin'")
        exists = await cursor.fetchone()
        
        if not exists:
            admin_pass = get_password_hash("password")
            admin_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO users (id, username, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
            """, (admin_id, 'admin', 'admin@example.com', admin_pass, 'admin'))
            print("Admin user seeded.")
            await db.commit()
            
            # Backfill any null user_id to admin
            for table in tables_to_check:
                await db.execute(f"UPDATE {table} SET user_id = ? WHERE user_id IS NULL", (admin_id,))
            await db.commit()
            print("Legacy data assigned to admin.")
        else:
            print("Admin user already exists.")

    print(f"Database initialization complete at {DB_PATH}.")
