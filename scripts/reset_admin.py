import asyncio
import sys
import os
from dotenv import load_dotenv

# Add parent directory to path so we can import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.auth import get_password_hash
from backend.database import database

async def reset_admin():
    load_dotenv()
    await database.connect()
    
    username = "admin"
    password = "password"
    hashed_password = get_password_hash(password)
    
    print(f"Reseting password for '{username}' to '{password}'...")
    
    # Check if user exists
    query = "SELECT 1 FROM users WHERE username = :username"
    exists = await database.fetch_one(query=query, values={"username": username})
    
    if exists:
        query = "UPDATE users SET password_hash = :password_hash WHERE username = :username"
        await database.execute(query=query, values={"password_hash": hashed_password, "username": username})
        print("Update successful.")
    else:
        query = "INSERT INTO users (username, email, password_hash, role) VALUES (:username, :email, :password_hash, :role)"
        await database.execute(query=query, values={
            "username": username, 
            "email": "admin@example.com", 
            "password_hash": hashed_password,
            "role": "admin"
        })
        print("Created new admin user.")
        
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(reset_admin())
