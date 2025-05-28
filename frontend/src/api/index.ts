export interface FileItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  modified: string;
  created: string;
  session?: boolean;
  session_info?: {
    file_count: number;
    session_file: string;
  };
}

export interface FileListOptions {
  path?: string;
  sortBy?: 'name' | 'modified' | 'size';
  order?: 'asc' | 'desc';
}

const API_BASE = 'http://localhost:8001/api';

export async function fetchFiles(options: FileListOptions = {}): Promise<FileItem[]> {
  const { path = '', sortBy, order } = options;
  const params = new URLSearchParams();
  if (path) params.append('path', path);
  if (sortBy) params.append('sort_by', sortBy);
  if (order) params.append('order', order);

  try {
    const res = await fetch(`${API_BASE}/files?${params.toString()}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to load files');
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching files:', error);
    throw error;
  }
}

export async function getFileDetails(path: string): Promise<FileItem> {
  try {
    const res = await fetch(`${API_BASE}/file-info?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to load file details');
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching file details:', error);
    throw error;
  }
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
} 