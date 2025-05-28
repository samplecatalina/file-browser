# File Browser

A modern web-based file browser with session project detection, built with React, TypeScript, and FastAPI.

## Features

- Modern, responsive UI built with React, TypeScript, and Ant Design
- File and directory browsing with breadcrumb navigation
- Session project detection (folders containing .session files)
- File sorting by name, size, and modification date
- File size formatting and detailed file information
- Custom scrollbars and modern styling with Tailwind CSS

## Project Structure

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
    │   └── App.css
    ├── package.json
    ├── tsconfig.json
    └── tailwind.config.js
```

## Setup

### Backend

1. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Create a data directory for testing:
   ```bash
   mkdir data
   ```

4. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

The application will be available at http://localhost:3000

## Usage

1. Navigate through directories using the file list or breadcrumb navigation
2. Click on directories to open them
3. Use the "Up" button to navigate to the parent directory
4. Sort files using the sort dropdown menu
5. Session projects (folders containing .session files) will show an info icon and an "Open Session" button

## Development

- Backend API documentation is available at http://localhost:8000/docs
- The frontend uses TypeScript for type safety
- Tailwind CSS is used for styling
- Ant Design components are used for the UI

## License

MIT 