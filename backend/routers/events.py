from fastapi import APIRouter, Depends, HTTPException
from backend.database import database
from backend.auth import get_current_active_user
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from uuid import UUID
import uuid

router = APIRouter(prefix="/events", tags=["events"])

class EventCreate(BaseModel):
    name: str
    event_date: date
    description: Optional[str] = None
    base_price: float = 0.0

class EventCostCreate(BaseModel):
    cost_type: str
    amount: float
    description: Optional[str] = None

class EventResponse(BaseModel):
    id: UUID
    name: str
    event_date: date
    description: Optional[str]
    base_price: float
    status: str

@router.post("/", response_model=dict)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    event_id = str(uuid.uuid4())
    query = """
        INSERT INTO events (id, name, event_date, description, base_price, status, user_id)
        VALUES (:id, :name, :event_date, :description, :base_price, 'planned', :user_id)
    """
    try:
        await database.execute(query=query, values={
            "id": event_id,
            "name": event.name,
            "event_date": event.event_date,
            "description": event.description,
            "base_price": event.base_price,
            "user_id": user_id
        })
        return {"id": event_id, "message": "Event created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{event_id}/cost")
async def add_event_cost(event_id: UUID, cost: EventCostCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    # Verify event ownership
    check_query = "SELECT 1 FROM events WHERE id = :event_id AND user_id = :user_id"
    event_exists = await database.fetch_one(query=check_query, values={"event_id": str(event_id), "user_id": user_id})
    
    if not event_exists:
        raise HTTPException(status_code=404, detail="Event not found or access denied")

    cost_id = str(uuid.uuid4())
    query = """
        INSERT INTO event_costs (id, event_id, cost_type, amount, description)
        VALUES (:id, :event_id, :cost_type, :amount, :description)
    """
    try:
        await database.execute(query=query, values={
            "id": cost_id,
            "event_id": str(event_id),
            "cost_type": cost.cost_type,
            "amount": cost.amount,
            "description": cost.description
        })
        return {"message": "Cost added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{event_id}/financials")
async def update_event_financials(event_id: UUID, data: dict, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    base_price = data.get("base_price")
    if base_price is None:
         raise HTTPException(status_code=400, detail="Base price is required")
         
    query = "UPDATE events SET base_price = :base_price WHERE id = :event_id AND user_id = :user_id"
    try:
        # Check rows affected to ensure ownership
        # databases.execute doesn't return count usually in asyncpg wrapper efficiently but sqlite does.
        # Safer to just execute. Ideally we check existence first or assume success if no error.
        # Let's check existence first for better 404
        check = await database.fetch_one("SELECT 1 FROM events WHERE id=:id AND user_id=:uid", {"id": str(event_id), "uid": user_id})
        if not check:
             raise HTTPException(status_code=404, detail="Event not found")
             
        await database.execute(query=query, values={"base_price": base_price, "event_id": str(event_id), "user_id": user_id})
        return {"message": "Financials updated successfully", "base_price": base_price}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{event_id}/financials")
async def get_event_financials(event_id: UUID, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    try:
        # Get Event for base price
        event_query = "SELECT base_price FROM events WHERE id = :event_id AND user_id = :user_id"
        event_res = await database.fetch_one(query=event_query, values={"event_id": str(event_id), "user_id": user_id})
        
        if not event_res:
            raise HTTPException(status_code=404, detail="Event not found")
            
        base_price = event_res['base_price']
        
        # Get Sum of costs (costs are linked to event, so implicit ownership by event check above)
        cost_query = "SELECT SUM(amount) as total_cost FROM event_costs WHERE event_id = :event_id"
        cost_res = await database.fetch_one(query=cost_query, values={"event_id": str(event_id)})
        
        total_cost = cost_res['total_cost'] or 0.0
        net_profit = base_price - total_cost
        
        return {
            "event_id": event_id,
            "total_revenue": base_price,
            "total_cost": total_cost,
            "net_profit": net_profit
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[EventResponse])
async def list_events(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    query = "SELECT * FROM events WHERE user_id = :user_id ORDER BY event_date DESC"
    try:
        results = await database.fetch_all(query=query, values={"user_id": user_id})
        return [dict(r) for r in results]
    except Exception as e:
        print(f"Error listing events: {e}")
        return []

@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: UUID, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    query = "SELECT * FROM events WHERE id = :event_id AND user_id = :user_id"
    try:
        result = await database.fetch_one(query=query, values={"event_id": str(event_id), "user_id": user_id})
        if not result:
            raise HTTPException(status_code=404, detail="Event not found")
        return dict(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{event_id}/status")
async def update_event_status(event_id: UUID, status_data: dict, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    # Check ownership
    check = await database.fetch_one("SELECT 1 FROM events WHERE id=:id AND user_id=:uid", {"id": str(event_id), "uid": user_id})
    if not check:
            raise HTTPException(status_code=404, detail="Event not found")
            
    query = "UPDATE events SET status = :status WHERE id = :event_id" # Ownership checked above
    try:
        await database.execute(query=query, values={"status": new_status, "event_id": str(event_id)})
        return {"message": "Status updated successfully", "status": new_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{event_id}")
async def delete_event(event_id: UUID, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    # Check ownership
    check = await database.fetch_one("SELECT 1 FROM events WHERE id=:id AND user_id=:uid", {"id": str(event_id), "uid": user_id})
    if not check:
            raise HTTPException(status_code=404, detail="Event not found")

    query = "DELETE FROM events WHERE id = :event_id"
    try:
        await database.execute(query=query, values={"event_id": str(event_id)})
        return {"message": "Event deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/public/{event_id}", response_model=dict)
async def get_public_event(event_id: UUID):
    # Public access does NOT check user_id
    query = "SELECT * FROM events WHERE id = :event_id"
    try:
        # Get Event
        result = await database.fetch_one(query=query, values={"event_id": str(event_id)})
        if not result:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_data = dict(result)

        # Get Invoices
        invoice_query = "SELECT id, invoice_number, total_amount, status FROM invoices WHERE event_id = :event_id AND status != 'DRAFT'"
        invoices = await database.fetch_all(query=invoice_query, values={"event_id": str(event_id)})
        
        event_data["invoices"] = [dict(inv) for inv in invoices]
        
        return event_data
    except Exception as e:
        print(f"Error fetching public event: {e}")
        raise HTTPException(status_code=404, detail="Event not found")

@router.post("/{event_id}/shutter")
async def add_shutter_cost(event_id: UUID, data: dict, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    camera_id = data.get("camera_id")
    shutter_count = data.get("shutter_count")
    
    if not camera_id or not shutter_count:
        raise HTTPException(status_code=400, detail="Camera ID and Shutter Count are required")
        
    try:
        shutter_count = int(shutter_count)
    except ValueError:
        raise HTTPException(status_code=400, detail="Shutter count must be an integer")
        
    # 1. Get Camera Details (Check Ownership)
    camera_query = "SELECT * FROM cameras WHERE id = :id AND user_id = :user_id"
    camera = await database.fetch_one(query=camera_query, values={"id": camera_id, "user_id": user_id})
    
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or access denied")
        
    # 2. Verify Event Ownership
    event_query = "SELECT 1 FROM events WHERE id = :id AND user_id = :user_id"
    event_check = await database.fetch_one(query=event_query, values={"id": str(event_id), "user_id": user_id})
    if not event_check:
         raise HTTPException(status_code=404, detail="Event not found or access denied")

    purchase_price = camera["purchase_price"] or 0.0
    max_shutter_life = camera["max_shutter_life"] or 150000
    model_name = camera["model_name"]
    
    # 3. Calculate Cost
    if max_shutter_life > 0:
        cost_per_shutter = purchase_price / max_shutter_life
    else:
        cost_per_shutter = 0.0
        
    total_cost = cost_per_shutter * shutter_count
    
    # 4. Update Camera Shutter Count
    new_shutter_count = (camera["current_shutter_count"] or 0) + shutter_count
    update_camera_query = "UPDATE cameras SET current_shutter_count = :count WHERE id = :id"
    await database.execute(query=update_camera_query, values={"count": new_shutter_count, "id": camera_id})
    
    # 5. Add Event Cost
    cost_id = str(uuid.uuid4())
    insert_cost_query = """
        INSERT INTO event_costs (id, event_id, cost_type, amount, description)
        VALUES (:id, :event_id, 'Shutter Wear', :amount, :description)
    """
    description = f"{shutter_count} shots with {model_name}"
    
    await database.execute(query=insert_cost_query, values={
        "id": cost_id,
        "event_id": str(event_id),
        "amount": total_cost,
        "description": description
    })
    
    return {
        "message": "Shutter cost recorded successfully",
        "cost": total_cost,
        "new_shutter_count": new_shutter_count
    }
