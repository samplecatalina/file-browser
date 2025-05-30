from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import os
import logging
import shutil # Added for recursive directory deletion
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()

# Get the absolute path to the data directory
BASE_DIR = Path(__file__).parent.parent / "data"
logger.debug(f"Base directory path: {BASE_DIR}")

class QuickAccessItem(BaseModel):
    path: str
    name: str
    pinned_at: datetime

class QuickAccessRequest(BaseModel):
    path: str

class CreateFolderRequest(BaseModel):
    current_path: str
    folder_name: str

# In-memory storage for quick access items (in production, use a database)
quick_access_items: List[QuickAccessItem] = []

def get_file_info(path: Path) -> dict:
    """Get detailed information about a file or directory."""
    stats = path.stat()
    return {
        "name": path.name,
        "path": str(path.relative_to(BASE_DIR)),
        "type": "directory" if path.is_dir() else "file",
        "size": stats.st_size if path.is_file() else None,
        "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
        "created": datetime.fromtimestamp(stats.st_ctime).isoformat(),
    }

@router.get("/files")
def list_files(
    path: str = "",
    sort_by: Optional[str] = Query(None, enum=["name", "modified", "size"]),
    order: Optional[str] = Query("asc", enum=["asc", "desc"])
) -> List[dict]:
    """List files and directories in the specified path."""
    try:
        logger.debug(f"Received path parameter: '{path}'")
        target = (BASE_DIR / path).resolve()
        logger.debug(f"Target path: {target}")
        logger.debug(f"Base dir exists: {BASE_DIR.exists()}")
        logger.debug(f"Target exists: {target.exists()}")
        logger.debug(f"Base dir: {BASE_DIR}")
        
        # Security check: ensure the target is within BASE_DIR
        if not target.exists():
            logger.error(f"Path does not exist: {target}")
            raise HTTPException(404, f"Path not found: {path}")
        
        if BASE_DIR not in target.parents and target != BASE_DIR:
            logger.error(f"Path outside base directory: {target}")
            raise HTTPException(404, "Path not found")
        
        items = []
        for child in target.iterdir():
            try:
                item = get_file_info(child)
                logger.debug(f"Processing item: {item['name']} with path: {item['path']}")
                
                if child.is_dir():
                    # Detect session project: folder containing a .session file
                    session_files = list(child.glob("*.session"))
                    item["session"] = len(session_files) > 0
                    if item["session"]:
                        item["session_info"] = {
                            "file_count": len(list(child.glob("**/*"))),
                            "session_file": session_files[0].name
                        }
                
                items.append(item)
            except Exception as e:
                logger.error(f"Error processing item {child}: {str(e)}")
                continue
        
        # Sort items if requested
        if sort_by:
            items.sort(
                key=lambda x: x.get(sort_by, ""),
                reverse=(order == "desc")
            )
        else:
            # Default sort: directories first, then files, both alphabetically
            items.sort(key=lambda x: (x["type"] != "directory", x["name"].lower()))
        
        logger.debug(f"Returning {len(items)} items")
        return items
    except Exception as e:
        logger.error(f"Unexpected error in list_files: {str(e)}")
        raise HTTPException(500, f"Internal server error: {str(e)}")

@router.get("/file-info")
def get_file_details(path: str) -> dict:
    """Get detailed information about a specific file or directory."""
    target = (BASE_DIR / path).resolve()
    
    if not target.exists() or BASE_DIR not in target.parents and target != BASE_DIR:
        raise HTTPException(404, "Path not found")
    
    return get_file_info(target)

@router.get("/quick-access")
def get_quick_access() -> List[QuickAccessItem]:
    """Get all quick access items."""
    return quick_access_items

@router.post("/quick-access")
def add_quick_access(request: QuickAccessRequest) -> QuickAccessItem:
    """Add a folder to quick access."""
    target = (BASE_DIR / request.path).resolve()
    
    if not target.exists() or not target.is_dir():
        raise HTTPException(404, "Directory not found")
    
    if BASE_DIR not in target.parents and target != BASE_DIR:
        raise HTTPException(404, "Path not found")
    
    # Check if already pinned
    for item in quick_access_items:
        if item.path == request.path:
            raise HTTPException(400, "Folder already pinned")
    
    item = QuickAccessItem(
        path=request.path,
        name=target.name,
        pinned_at=datetime.now()
    )
    quick_access_items.append(item)
    return item

