import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.read_log import read_sonar_file

router = APIRouter(prefix="/api/v1/sonar", tags=["Sonar File Upload"])

@router.post("/upload")
async def upload_sonar_file(file: UploadFile = File(...)):
    """
    Upload an XTF or JSF sonar file to extract its metadata and navigation ping data.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".xtf", ".jsf"]:
        raise HTTPException(status_code=400, detail="Only .xtf and .jsf files are supported")

    # Create a temporary file to save the upload
    fd, temp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    
    try:
        # Save the uploaded file to disk
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse the sonar file using B1's parser
        result = read_sonar_file(temp_path)
        
        if result.status == "ERROR":
            raise HTTPException(status_code=400, detail=f"Failed to parse file: {', '.join(result.errors)}")
            
        return {
            "filename": file.filename,
            "status": result.status,
            "metadata_summary": result.summary()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up the temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
