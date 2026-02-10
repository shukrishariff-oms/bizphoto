from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from backend.auth import create_access_token, verify_password, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.database import database
from datetime import timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Fetch user from DB
    query = "SELECT * FROM users WHERE username = :username"
    user = await database.fetch_one(query=query, values={"username": form_data.username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # INCLUDE user_id IN TOKEN
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"], "id": str(user["id"])}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", status_code=201)
async def register_user(user: UserCreate):
    # Check if user exists
    query = "SELECT 1 FROM users WHERE username = :username OR email = :email"
    existing_user = await database.fetch_one(query=query, values={"username": user.username, "email": user.email})
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    if user.role not in ['admin', 'photographer']:
        raise HTTPException(status_code=400, detail="Invalid role")

    hashed_password = get_password_hash(user.password)
    
    # Import uuid here since it's needed for new user ID
    import uuid
    user_id = str(uuid.uuid4())
    
    query = """
    INSERT INTO users (id, username, email, password_hash, role)
    VALUES (:id, :username, :email, :password_hash, :role)
    """
    await database.execute(query=query, values={
        "id": user_id,
        "username": user.username,
        "email": user.email,
        "password_hash": hashed_password,
        "role": user.role
    })
    
from backend.auth import get_current_user

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
