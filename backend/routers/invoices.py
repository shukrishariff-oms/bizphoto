from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date, datetime
from backend.database import database
from backend.auth import get_current_active_user
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

router = APIRouter(
    prefix="/invoices",
    tags=["invoices"]
)

# --- Pydantic Models ---
class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    amount: float

class InvoiceCreate(BaseModel):
    client_id: UUID
    event_id: Optional[UUID] = None
    invoice_number: str
    issued_date: date
    due_date: date
    notes: Optional[str] = None
    items: List[InvoiceItemCreate] = []

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[date] = None

# --- Endpoints ---

@router.post("/", response_model=dict)
async def create_invoice(invoice: InvoiceCreate, current_user: dict = Depends(get_current_active_user)):
    """
    Create a new invoice with items.
    """
    user_id = current_user["id"]
    invoice_id = str(uuid4())
    created_at = datetime.now()
    
    # Calculate total
    total_amount = sum(item.amount for item in invoice.items)
    
    # 1. Insert Invoice
    query_invoice = """
    INSERT INTO invoices (id, client_id, event_id, invoice_number, status, issued_date, due_date, total_amount, notes, created_at, user_id)
    VALUES (:id, :client_id, :event_id, :invoice_number, 'DRAFT', :issued_date, :due_date, :total_amount, :notes, :created_at, :user_id)
    """
    values_invoice = {
        "id": invoice_id,
        "client_id": str(invoice.client_id),
        "event_id": str(invoice.event_id) if invoice.event_id else None,
        "invoice_number": invoice.invoice_number,
        "issued_date": invoice.issued_date,
        "due_date": invoice.due_date,
        "total_amount": total_amount,
        "notes": invoice.notes,
        "created_at": created_at,
        "user_id": user_id
    }
    
    try:
        await database.execute(query=query_invoice, values=values_invoice)
        
        # 2. Insert Items (Items linked to Invoice, so implicit ownership)
        if invoice.items:
            query_item = """
            INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount)
            VALUES (:id, :invoice_id, :description, :quantity, :unit_price, :amount)
            """
            for item in invoice.items:
                await database.execute(query=query_item, values={
                    "id": str(uuid4()),
                    "invoice_id": invoice_id,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "amount": item.amount
                })
                
        return {"id": invoice_id, "message": "Invoice created successfully"}
    except Exception as e:
        print(f"Error creating invoice: {e}")
        raise HTTPException(status_code=500, detail="Failed to create invoice")

@router.get("/")
async def list_invoices(current_user: dict = Depends(get_current_active_user)):
    """
    List all invoices with client names.
    """
    user_id = current_user["id"]
    query = """
    SELECT i.*, c.name as client_name 
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.user_id = :user_id
    ORDER BY i.created_at DESC
    """
    try:
        results = await database.fetch_all(query=query, values={"user_id": user_id})
        return [dict(r) for r in results]
    except Exception as e:
        print(f"Error listing invoices: {e}")
        return []

@router.get("/{invoice_id}")
async def get_invoice(invoice_id: UUID, current_user: dict = Depends(get_current_active_user)):
    """
    Get invoice details including items and client info.
    """
    user_id = current_user["id"]
    # 1. Get Invoice & Client
    query_invoice = """
    SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_address
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = :id AND i.user_id = :user_id
    """
    invoice = await database.fetch_one(query=query_invoice, values={"id": str(invoice_id), "user_id": user_id})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    # 2. Get Items
    query_items = "SELECT * FROM invoice_items WHERE invoice_id = :invoice_id"
    items = await database.fetch_all(query=query_items, values={"invoice_id": str(invoice_id)})
    
    return {
        "invoice": dict(invoice),
        "items": [dict(item) for item in items]
    }

@router.put("/{invoice_id}")
async def update_invoice(invoice_id: UUID, invoice: InvoiceUpdate, current_user: dict = Depends(get_current_active_user)):
    """
    Update invoice status or details.
    """
    user_id = current_user["id"]
    
    # Check ownership
    check_query = "SELECT 1 FROM invoices WHERE id = :id AND user_id = :user_id"
    exists = await database.fetch_one(query=check_query, values={"id": str(invoice_id), "user_id": user_id})
    if not exists:
         raise HTTPException(status_code=404, detail="Invoice not found")
         
    update_data = invoice.model_dump(exclude_unset=True)
    if not update_data:
        return {"message": "No changes provided"}

    set_clause = ", ".join([f"{key} = :{key}" for key in update_data.keys()])
    query = f"UPDATE invoices SET {set_clause} WHERE id = :id" # Checking via exists above, but safe to add user_id too
    values = {**update_data, "id": str(invoice_id)}

    try:
        await database.execute(query=query, values=values)
        return {"message": "Invoice updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update invoice")

@router.get("/{invoice_id}/pdf")
async def generate_invoice_pdf(invoice_id: UUID):
    """
    Generate PDF for the invoice. Public access via ID, or restricted?
    For SaaS, PDF generation via link often public if UUID is unguessable, or requires auth.
    Let's require no auth for now for "click to download" simplicity, or maybe auth?
    The user asked for public link feature earlier.
    But this endpoint is likely called from within the app.
    Let's keep it public for simplicity if UUID is known.
    BUT filtering by user_id would break public links if we enforced it.
    So we leave user_id check OUT for PDF generation to allow sharing links, 
    but validation is implicit by knowing the UUID.
    """
    # Fetch Data
    query_invoice = """
    SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = :id
    """
    invoice = await database.fetch_one(query=query_invoice, values={"id": str(invoice_id)})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    query_items = "SELECT * FROM invoice_items WHERE invoice_id = :invoice_id"
    items = await database.fetch_all(query=query_items, values={"invoice_id": str(invoice_id)})
    
    # Generate PDF (Standard ReportLab code)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Header
    elements.append(Paragraph("INVOICE", styles['Title']))
    elements.append(Spacer(1, 12))
    
    # Info
    elements.append(Paragraph(f"<b>Invoice #:</b> {invoice['invoice_number']}", styles['Normal']))
    elements.append(Paragraph(f"<b>Date:</b> {invoice['issued_date']}", styles['Normal']))
    elements.append(Paragraph(f"<b>Client:</b> {invoice['client_name']}", styles['Normal']))
    elements.append(Spacer(1, 24))
    
    # Table Data
    data = [['Description', 'Qty', 'Unit Price', 'Amount']]
    for item in items:
        data.append([
            item['description'],
            str(item['quantity']),
            f"RM {item['unit_price']:.2f}",
            f"RM {item['amount']:.2f}"
        ])
    
    # Total
    data.append(['', '', 'Total:', f"RM {invoice['total_amount']:.2f}"])
    
    # Table Style
    table = Table(data, colWidths=[300, 50, 100, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    
    # Footer Notes
    if invoice['notes']:
        elements.append(Spacer(1, 24))
        elements.append(Paragraph(f"Notes: {invoice['notes']}", styles['Normal']))
        
    doc.build(elements)
    
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=invoice_{invoice['invoice_number']}.pdf"})
