from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime
from backend.database import database
from backend.auth import get_current_active_user

router = APIRouter(
    prefix="/cameras",
    tags=["cameras"]
)

# --- Models ---
class CameraCreate(BaseModel):
    model_name: str
    serial_number: Optional[str] = None
    initial_shutter_count: int = 0
    purchase_price: float = 0.0
    max_shutter_life: int = 150000

class CameraUpdate(BaseModel):
    model_name: Optional[str] = None
    serial_number: Optional[str] = None
    current_shutter_count: Optional[int] = None
    purchase_price: Optional[float] = None
    max_shutter_life: Optional[int] = None

class CameraResponse(BaseModel):
    id: UUID
    model_name: str
    serial_number: Optional[str]
    current_shutter_count: int
    purchase_price: float
    max_shutter_life: int
    created_at: str

# --- Endpoints ---
@router.post("/", response_model=CameraResponse)
async def register_camera(camera: CameraCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    camera_id = str(uuid4())
    created_at = datetime.now()
    
    query = """
    INSERT INTO cameras (id, model_name, serial_number, current_shutter_count, purchase_price, max_shutter_life, created_at, user_id)
    VALUES (:id, :model_name, :serial_number, :current_shutter_count, :purchase_price, :max_shutter_life, :created_at, :user_id)
    """
    values = {
        "id": camera_id,
        "model_name": camera.model_name,
        "serial_number": camera.serial_number,  # Can be None
        "current_shutter_count": camera.initial_shutter_count,
        "purchase_price": camera.purchase_price,
        "max_shutter_life": camera.max_shutter_life,
        "created_at": created_at,
        "user_id": user_id
    }
    
    try:
        await database.execute(query=query, values=values)
        return {**values, "created_at": str(created_at)}
    except Exception as e:
        print(f"Error registering camera: {e}")
        raise HTTPException(status_code=500, detail="Failed to register camera")

@router.get("/", response_model=List[CameraResponse])
async def list_cameras(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    query = "SELECT * FROM cameras WHERE user_id = :user_id ORDER BY created_at DESC"
    try:
        results = await database.fetch_all(query=query, values={"user_id": user_id})
        # Ensure default values for older records if any
        cameras = []
        for r in results:
            cam = dict(r)
            if 'purchase_price' not in cam or cam['purchase_price'] is None:
                cam['purchase_price'] = 0.0
            if 'max_shutter_life' not in cam or cam['max_shutter_life'] is None:
                cam['max_shutter_life'] = 150000
            cameras.append(cam)
        return cameras
    except Exception as e:
        return []

@router.delete("/{camera_id}")
async def delete_camera(camera_id: UUID, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    # Check ownership
    check_query = "SELECT 1 FROM cameras WHERE id = :id AND user_id = :user_id"
    exists = await database.fetch_one(query=check_query, values={"id": str(camera_id), "user_id": user_id})
    if not exists:
        raise HTTPException(status_code=404, detail="Camera not found")

    query = "DELETE FROM cameras WHERE id = :id AND user_id = :user_id"
    try:
        await database.execute(query=query, values={"id": str(camera_id), "user_id": user_id})
        return {"message": "Camera deleted successfully"}
    except Exception as e:
         # Log e
        raise HTTPException(status_code=500, detail="Failed to delete camera")


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: UUID, camera: CameraUpdate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    # 1. Check if camera exists
    check_query = "SELECT * FROM cameras WHERE id = :id AND user_id = :user_id"
    existing_camera = await database.fetch_one(query=check_query, values={"id": str(camera_id), "user_id": user_id})
    if not existing_camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    # 2. Build update query dynamically
    update_data = camera.model_dump(exclude_unset=True)
    if not update_data:
         # No fields to update, return existing
         return dict(existing_camera)

    set_clause = ", ".join([f"{key} = :{key}" for key in update_data.keys()])
    query = f"UPDATE cameras SET {set_clause} WHERE id = :id AND user_id = :user_id"
    
    values = {**update_data, "id": str(camera_id), "user_id": user_id}
    
    try:
        await database.execute(query=query, values=values)
        # Fetch updated record
        updated_camera = await database.fetch_one(query=check_query, values={"id": str(camera_id), "user_id": user_id})
        return dict(updated_camera)
    except Exception as e:
        print(f"Error updating camera: {e}")
        raise HTTPException(status_code=500, detail="Failed to update camera")
