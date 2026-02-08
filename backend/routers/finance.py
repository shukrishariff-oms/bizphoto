from fastapi import APIRouter, Depends
from backend.database import database
from backend.auth import get_current_active_user
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(
    prefix="/finance",
    tags=["finance"]
)

class Transaction(BaseModel):
    id: str
    date: str
    description: str
    type: str # 'Credit' or 'Debit'
    category: Optional[str] = None
    amount: float
    status: str
    source: str # 'event', 'expense', 'manual'

class TransactionCreate(BaseModel):
    date: str
    type: str # 'Credit' or 'Debit'
    category: str
    amount: float
    description: Optional[str] = None

@router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: dict = Depends(get_current_active_user)):
    # 1. Get Income (Events)
    events_query = """
    SELECT id, event_date as date, name as description, base_price as amount, status 
    FROM events 
    ORDER BY event_date DESC
    """
    events = await database.fetch_all(query=events_query)
    
    # 2. Get Expenses (Debits)
    # We need to join with events to get the date if not stored in expenses, 
    # but for now let's use created_at as date for expenses or join event_id
    expenses_query = """
    SELECT c.id, c.created_at as date, c.cost_type || ' - ' || e.name as description, c.amount, 'completed' as status
    FROM event_costs c
    JOIN events e ON c.event_id = e.id
    ORDER BY c.created_at DESC
    """
    expenses = await database.fetch_all(query=expenses_query)

    # 3. Get General Transactions
    transactions_query = "SELECT * FROM transactions ORDER BY date DESC"
    general_transactions = await database.fetch_all(query=transactions_query)
    
    transactions = []
    
    for e in events:
        transactions.append({
            "id": str(e["id"]),
            "date": str(e["date"]),
            "description": f"Event: {e['description']}",
            "type": "Credit",
            "category": "Event Income",
            "amount": e["amount"],
            "status": e["status"],
            "source": "event"
        })
        
    for ex in expenses:
        transactions.append({
            "id": str(ex["id"]),
            "date": str(ex["date"]),
            "description": ex["description"],
            "type": "Debit",
            "category": "Event Expense",
            "amount": ex["amount"],
            "status": ex["status"],
            "source": "expense"
        })

    for t in general_transactions:
        transactions.append({
            "id": str(t["id"]),
            "date": str(t["date"]),
            "description": f"{t['description'] or ''}",
            "type": t["type"],
            "category": t["category"],
            "amount": t["amount"],
            "status": "completed",
            "source": "manual"
        })
        
    # Sort by date desc
    transactions.sort(key=lambda x: str(x["date"]), reverse=True)
    
    return transactions

from uuid import uuid4

@router.post("/transaction")
async def create_transaction(transaction: TransactionCreate, current_user: dict = Depends(get_current_active_user)):
    query = """
    INSERT INTO transactions (id, date, type, category, amount, description)
    VALUES (:id, :date, :type, :category, :amount, :description)
    """
    values = {
        "id": str(uuid4()),
        "date": transaction.date,
        "type": transaction.type,
        "category": transaction.category,
        "amount": transaction.amount,
        "description": transaction.description
    }
    
    try:
        await database.execute(query=query, values=values)
        return {"message": "Transaction added successfully"}
    except Exception as e:
        print(f"Error adding transaction: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Failed to add transaction")

@router.put("/transaction/{transaction_id}")
async def update_transaction(transaction_id: str, transaction: TransactionCreate, current_user: dict = Depends(get_current_active_user)):
    query = """
    UPDATE transactions 
    SET date = :date, type = :type, category = :category, amount = :amount, description = :description
    WHERE id = :id
    """
    values = {
        "id": transaction_id,
        "date": transaction.date,
        "type": transaction.type,
        "category": transaction.category,
        "amount": transaction.amount,
        "description": transaction.description
    }
    
    try:
        await database.execute(query=query, values=values)
        return {"message": "Transaction updated successfully"}
    except Exception as e:
        print(f"Error updating transaction: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Failed to update transaction")

@router.delete("/transaction/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_active_user)):
    query = "DELETE FROM transactions WHERE id = :id"
    try:
        await database.execute(query=query, values={"id": transaction_id})
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        print(f"Error deleting transaction: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Failed to delete transaction")
