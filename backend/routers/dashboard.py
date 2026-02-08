from fastapi import APIRouter, Depends, HTTPException
from backend.database import database
from backend.auth import get_current_active_user
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
async def get_dashboard_summary(
    year: int = date.today().year, 
    month: int = date.today().month,
    current_user: dict = Depends(get_current_active_user)
):
    try:
        # 1. Total Revenue (Event base_price + Manual Credits) for the month
        # Start and end date of the month
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year+1}-01-01"
        else:
            end_date = f"{year}-{month+1:02d}-01"

        # Revenue from Events
        revenue_events_query = """
            SELECT SUM(base_price) as total 
            FROM events 
            WHERE event_date >= :start_date AND event_date < :end_date
        """
        rev_events = await database.fetch_one(query=revenue_events_query, values={"start_date": start_date, "end_date": end_date})
        total_revenue = rev_events["total"] or 0.0

        # Revenue from General Transactions (Income/Credit)
        revenue_general_query = """
            SELECT SUM(amount) as total 
            FROM transactions 
            WHERE type = 'Credit' AND date >= :start_date AND date < :end_date
        """
        rev_general = await database.fetch_one(query=revenue_general_query, values={"start_date": start_date, "end_date": end_date})
        total_revenue += (rev_general["total"] or 0.0)

        # 2. Total Expenses (Event Costs + Manual Debits)
        # Event Costs (linked to events in this month - simplistic approach, or use cost created_at if available)
        # Using event_date for simplicity as costs are usually incurred around the event
        expenses_events_query = """
            SELECT SUM(ec.amount) as total
            FROM event_costs ec
            JOIN events e ON ec.event_id = e.id
            WHERE e.event_date >= :start_date AND e.event_date < :end_date
        """
        exp_events = await database.fetch_one(query=expenses_events_query, values={"start_date": start_date, "end_date": end_date})
        total_expenses = exp_events["total"] or 0.0

        # General Expenses
        expenses_general_query = """
            SELECT SUM(amount) as total
            FROM transactions
            WHERE type = 'Debit' AND date >= :start_date AND date < :end_date
        """
        exp_general = await database.fetch_one(query=expenses_general_query, values={"start_date": start_date, "end_date": end_date})
        total_expenses += (exp_general["total"] or 0.0)

        # 3. Event Count
        count_query = "SELECT COUNT(*) as count FROM events WHERE event_date >= :start_date AND event_date < :end_date"
        count_res = await database.fetch_one(query=count_query, values={"start_date": start_date, "end_date": end_date})
        event_count = count_res["count"] or 0

        total_profit = total_revenue - total_expenses

        return {
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "total_profit": total_profit,
            "event_count": event_count
        }

    except Exception as e:
        print(f"Dashboard summary error: {e}")
        return {
            "total_revenue": 0,
            "total_expenses": 0,
            "total_profit": 0,
            "event_count": 0
        }

@router.get("/cameras")
async def get_camera_status(current_user: dict = Depends(get_current_active_user)):
    query = "SELECT * FROM cameras ORDER BY model_name"
    try:
        results = await database.fetch_all(query=query)
        # Ensure new fields are present in dict even if old rows
        cameras = []
        for r in results:
             c = dict(r)
             if 'max_shutter_life' not in c or c['max_shutter_life'] is None:
                 c['max_shutter_life'] = 150000
             cameras.append(c)
        return cameras
    except Exception:
        return []

@router.get("/charts")
async def get_dashboard_charts(current_user: dict = Depends(get_current_active_user)):
    # Calculate previous 6 months trend
    financial_trend = []
    
    today = date.today()
    for i in range(5, -1, -1):
        # Calculate month/year for this iteration
        # simple month subtraction logic
        m = today.month - i
        y = today.year
        if m <= 0:
            m += 12
            y -= 1
        
        start_date = f"{y}-{m:02d}-01"
        if m == 12:
            end_date = f"{y+1}-01-01"
        else:
            end_date = f"{y}-{m+1:02d}-01"
            
        month_name = date(y, m, 1).strftime("%b")
        
        # Query monthly stats (reusing logic from summary effectively)
        # Revenue
        rev_ev_query = "SELECT SUM(base_price) as total FROM events WHERE event_date >= :start AND event_date < :end"
        rev_gen_query = "SELECT SUM(amount) as total FROM transactions WHERE type = 'Credit' AND date >= :start AND date < :end"
        
        rev_ev = await database.fetch_one(query=rev_ev_query, values={"start": start_date, "end": end_date})
        rev_gen = await database.fetch_one(query=rev_gen_query, values={"start": start_date, "end": end_date})
        
        revenue = (rev_ev["total"] or 0) + (rev_gen["total"] or 0)
        
        # Expenses
        exp_ev_query = """
            SELECT SUM(ec.amount) as total FROM event_costs ec 
            JOIN events e ON ec.event_id = e.id 
            WHERE e.event_date >= :start AND e.event_date < :end
        """
        exp_gen_query = "SELECT SUM(amount) as total FROM transactions WHERE type = 'Debit' AND date >= :start AND date < :end"
        
        exp_ev = await database.fetch_one(query=exp_ev_query, values={"start": start_date, "end": end_date})
        exp_gen = await database.fetch_one(query=exp_gen_query, values={"start": start_date, "end": end_date})
        
        expenses = (exp_ev["total"] or 0) + (exp_gen["total"] or 0)
        
        financial_trend.append({
            "month": month_name,
            "revenue": revenue,
            "expenses": expenses
        })

    # Camera Health (Real Data)
    cameras = await get_camera_status(current_user)
    camera_health = []
    for cam in cameras:
        rated_life = cam.get("max_shutter_life") or 150000 
        usage = cam.get("current_shutter_count", 0)
        percentage = min(round((usage / rated_life) * 100, 1), 100)
        status = "Good"
        if percentage > 75: status = "Warning"
        if percentage > 90: status = "Critical"
        
        camera_health.append({
            "name": cam.get("model_name"),
            "usage": usage,
            "percentage": percentage,
            "status": status
        })

    return {
        "financial_trend": financial_trend,
        "camera_health": camera_health
    }
