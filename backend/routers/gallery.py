from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
import uuid
import os
import shutil
from backend.database import database
from backend.auth import get_current_user
from backend.utils.watermark import apply_watermark
from backend.config import GALLERY_DIR
from backend.utils.ocr import detect_bib_numbers

router = APIRouter(prefix="/gallery", tags=["Gallery"])

UPLOAD_ROOT = GALLERY_DIR

@router.post("/albums")
async def create_album(name: str = Form(...), description: str = Form(None), package_price: float = Form(0.0), current_user: dict = Depends(get_current_user)):
    album_id = str(uuid.uuid4())
    query = "INSERT INTO albums (id, name, description, user_id, package_price) VALUES (:id, :name, :description, :user_id, :pp)"
    values = {"id": album_id, "name": name, "description": description, "user_id": current_user["id"], "pp": package_price}
    await database.execute(query=query, values=values)
    return {"id": album_id, "name": name}

@router.put("/albums/{album_id}")
async def update_album(
    album_id: str,
    name: str = Form(...),
    description: str = Form(None),
    package_price: float = Form(0.0),
    current_user: dict = Depends(get_current_user)
):
    # Ownership check
    album = await database.fetch_one("SELECT * FROM albums WHERE id = :id AND user_id = :uid", {"id": album_id, "uid": current_user["id"]})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    query = "UPDATE albums SET name = :name, description = :desc, package_price = :pp WHERE id = :id"
    await database.execute(query=query, values={"name": name, "desc": description, "pp": package_price, "id": album_id})
    return {"status": "success", "message": "Album updated"}

@router.get("/albums")
async def list_albums(current_user: dict = Depends(get_current_user)):
    query = """
        SELECT a.*, COUNT(p.id) as photo_count 
        FROM albums a 
        LEFT JOIN photos p ON a.id = p.album_id 
        WHERE a.user_id = :user_id 
        GROUP BY a.id 
        ORDER BY a.created_at DESC
    """
    return await database.fetch_all(query=query, values={"user_id": current_user["id"]})

