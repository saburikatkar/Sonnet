import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.read_log import read_sonar_file

router = APIRouter(prefix="/api/v1/sonar", tags=["Sonar File Upload"])

@router.post("/upload")
def upload_sonar_file(file: UploadFile = File(...)):
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

        if os.path.getsize(temp_path) == 0:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "EMPTY_FILE",
                    "message": "The uploaded file is empty."
                }
            )

        # Parse the sonar file using B1's parser
        try:
            result = read_sonar_file(temp_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail={"code": "CORRUPTED_FILE", "message": f"Failed to parse file: {str(e)}"})
        
        if result.status == "ERROR":
            raise HTTPException(status_code=400, detail={"code": "CORRUPTED_FILE", "message": f"Failed to parse file: {', '.join(result.errors)}"})
            
        return {
            "filename": file.filename,
            "status": result.status,
            "metadata_summary": result.summary()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Corrupted or unreadable sonar file: {str(e)}")
    finally:
        # Clean up the temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

from fastapi.responses import StreamingResponse
import io
from backend.image_generator import SonarImageGenerator

@router.post("/render-image")
def render_sonar_image(file: UploadFile = File(...)):
    """
    Upload a sonar file and immediately receive the generated waterfall image (PNG).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".xtf", ".jsf"]:
        raise HTTPException(status_code=400, detail="Only .xtf and .jsf files are supported")

    fd, temp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if os.path.getsize(temp_path) == 0:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "EMPTY_FILE",
                    "message": "The uploaded file is empty."
                }
            )

        try:
            result = read_sonar_file(temp_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail={"code": "CORRUPTED_FILE", "message": f"Failed to parse file: {str(e)}"})
            
        if result.status == "ERROR":
            raise HTTPException(status_code=400, detail={"code": "CORRUPTED_FILE", "message": f"Failed to parse file: {', '.join(result.errors)}"})
            
        # Generate the image
        img = SonarImageGenerator.generate_waterfall(result)
        
        # Save to a bytes buffer
        img_io = io.BytesIO()
        img.save(img_io, format="PNG")
        img_io.seek(0)
        
        return StreamingResponse(img_io, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Corrupted or unreadable sonar file: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)



