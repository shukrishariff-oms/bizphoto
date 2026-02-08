from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from backend.database import database
from backend.auth import get_current_active_user

router = APIRouter(
    prefix="/clients",
    tags=["clients"]
)

# --- Pydantic Models ---
class ClientCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class ClientResponse(BaseModel):
    id: UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

# --- Endpoints ---

@router.post("/", response_model=ClientResponse)
async def create_client(client: ClientCreate, current_user: dict = Depends(get_current_active_user)):
    """
    Create a new client.
    """
    client_id = str(uuid4())
    created_at = datetime.now()
    
    query = """
    INSERT INTO clients (id, name, email, phone, notes, created_at)
    VALUES (:id, :name, :email, :phone, :notes, :created_at)
    """
    values = {
        "id": client_id,
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "notes": client.notes,
        "created_at": created_at
    }
    
    try:
        await database.execute(query=query, values=values)
        return {**values, "created_at": str(created_at)}
    except Exception as e:
        print(f"Error creating client: {e}")
        raise HTTPException(status_code=500, detail="Failed to create client")

@router.get("/", response_model=List[ClientResponse])
async def list_clients(current_user: dict = Depends(get_current_active_user)):
    """
    List all clients.
    """
    query = "SELECT * FROM clients ORDER BY created_at DESC"
    try:
        results = await database.fetch_all(query=query)
        return [dict(r) for r in results]
    except Exception as e:
        print(f"Error listing clients: {e}")
        return []

@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: UUID, current_user: dict = Depends(get_current_active_user)):
    """
    Get a specific client by ID.
    """
    query = "SELECT * FROM clients WHERE id = :id"
    try:
        result = await database.fetch_one(query=query, values={"id": str(client_id)})
        if not result:
            raise HTTPException(status_code=404, detail="Client not found")
        return dict(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(client_id: UUID, client: ClientUpdate, current_user: dict = Depends(get_current_active_user)):
    """
    Update an existing client.
    """
    # 1. Check if client exists
    check_query = "SELECT * FROM clients WHERE id = :id"
    existing = await database.fetch_one(query=check_query, values={"id": str(client_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")

    # 2. Build update query
    update_data = client.model_dump(exclude_unset=True)
    if not update_data:
        return dict(existing)

    set_clause = ", ".join([f"{key} = :{key}" for key in update_data.keys()])
    query = f"UPDATE clients SET {set_clause} WHERE id = :id"
    values = {**update_data, "id": str(client_id)}

    try:
        await database.execute(query=query, values=values)
        updated_client = await database.fetch_one(query=check_query, values={"id": str(client_id)})
        return dict(updated_client)
    except Exception as e:
        print(f"Error updating client: {e}")
        raise HTTPException(status_code=500, detail="Failed to update client")

@router.delete("/{client_id}")
async def delete_client(client_id: UUID, current_user: dict = Depends(get_current_active_user)):
    """
    Delete a client.
    """
    query = "DELETE FROM clients WHERE id = :id"
    try:
        await database.execute(query=query, values={"id": str(client_id)})
        return {"message": "Client deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete client")
