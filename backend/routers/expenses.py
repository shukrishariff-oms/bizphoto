from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from backend.database import database
from backend.auth import get_current_active_user

router = APIRouter(
    prefix="/expenses",
    tags=["expenses"]
)

# --- Pydantic Models ---
class ExpenseCreate(BaseModel):
    event_id: UUID
    cost_type: str  # e.g., 'Photographer Fee', 'Transport', 'Marketing'
    amount: float
    description: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: UUID
    event_id: UUID
    cost_type: str
    amount: float
    description: Optional[str] = None
    created_at: str

class ExpenseUpdate(BaseModel):
    cost_type: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None

# --- Endpoints ---

@router.post("/", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_active_user)):
    """
    Record a new expense for an event.
    """
    user_id = current_user["id"]
    # Check event ownership
    check_query = "SELECT 1 FROM events WHERE id = :event_id AND user_id = :user_id"
    event_exists = await database.fetch_one(query=check_query, values={"event_id": str(expense.event_id), "user_id": user_id})
    if not event_exists:
        raise HTTPException(status_code=404, detail="Event not found")

    expense_id = str(uuid4())
    query = """
    INSERT INTO event_costs (id, event_id, cost_type, amount, description)
    VALUES (:id, :event_id, :cost_type, :amount, :description)
    """
    values = {
        "id": expense_id,
        "event_id": str(expense.event_id),
        "cost_type": expense.cost_type,
        "amount": expense.amount,
        "description": expense.description
    }
    
    try:
        await database.execute(query=query, values=values)
        return {**values, "created_at": str(datetime.now())}
    except Exception as e:
        print(f"Error creating expense: {e}")
        raise HTTPException(status_code=500, detail="Failed to create expense")

@router.get("/event/{event_id}", response_model=List[ExpenseResponse])
async def get_event_expenses(event_id: UUID, current_user: dict = Depends(get_current_active_user)):
    """
    List all expenses associated with a specific event.
    """
    user_id = current_user["id"]
    # Check event ownership implicit in join or check.
    # Simple check first
    check_query = "SELECT 1 FROM events WHERE id = :event_id AND user_id = :user_id"
    event_exists = await database.fetch_one(query=check_query, values={"event_id": str(event_id), "user_id": user_id})
    if not event_exists:
         # Either not found or not owned, return empty list or 404? 
         # Standard practice: 404 if parent not found, or empty list if just access denied to prevent enumeration?
         # Let's say 404/Empty. Return empty list matches original behavior.
         return []

    query = "SELECT * FROM event_costs WHERE event_id = :event_id ORDER BY created_at DESC"
    try:
        results = await database.fetch_all(query=query, values={"event_id": str(event_id)})
        return [dict(r) for r in results]
    except Exception as e:
        print(f"Error fetching expenses: {e}")
        return []

@router.delete("/{expense_id}")
async def delete_expense(expense_id: UUID, current_user: dict = Depends(get_current_active_user)):
    """
    Remove an expense record.
    """
    user_id = current_user["id"]
    # Check ownership via join
    check_query = """
    SELECT 1 FROM event_costs c
    JOIN events e ON c.event_id = e.id
    WHERE c.id = :id AND e.user_id = :user_id
    """
    exists = await database.fetch_one(query=check_query, values={"id": str(expense_id), "user_id": user_id})
    if not exists:
        raise HTTPException(status_code=404, detail="Expense not found")

    query = "DELETE FROM event_costs WHERE id = :id"
    try:
        await database.execute(query=query, values={"id": str(expense_id)})
        return {"message": "Expense deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete expense")

@router.put("/{expense_id}")
async def update_expense(expense_id: UUID, expense: ExpenseUpdate, current_user: dict = Depends(get_current_active_user)):
    """
    Update an existing expense record.
    """
    user_id = current_user["id"]
    # 1. Check if expense exists and belongs to user
    check_query = """
    SELECT c.* FROM event_costs c
    JOIN events e ON c.event_id = e.id
    WHERE c.id = :id AND e.user_id = :user_id
    """
    existing = await database.fetch_one(query=check_query, values={"id": str(expense_id), "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")

    # 2. Build update query
    update_data = expense.model_dump(exclude_unset=True)
    if not update_data:
        return {"message": "No changes provided"}

    set_clause = ", ".join([f"{key} = :{key}" for key in update_data.keys()])
    query = f"UPDATE event_costs SET {set_clause} WHERE id = :id"
    values = {**update_data, "id": str(expense_id)}

    try:
        await database.execute(query=query, values=values)
        return {"message": "Expense updated successfully"}
    except Exception as e:
        print(f"Error updating expense: {e}")
        raise HTTPException(status_code=500, detail="Failed to update expense")