@router.delete("/quick-access/{path:path}")
def remove_quick_access(path: str) -> dict:
    """Remove a folder from quick access."""
    for i, item in enumerate(quick_access_items):
        if item.path == path:
            quick_access_items.pop(i)
            return {"message": "Folder removed from quick access"}
    
    raise HTTPException(404, "Quick access item not found")

@router.post("/folders", status_code=201)
def create_folder_endpoint(request: CreateFolderRequest):
    """Create a new folder in the specified path."""
    logger.debug(f"Attempting to create folder '{request.folder_name}' in path '{request.current_path}'")
    
    # Validate folder name (basic validation)
    if not request.folder_name or "/" in request.folder_name or "\\" in request.folder_name:
        logger.error(f"Invalid folder name: {request.folder_name}")
        raise HTTPException(status_code=400, detail="Invalid folder name. Cannot contain slashes.")

    base_target_path = (BASE_DIR / request.current_path).resolve()
    logger.debug(f"Base target path for new folder: {base_target_path}")

    # Security check: ensure the base_target_path is within BASE_DIR
    if not base_target_path.exists() or (BASE_DIR not in base_target_path.parents and base_target_path != BASE_DIR):
        logger.error(f"Base path does not exist or is outside data directory: {base_target_path}")
        raise HTTPException(status_code=404, detail="Base path not found or invalid.")

    new_folder_path = (base_target_path / request.folder_name).resolve()
    logger.debug(f"Full path for new folder: {new_folder_path}")

    if new_folder_path.exists():
        logger.warning(f"Folder '{request.folder_name}' already exists at {base_target_path}")
        raise HTTPException(status_code=409, detail=f"Folder '{request.folder_name}' already exists.")
    
    try:
        new_folder_path.mkdir(parents=False, exist_ok=False) # parents=False to avoid creating intermediate dirs, exist_ok=False to ensure it's new
        logger.info(f"Successfully created folder: {new_folder_path}")
        return {"message": "Folder created successfully", "path": str(new_folder_path.relative_to(BASE_DIR))}
    except Exception as e:
        logger.error(f"Error creating folder {new_folder_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not create folder: {str(e)}")

@router.delete("/items")
def delete_item_endpoint(path_to_delete: str = Query(..., alias="path")):
    """Delete a file or directory at the specified path."""
    logger.debug(f"Attempting to delete item at path: '{path_to_delete}'")

    if not path_to_delete: # Should be caught by Query(...) but good to double check
        logger.error("Path to delete cannot be empty.")
        raise HTTPException(status_code=400, detail="Path cannot be empty.")

    target_path = (BASE_DIR / path_to_delete).resolve()
    logger.debug(f"Full target path for deletion: {target_path}")

    # Security check: ensure the target_path is within BASE_DIR and not BASE_DIR itself
    if not target_path.exists():
        logger.error(f"Item to delete does not exist: {target_path}")
        raise HTTPException(status_code=404, detail="Item not found.")
    
    if BASE_DIR not in target_path.parents or target_path == BASE_DIR:
        logger.error(f"Attempt to delete outside base directory or base directory itself: {target_path}")
        raise HTTPException(status_code=403, detail="Deletion forbidden at this path.")

    try:
        if target_path.is_dir():
            shutil.rmtree(target_path)
            logger.info(f"Successfully deleted directory: {target_path}")
            return {"message": f"Directory '{target_path.name}' deleted successfully."}
        elif target_path.is_file():
            target_path.unlink()
            logger.info(f"Successfully deleted file: {target_path}")
            return {"message": f"File '{target_path.name}' deleted successfully."}
        else:
            # Should not happen if .exists() is true and it's not dir/file (e.g. symlink not followed)
            logger.error(f"Target is neither a file nor a directory: {target_path}")
            raise HTTPException(status_code=500, detail="Item type not supported for deletion.")

    except Exception as e:
        logger.error(f"Error deleting item {target_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not delete item: {str(e)}") 