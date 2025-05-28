from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()

# Get the absolute path to the data directory
BASE_DIR = Path(__file__).parent.parent / "data"
logger.debug(f"Base directory path: {BASE_DIR}")

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
    target = (BASE_DIR / path).resolve()
    logger.debug(f"Target path: {target}")
    logger.debug(f"Base dir exists: {BASE_DIR.exists()}")
    logger.debug(f"Target exists: {target.exists()}")
    
    # Security check: ensure the target is within BASE_DIR
    if not target.exists():
        logger.error(f"Path does not exist: {target}")
        raise HTTPException(404, f"Path not found: {path}")
    
    if BASE_DIR not in target.parents and target != BASE_DIR:
        logger.error(f"Path outside base directory: {target}")
        raise HTTPException(404, "Path not found")
    
    items = []
    for child in target.iterdir():
        item = get_file_info(child)
        
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
    
    # Sort items if requested
    if sort_by:
        items.sort(
            key=lambda x: x.get(sort_by, ""),
            reverse=(order == "desc")
        )
    else:
        # Default sort: directories first, then files, both alphabetically
        items.sort(key=lambda x: (x["type"] != "directory", x["name"].lower()))
    
    return items

@router.get("/file-info")
def get_file_details(path: str) -> dict:
    """Get detailed information about a specific file or directory."""
    target = (BASE_DIR / path).resolve()
    
    if not target.exists() or BASE_DIR not in target.parents and target != BASE_DIR:
        raise HTTPException(404, "Path not found")
    
    return get_file_info(target) 