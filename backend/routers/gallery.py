from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
import uuid
import os
import shutil
from backend.database import database
from backend.auth import get_current_user
from backend.utils.watermark import apply_watermark

router = APIRouter(tags=["Gallery"])

UPLOAD_ROOT = "uploads/gallery"

@router.post("/albums")
async def create_album(name: str = Form(...), description: str = Form(None), current_user: dict = Depends(get_current_user)):
    album_id = str(uuid.uuid4())
    query = "INSERT INTO albums (id, name, description, user_id) VALUES (:id, :name, :description, :user_id)"
    values = {"id": album_id, "name": name, "description": description, "user_id": current_user["id"]}
    await database.execute(query=query, values=values)
    return {"id": album_id, "name": name}

@router.get("/albums")
async def list_albums(current_user: dict = Depends(get_current_user)):
    query = "SELECT * FROM albums WHERE user_id = :user_id ORDER BY created_at DESC"
    return await database.fetch_all(query=query, values={"user_id": current_user["id"]})

@router.post("/albums/{album_id}/photos")
async def upload_photo(album_id: str, price: float = Form(0.0), file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Check album ownership
    album = await database.fetch_one("SELECT * FROM albums WHERE id = :id AND user_id = :uid", {"id": album_id, "uid": current_user["id"]})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    photo_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    filename = f"{photo_id}{ext}"
    
    # Paths
    album_dir = os.path.join(UPLOAD_ROOT, album_id)
    orig_dir = os.path.join(album_dir, "original")
    wm_dir = os.path.join(album_dir, "watermarked")
    os.makedirs(orig_dir, exist_ok=True)
    os.makedirs(wm_dir, exist_ok=True)
    
    orig_path = os.path.join(orig_dir, filename)
    wm_path = os.path.join(wm_dir, filename)
    
    # Save original
    with open(orig_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Apply watermark
    apply_watermark(orig_path, wm_path)
    
    # Save to DB
    query = """
        INSERT INTO photos (id, album_id, filename, original_path, watermarked_path, price)
        VALUES (:id, :album_id, :filename, :orig, :wm, :price)
    """
    values = {
        "id": photo_id,
        "album_id": album_id,
        "filename": filename,
        "orig": orig_path,
        "wm": wm_path,
        "price": price
    }
    await database.execute(query=query, values=values)
    
    return {"id": photo_id, "status": "uploaded"}

@router.get("/albums/{album_id}/photos")
async def get_photos(album_id: str):
    query = "SELECT id, album_id, filename, watermarked_path, price FROM photos WHERE album_id = :album_id"
    return await database.fetch_all(query=query, values={"album_id": album_id})
