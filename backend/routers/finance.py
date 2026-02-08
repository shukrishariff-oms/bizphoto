from fastapi import APIRouter, Depends, HTTPException
from backend.database import database
from backend.auth import get_current_active_user
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4

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
    user_id = current_user["id"]
    
    # 1. Get Income (Events)
    events_query = """
    SELECT id, event_date as date, name as description, base_price as amount, status 
    FROM events 
    WHERE user_id = :user_id
    ORDER BY event_date DESC
    """
    events = await database.fetch_all(query=events_query, values={"user_id": user_id})
    
    # 2. Get Expenses (Debits) - Join with events filtering by user_id
    expenses_query = """
    SELECT c.id, c.created_at as date, c.cost_type || ' - ' || e.name as description, c.amount, 'completed' as status
    FROM event_costs c
    JOIN events e ON c.event_id = e.id
    WHERE e.user_id = :user_id
    ORDER BY c.created_at DESC
    """
    expenses = await database.fetch_all(query=expenses_query, values={"user_id": user_id})

    # 3. Get General Transactions
    transactions_query = "SELECT * FROM transactions WHERE user_id = :user_id ORDER BY date DESC"
    general_transactions = await database.fetch_all(query=transactions_query, values={"user_id": user_id})
    
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

@router.post("/transaction")
async def create_transaction(transaction: TransactionCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    query = """
    INSERT INTO transactions (id, date, type, category, amount, description, user_id)
    VALUES (:id, :date, :type, :category, :amount, :description, :user_id)
    """
    values = {
        "id": str(uuid4()),
        "date": transaction.date,
        "type": transaction.type,
        "category": transaction.category,
        "amount": transaction.amount,
        "description": transaction.description,
        "user_id": user_id
    }
    
    try:
        await database.execute(query=query, values=values)
        return {"message": "Transaction added successfully"}
    except Exception as e:
        print(f"Error adding transaction: {e}")
        raise HTTPException(status_code=500, detail="Failed to add transaction")

@router.put("/transaction/{transaction_id}")
async def update_transaction(transaction_id: str, transaction: TransactionCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    # Check ownership
    check_query = "SELECT 1 FROM transactions WHERE id = :id AND user_id = :user_id"
    exists = await database.fetch_one(query=check_query, values={"id": transaction_id, "user_id": user_id})
    if not exists:
        raise HTTPException(status_code=404, detail="Transaction not found")

    query = """
    UPDATE transactions 
    SET date = :date, type = :type, category = :category, amount = :amount, description = :description
    WHERE id = :id AND user_id = :user_id
    """
    values = {
        "id": transaction_id,
        "date": transaction.date,
        "type": transaction.type,
        "category": transaction.category,
        "amount": transaction.amount,
        "description": transaction.description,
        "user_id": user_id
    }
    
    try:
        await database.execute(query=query, values=values)
        return {"message": "Transaction updated successfully"}
    except Exception as e:
        print(f"Error updating transaction: {e}")
        raise HTTPException(status_code=500, detail="Failed to update transaction")

@router.delete("/transaction/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    check_query = "SELECT 1 FROM transactions WHERE id = :id AND user_id = :user_id"
    exists = await database.fetch_one(query=check_query, values={"id": transaction_id, "user_id": user_id})
    if not exists:
        raise HTTPException(status_code=404, detail="Transaction not found")

    query = "DELETE FROM transactions WHERE id = :id AND user_id = :user_id"
    try:
        await database.execute(query=query, values={"id": transaction_id, "user_id": user_id})
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        print(f"Error deleting transaction: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete transaction")
