import sqlite3
import os

# Determine DB path (copied from deploy_db.py logic)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./business.db")

# Strip async driver prefix
if "sqlite+aiosqlite:///" in DATABASE_URL:
    DB_PATH = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
elif "sqlite:///" in DATABASE_URL:
    DB_PATH = DATABASE_URL.replace("sqlite:///", "")
else:
    DB_PATH = DATABASE_URL

if not os.path.isabs(DB_PATH) and "./" in DB_PATH:
     DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "business.db")

def migrate_saas():
    print(f"Target Database: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("Database file not found!")
        # Create empty DB if not exists (for testing purposes, though app usually creates it)
        # conn = sqlite3.connect(DB_PATH)
        # conn.close()
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Fetch Admin ID to owner existing data
        cursor.execute("SELECT id FROM users WHERE username = 'admin'")
        admin = cursor.fetchone()
        
        if not admin:
            print("Error: 'admin' user not found. Cannot assign legacy data.")
            conn.close()
            return
            
        admin_id = admin[0]
        print(f"Found Admin ID: {admin_id}. Assigning legacy data to this user.")

        # 2. List of tables to update
        tables = ['events', 'clients', 'cameras', 'transactions', 'invoices']
        
        for table in tables:
            print(f"Processing table: {table}...")
            try:
                # Add user_id column
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id TEXT REFERENCES users(id)")
                print(f"  [OK] Added 'user_id' column to '{table}'.")
                
                # Populate with admin_id
                cursor.execute(f"UPDATE {table} SET user_id = ? WHERE user_id IS NULL", (admin_id,))
                print(f"  [OK] Assigned existing records to admin.")
                
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                     print(f"  [SKIP] 'user_id' column already exists in '{table}'.")
                else:
                    print(f"  [ERROR] Failed to alter '{table}': {e}")
            except Exception as e:
                print(f"  [ERROR] Unexpected error on '{table}': {e}")
        
        conn.commit()
        print("SaaS Migration Completed Successfully.")
        
    except Exception as e:
        print(f"Critical Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_saas()
