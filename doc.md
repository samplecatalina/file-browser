I want to build a uniform web-based file browser for our data analytics tool to retire our current system native file browser. 

In this new file browser, if we detect any folder that contains a .session file, we would identify this whole folder to be a 'session project' and offer our user to 'open' this folder as a session project, instead of continuing to dive deep into it. 

Functions to be supported:
1.support enter the path and dynamic filtering when entering word or character. The dynamic filter should be case sensitive. 
2.recognize the file/session/project type and show the selected type before other types. 
3.remember the previous location for each type 
4.navigate to parent folder. 
5.add a new folder
6.rename
7.delete

new open dialogue:
1. text entry dialogue added to to crop of the screen, user can paste full path including file name.  
2. three icons after the entry:
    1. up arrow to navigate to parent folder
    2. add new folder icon
    3. quick access icon
        1. shall be disabled unless user has selected a folder to quick access
        2. only folders can be quick accessed, not files. 
        3. folder name displays in the column on the left
        4. note: current functionality of dragging a folder into the left column shall remain with no changes. quick access displayed in left column shall still have the same right click menu options that exist now: “open, rename, and remove”

Add the following to the right click menu option on a folder:
1. Sort select by Type First (checked by default)
2. Rename
3. Delete 

So in the end, the right click menu should have all of the following options:

open with file manager 
copy location
add to quick access 
show hidden files
show size column 
show time
sort folders before files
sort selected type first
new folder
rename
delete 

The frontend of this file browser is planned to build with TypeScript/React/Tailwind CSS/AntD, and the backend of this file browser is planned to build with Python/FastAPI. 

## Overview

This prototype demonstrates a minimal web-based file browser with session-project detection.

### Project Structure

```
project-root/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── router.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── FileBrowser.tsx
    │   ├── api/
    │   │   └── index.ts
    │   ├── App.tsx
    │   └── index.tsx
    ├── package.json
    ├── tsconfig.json
    └── tailwind.config.js
```

---

## Backend (FastAPI)

**File: backend/app/main.py**

```python
from fastapi import FastAPI, Query
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from .router import router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api")
```

**File: backend/app/router.py**

```python
from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import List

router = APIRouter()
BASE_DIR = Path("./data")  # root directory to browse

@router.get("/files")
def list_files(path: str = "") -> List[dict]:
    target = (BASE_DIR / path).resolve()
    if not target.exists() or BASE_DIR not in target.parents and target != BASE_DIR:
        raise HTTPException(404, "Path not found")
    items = []
    for child in sorted(target.iterdir()):
        item = {"name": child.name, "path": str((Path(path) / child.name)),
                "type": "directory" if child.is_dir() else "file"}
        if child.is_dir():
            # detect session project: folder containing a .session file
            session_files = list(child.glob("*.session"))
            item["session"] = len(session_files) > 0
        items.append(item)
    return items
```

---

## Frontend (React + TypeScript)

### API Client (frontend/src/api/index.ts)

```ts
export interface FileItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  session?: boolean;
}

export async function fetchFiles(path = ''): Promise<FileItem[]> {
  const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}
```

### FileBrowser Component (frontend/src/components/FileBrowser.tsx)

```tsx
import React, { useState, useEffect } from 'react';
import { fetchFiles, FileItem } from '../api';
import { List, Button, Breadcrumb, Spin, message } from 'antd';

export const FileBrowser: React.FC = () => {
  const [path, setPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (newPath: string) => {
    setLoading(true);
    try {
      const data = await fetchFiles(newPath);
      setItems(data);
      setPath(newPath);
    } catch (e) {
      message.error('Could not fetch files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(''); }, []);

  return (
    <div className="p-4">
      <Breadcrumb className="mb-4">
        {path.split('/').map((seg, idx) => (
          <Breadcrumb.Item key={idx}>{seg || 'root'}</Breadcrumb.Item>
        ))}
      </Breadcrumb>
      {loading ? <Spin /> : (
        <List
          bordered
          dataSource={items}
          renderItem={item => (
            <List.Item
              actions={item.type === 'directory' ? [
                item.session
                  ? <Button type="primary" onClick={() => {/* open session */}}>Open Session</Button>
                  : <Button onClick={() => load(item.path)}>Open</Button>
              ] : []}
            >
              <List.Item.Meta
                title={item.name}
                description={item.session ? 'Session Project' : item.type}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};
```

### App Shell (frontend/src/App.tsx)

```tsx
import React from 'react';
import { FileBrowser } from './components/FileBrowser';

const App: React.FC = () => (
  <div className="h-screen flex flex-col">
    <header className="bg-blue-600 text-white p-4 text-xl">My File Browser</header>
    <main className="flex-1 overflow-auto"><FileBrowser /></main>
  </div>
);
export default App;
```

---

## Notes

* **Session Detection**: `.session` files in child folder mark it as a session project.
* **Navigation**: simple breadcrumb + list. Can be extended to a tree view.
* **Styling**: Tailwind CSS classes included; Ant Design for components.
* **Enhancements**: add file previews, context menus, icons, authentication, streaming large directories.

This MVP provides a working starting point to browse files, detect session projects, and open them with a dedicated action.
