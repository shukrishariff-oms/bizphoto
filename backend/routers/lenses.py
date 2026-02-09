from fastapi import APIRouter, Depends, HTTPException
from backend.database import database
from backend.auth import get_current_active_user
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from uuid import UUID
import uuid

router = APIRouter(prefix="/lenses", tags=["lenses"])

class LensCreate(BaseModel):
    model_name: str
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: float = 0.0

class LensUpdate(BaseModel):
    model_name: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None

class LensResponse(BaseModel):
    id: UUID
    model_name: str
    serial_number: Optional[str]
    purchase_date: Optional[date]
    purchase_price: float
    user_id: str

@router.post("/", response_model=dict)
async def create_lens(lens: LensCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    lens_id = str(uuid.uuid4())
    
    query = """
        INSERT INTO lenses (id, model_name, serial_number, purchase_date, purchase_price, user_id)
        VALUES (:id, :model_name, :serial_number, :purchase_date, :purchase_price, :user_id)
    """
    
    try:
        await database.execute(query=query, values={
            "id": lens_id,
            "model_name": lens.model_name,
            "serial_number": lens.serial_number,
            "purchase_date": lens.purchase_date,
            "purchase_price": lens.purchase_price,
            "user_id": user_id
        })
        return {"id": lens_id, "message": "Lens registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[LensResponse])
async def list_lenses(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    query = "SELECT * FROM lenses WHERE user_id = :user_id ORDER BY created_at DESC"
    try:
        results = await database.fetch_all(query=query, values={"user_id": user_id})
        return [dict(r) for r in results]
    except Exception as e:
        print(f"Error listing lenses: {e}")
        return []

@router.get("/{lens_id}", response_model=LensResponse)
async def get_lens(lens_id: UUID, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    query = "SELECT * FROM lenses WHERE id = :id AND user_id = :user_id"
    try:
        result = await database.fetch_one(query=query, values={"id": str(lens_id), "user_id": user_id})
        if not result:
            raise HTTPException(status_code=404, detail="Lens not found")
        return dict(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{lens_id}")
async def update_lens(lens_id: UUID, lens: LensUpdate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    # Check ownership
    check = await database.fetch_one("SELECT 1 FROM lenses WHERE id=:id AND user_id=:uid", {"id": str(lens_id), "uid": user_id})
    if not check:
        raise HTTPException(status_code=404, detail="Lens not found")

    update_data = lens.model_dump(exclude_unset=True)
    if not update_data:
        return {"message": "No changes provided"}

    set_clause = ", ".join([f"{key} = :{key}" for key in update_data.keys()])
    query = f"UPDATE lenses SET {set_clause} WHERE id = :id"
    values = {**update_data, "id": str(lens_id)}

    try:
        await database.execute(query=query, values=values)
        return {"message": "Lens updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{lens_id}")
async def delete_lens(lens_id: UUID, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    # Check ownership
    check = await database.fetch_one("SELECT 1 FROM lenses WHERE id=:id AND user_id=:uid", {"id": str(lens_id), "uid": user_id})
    if not check:
        raise HTTPException(status_code=404, detail="Lens not found")

    query = "DELETE FROM lenses WHERE id = :lens_id"
    try:
        await database.execute(query=query, values={"lens_id": str(lens_id)})
        return {"message": "Lens deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
