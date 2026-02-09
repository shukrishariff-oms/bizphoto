import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

try:
    from backend.routers import expenses
    print("Successfully imported expenses.py")
except Exception as e:
    print(f"Error importing expenses.py: {e}")
except SyntaxError as e:
    print(f"Syntax Error in expenses.py: {e}")
