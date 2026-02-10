import os
from dotenv import load_dotenv

load_dotenv()

# Project Root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Upload Configuration
if os.path.exists("/app/data"):
    UPLOAD_DIR = "/app/data/uploads"
else:
    UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Gallery specific paths
GALLERY_DIR = os.path.join(UPLOAD_DIR, "gallery")
os.makedirs(GALLERY_DIR, exist_ok=True)

# ToyyibPay Configuration
TOYYIBPAY_SECRET = os.getenv("TOYYIBPAY_SECRET", "")
TOYYIBPAY_CATEGORY = os.getenv("TOYYIBPAY_CATEGORY", "")
TOYYIBPAY_URL = os.getenv("TOYYIBPAY_URL", "https://toyyibpay.com") # dev: https://dev.toyyibpay.com
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000") # Your public domain
