import asyncio
import aiosqlite
import os
import bcrypt
import uuid

def get_password_hash(password):
    if isinstance(password, str):
        password = password.encode('utf-8')
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')

# Determine DB path from env var (DATABASE_URL) or default relative path
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./business.db")

# Extract path from URL (remove scheme)
if "sqlite+aiosqlite:///" in DATABASE_URL:
    DB_PATH = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
elif "sqlite:///" in DATABASE_URL:
    DB_PATH = DATABASE_URL.replace("sqlite:///", "")
else:
    # Fallback/Default if no scheme
    DB_PATH = DATABASE_URL

# Resolve relative path if it starts with ./ or no slash, unless absolute
if not os.path.isabs(DB_PATH) and "./" in DB_PATH:
     DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "business.db")

async def deploy_db():
    print(f"Deploying database to: {DB_PATH}")
    
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

        await db.commit()
        print("All tables checked/created.")

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
        else:
            print("Admin user already exists.")

    print(f"Database deployment complete at {DB_PATH}.")

if __name__ == "__main__":
    asyncio.run(deploy_db())
