# Business Photography System

## Prerequisites
- **Python 3.8+**
- **Node.js & npm**
- **PostgreSQL 14+** (Must be running on localhost:5432)

## Setup Instructions

### 1. Database Setup
1. Ensure PostgreSQL is installed and running.
2. Edit `.env` in the root directory if your database credentials differ from:
   ```
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=business_photography
   ```
3. Initialize the database:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python scripts/init_db.py
   ```

### 2. Backend Setup
Run the FastAPI server:
```bash
# In the root 'e:\Businees' folder
venv\Scripts\uvicorn backend.main:app --reload
```
API Documentation will be available at: http://localhost:8000/docs

### 3. Frontend Setup
Run the React application:
```bash
cd frontend
npm install
npm run dev
```
Access the application at: http://localhost:5173

## Troubleshooting
- **Database Connection Refused**: Ensure the PostgreSQL service is running and credentials in `.env` are correct.
- **Frontend API Errors**: Ensure the backend is running on port 8000.