@router.post("/albums/{album_id}/photos")
async def upload_photo(
    album_id: str, 
    background_tasks: BackgroundTasks,
    price: float = Form(0.0), 
    file: UploadFile = File(...), 
    current_user: dict = Depends(get_current_user)
):
    # Check album ownership
    album = await database.fetch_one("SELECT * FROM albums WHERE id = :id AND user_id = :uid", {"id": album_id, "uid": current_user["id"]})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    photo_id = str(uuid.uuid4())
    # Keep original extension for internal use, but watermarked is always .jpg for web
    orig_ext = os.path.splitext(file.filename)[1].lower()
    filename = f"{photo_id}{orig_ext}"
    wm_filename = f"{photo_id}.jpg"
    
    # Paths
    album_dir = os.path.join(UPLOAD_ROOT, album_id)
    orig_dir = os.path.join(album_dir, "original")
    wm_dir = os.path.join(album_dir, "watermarked")
    os.makedirs(orig_dir, exist_ok=True)
    os.makedirs(wm_dir, exist_ok=True)
    
    orig_path = os.path.join(orig_dir, filename)
    wm_path = os.path.join(wm_dir, wm_filename)
    
    # Save original
    with open(orig_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Apply watermark
    success = apply_watermark(orig_path, wm_path)
    if not success:
        # Fallback: if watermark fails, copy original as wm (better than broken image)
        shutil.copy(orig_path, wm_path)
        print(f"Warning: Watermark failed for {photo_id}, using original.")
    
    # Save to DB
    query = """
        INSERT INTO photos (id, album_id, filename, original_path, watermarked_path, price)
        VALUES (:id, :album_id, :filename, :orig, :wm, :price)
    """
    values = {
        "id": photo_id,
        "album_id": album_id,
        "filename": wm_filename, # Use .jpg filename for frontend
        "orig": orig_path,
        "wm": wm_path,
        "price": price
    }
    await database.execute(query=query, values=values)
    
    # Trigger OCR in background
    background_tasks.add_task(process_photo_ocr, photo_id, orig_path)
    
    print(f"DEBUG: Photo {photo_id} inserted into DB for album {album_id}")
    return {"id": photo_id, "status": "uploaded"}

async def process_photo_ocr(photo_id: str, image_path: str):
    try:
        bibs = detect_bib_numbers(image_path)
        if bibs:
            query = "UPDATE photos SET bib_number = :bibs WHERE id = :id"
            await database.execute(query=query, values={"bibs": bibs, "id": photo_id})
    except Exception as e:
        print(f"OCR Error for photo {photo_id}: {e}")

@router.get("/albums/{album_id}/photos")
async def get_photos(album_id: str):
    query = "SELECT id, album_id, filename, watermarked_path, price FROM photos WHERE album_id = :album_id"
    results = await database.fetch_all(query=query, values={"album_id": album_id})
    print(f"DEBUG: Fetched {len(results)} photos for album {album_id}")
    return results

import httpx
from backend.config import TOYYIBPAY_SECRET, TOYYIBPAY_CATEGORY, TOYYIBPAY_URL, BASE_URL

@router.post("/checkout/{photo_id}")
async def checkout_photo(photo_id: str):
    # Fetch photo details
    photo = await database.fetch_one("SELECT * FROM photos WHERE id = :id", {"id": photo_id})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Generate Unique Order ID
    order_id = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    
    # ToyyibPay Payload
    payload = {
        'userSecretKey': TOYYIBPAY_SECRET,
        'categoryCode': TOYYIBPAY_CATEGORY,
        'billName': f"Photo Purchase: {photo['filename']}",
        'billDescription': f"Purchase of high-resolution digital image {photo['filename']}",
        'billPriceSetting': 1,
        'billPayorInfo': 1,
        'billAmount': int(photo['price'] * 100), # ToyyibPay uses cents
        'billReturnUrl': f"{BASE_URL}/payment-success?id={photo_id}",
        'billCallbackUrl': f"{BASE_URL}/api/gallery/webhook",
        'billExternalReferenceNo': order_id,
        'billTo': 'Customer',
        'billEmail': 'customer@example.com',
        'billPhone': '0123456789',
        'billSplitPayment': 0,
        'billSplitPaymentArgs': '',
        'billPaymentChannel': '0', # FPX
        'billContentHtml': '',
        'billChargeToCustomer': 1
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{TOYYIBPAY_URL}/index.php/api/createBill", data=payload)
        res_data = response.json()
        
        if isinstance(res_data, list) and len(res_data) > 0:
            bill_code = res_data[0].get('BillCode')
            return {"payment_url": f"{TOYYIBPAY_URL}/{bill_code}"}
        
    raise HTTPException(status_code=500, detail="Failed to create payment bill")

@router.get("/albums/{album_id}/tiers")
async def get_album_tiers(album_id: str):
    return await database.fetch_all("SELECT * FROM album_pricing_tiers WHERE album_id = :aid ORDER BY quantity ASC", {"aid": album_id})

@router.post("/albums/{album_id}/tiers")
async def add_pricing_tier(album_id: str, quantity: int = Form(...), price: float = Form(...), current_user: dict = Depends(get_current_user)):
    album = await database.fetch_one("SELECT * FROM albums WHERE id = :id AND user_id = :uid", {"id": album_id, "uid": current_user["id"]})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
        
    tier_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO album_pricing_tiers (id, album_id, quantity, price) VALUES (:id, :aid, :q, :p)",
        {"id": tier_id, "aid": album_id, "q": quantity, "p": price}
    )
    return {"id": tier_id, "quantity": quantity, "price": price}

@router.delete("/tiers/{tier_id}")
async def delete_pricing_tier(tier_id: str, current_user: dict = Depends(get_current_user)):
    tier = await database.fetch_one("""
        SELECT t.* FROM album_pricing_tiers t
        JOIN albums a ON t.album_id = a.id
        WHERE t.id = :tid AND a.user_id = :uid
    """, {"tid": tier_id, "uid": current_user["id"]})
    
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found or unauthorized")
        
    await database.execute("DELETE FROM album_pricing_tiers WHERE id = :id", {"id": tier_id})
    return {"status": "success"}

@router.post("/checkout-photos")
async def checkout_photos(photo_ids: List[str]):
    if not photo_ids:
        raise HTTPException(status_code=400, detail="No photos selected")
    
    # Using specific syntax for IN clause to avoid parameter limit issues if needed, but for few photos it's fine
    query = "SELECT * FROM photos WHERE id IN (" + ",".join([f"'{pid}'" for pid in photo_ids]) + ")"
    photos = await database.fetch_all(query)
    
    if not photos:
        raise HTTPException(status_code=404, detail="Photos not found")
        
    album_id = photos[0]['album_id']
    count = len(photos)
    
    tiers = await database.fetch_all("SELECT * FROM album_pricing_tiers WHERE album_id = :aid ORDER BY quantity DESC", {"aid": album_id})
    
    total_price = 0.0
    remaining_count = count
    
    for tier in tiers:
        if remaining_count >= tier['quantity']:
            num_packages = remaining_count // tier['quantity']
            total_price += num_packages * tier['price']
            remaining_count %= tier['quantity']
            
    if remaining_count > 0:
        for i in range(count - remaining_count, count):
             total_price += photos[i]['price']
             
    order_id = f"MUL-{uuid.uuid4().hex[:8].upper()}"
    
    payload = {
        'userSecretKey': TOYYIBPAY_SECRET,
        'categoryCode': TOYYIBPAY_CATEGORY,
        'billName': f"Photos Purchase ({count} items)",
        'billDescription': f"Purchase of {count} digital images",
        'billPriceSetting': 1,
        'billPayorInfo': 1,
        'billAmount': int(total_price * 100),
        'billReturnUrl': f"{BASE_URL}/payment-success?multiple=true",
        'billCallbackUrl': f"{BASE_URL}/api/gallery/webhook",
        'billExternalReferenceNo': order_id,
        'billTo': 'Customer',
        'billEmail': 'customer@example.com',
        'billPhone': '0123456789',
        'billSplitPayment': 0,
        'billSplitPaymentArgs': '',
        'billPaymentChannel': '0',
        'billChargeToCustomer': 1
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{TOYYIBPAY_URL}/index.php/api/createBill", data=payload)
        res_data = response.json()
        
        if isinstance(res_data, list) and len(res_data) > 0:
            bill_code = res_data[0].get('BillCode')
            return {"payment_url": f"{TOYYIBPAY_URL}/{bill_code}", "total_price": total_price}
            
    raise HTTPException(status_code=500, detail="Failed to create payment bill")

@router.post("/checkout-album/{album_id}")
async def checkout_album(album_id: str):
    # Fetch album details
    album = await database.fetch_one("SELECT * FROM albums WHERE id = :id", {"id": album_id})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if album['package_price'] <= 0:
        raise HTTPException(status_code=400, detail="Album does not have a package price set")
    
    # Generate Unique Order ID
    order_id = f"PKG-{uuid.uuid4().hex[:8].upper()}"
    
    # ToyyibPay Payload
    payload = {
        'userSecretKey': TOYYIBPAY_SECRET,
        'categoryCode': TOYYIBPAY_CATEGORY,
        'billName': f"Bundle Purchase: {album['name']}",
        'billDescription': f"Purchase of all digital images in album {album['name']}",
        'billPriceSetting': 1,
        'billPayorInfo': 1,
        'billAmount': int(album['package_price'] * 100), # ToyyibPay uses cents
        'billReturnUrl': f"{BASE_URL}/payment-success?album_id={album_id}",
        'billCallbackUrl': f"{BASE_URL}/api/gallery/webhook",
        'billExternalReferenceNo': order_id,
        'billTo': 'Customer',
        'billEmail': 'customer@example.com',
        'billPhone': '0123456789',
        'billSplitPayment': 0,
        'billSplitPaymentArgs': '',
        'billPaymentChannel': '0', # FPX
        'billContentHtml': '',
        'billChargeToCustomer': 1
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{TOYYIBPAY_URL}/index.php/api/createBill", data=payload)
        res_data = response.json()
        
        if isinstance(res_data, list) and len(res_data) > 0:
            bill_code = res_data[0].get('BillCode')
            return {"payment_url": f"{TOYYIBPAY_URL}/{bill_code}"}
        
    raise HTTPException(status_code=500, detail="Failed to create payment bill")

@router.post("/webhook")
async def toyyibpay_webhook(status: str = Form(...), billcode: str = Form(...), order_id: str = Form(...)):
    # ToyyibPay sends status=1 for success
    if status == '1':
        # Logic to mark photo as 'purchased' or send download link
        # For a simple implementation, we can log it or update a 'orders' table
        print(f"Payment successful for Order: {order_id}, Bill: {billcode}")
        return "OK"
    return "FAILED"
@router.post("/photos/bulk-delete")
async def bulk_delete_photos(photo_ids: List[str], current_user: dict = Depends(get_current_user)):
    if not photo_ids:
        return {"status": "no_photos_provided", "count": 0}

    # Verify ownership and fetch paths
    placeholders = ", ".join([f":id{i}" for i in range(len(photo_ids))])
    query = f"""
        SELECT p.* FROM photos p
        JOIN albums a ON p.album_id = a.id
        WHERE p.id IN ({placeholders}) AND a.user_id = :user_id
    """
    values = {f"id{i}": pid for i, pid in enumerate(photo_ids)}
    values["user_id"] = current_user["id"]
    
    photos_to_delete = await database.fetch_all(query=query, values=values)
    
    deleted_count = 0
    for photo in photos_to_delete:
        # Delete physical files
        try:
            if photo["original_path"] and os.path.exists(photo["original_path"]):
                os.remove(photo["original_path"])
            if photo["watermarked_path"] and os.path.exists(photo["watermarked_path"]):
                os.remove(photo["watermarked_path"])
        except Exception as e:
            print(f"Error deleting file for photo {photo['id']}: {e}")
            
        # Delete from DB
        await database.execute("DELETE FROM photos WHERE id = :id", {"id": photo["id"]})
        deleted_count += 1
        
    return {"status": "success", "deleted_count": deleted_count}

@router.delete("/albums/{album_id}")
async def delete_album(album_id: str, current_user: dict = Depends(get_current_user)):
    # Ownership check
    album = await database.fetch_one("SELECT * FROM albums WHERE id = :id AND user_id = :uid", {"id": album_id, "uid": current_user["id"]})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
        
    # Get all photos to delete files
    photos = await database.fetch_all("SELECT * FROM photos WHERE album_id = :album_id", {"album_id": album_id})
    
    for photo in photos:
        try:
            if photo["original_path"] and os.path.exists(photo["original_path"]):
                os.remove(photo["original_path"])
            if photo["watermarked_path"] and os.path.exists(photo["watermarked_path"]):
                os.remove(photo["watermarked_path"])
        except Exception as e:
            print(f"Error deleting physical file for photo {photo['id']} during album deletion: {e}")
            
    # Delete the entire album directory
    album_dir = os.path.join(UPLOAD_ROOT, album_id)
    if os.path.exists(album_dir):
        try:
            shutil.rmtree(album_dir)
        except Exception as e:
            print(f"Error deleting album directory {album_dir}: {e}")
        
    # Delete from DB (Foreign Key ON DELETE CASCADE in db_init should handle photos table)
    await database.execute("DELETE FROM albums WHERE id = :id", {"id": album_id})
    
    return {"status": "success", "message": "Album and its photos deleted"}
