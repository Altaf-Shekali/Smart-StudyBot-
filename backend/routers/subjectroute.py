from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import os

router = APIRouter()

# Corrected base path
VECTOR_STORE_DIR = "vector_store"

@router.get("/get-subjects")
def get_subjects(branch: str, year: str, semester: str):
    try:
        # Build the correct path
        base_path = os.path.join(VECTOR_STORE_DIR, branch.lower(), year, semester)
        print(f"Looking in path: {base_path}")

        if not os.path.exists(base_path):
            return JSONResponse(status_code=404, content={"message": "Path not found"})

        subjects = [
            name for name in os.listdir(base_path)
            if os.path.isdir(os.path.join(base_path, name))
        ]
        return {"subjects": subjects}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})
