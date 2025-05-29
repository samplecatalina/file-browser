import React, { useState, useEffect } from 'react';
import { Layout, List, Button, Breadcrumb, Spin, message, Tooltip } from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  PushpinOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import QuickAccess, { FOLDER_PINNED_EVENT } from './QuickAccess';

const { Content } = Layout;

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified: string;
  created: string;
  session?: boolean;
  session_info?: {
    file_count: number;
    session_file: string;
  };
}

const FileBrowser: React.FC = () => {
  const params = useParams<{ "*": string }>();
  const path = params["*"] || '';
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching files for path:', path);
      const encodedPath = path ? encodeURIComponent(path) : '';
      const response = await fetch(`/api/files?path=${encodedPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to fetch files: ${response.status}`);
      }
      const data = await response.json();
      console.log('Received files:', data);
      setFiles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Path changed to:', path);
    fetchFiles();
  }, [path]);

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'directory') {
      const newPath = path ? `${path}/${item.name}` : item.name;
      console.log('Navigating to path:', newPath);
      navigate(`/browse/${newPath}`);
    }
  };

  const handlePinClick = async (item: FileItem) => {
    try {
      const response = await fetch('/api/quick-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: item.path }),
      });

      const data = await response.json();
      
      if (response.ok) {
        message.success('Folder pinned to Quick Access');
        window.dispatchEvent(new Event(FOLDER_PINNED_EVENT));
      } else {
        message.error(data.detail || 'Failed to pin folder');
      }
    } catch (error) {
      console.error('Error pinning folder:', error);
      message.error('Error pinning folder');
    }
  };

  const pathParts = path.split('/').filter(Boolean);
  const breadcrumbItems = [
    {
      title: 'Root',
      onClick: () => navigate('/browse')
    },
    ...pathParts.map((part: string, index: number) => {
      const currentPath = pathParts.slice(0, index + 1).join('/');
      return {
        title: part,
        onClick: () => navigate(`/browse/${currentPath}`)
      };
    })
  ];

  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', color: 'red' }}>{error}</div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ width: '250px' }}>
            <QuickAccess />
          </div>
          <div style={{ flex: 1 }}>
            <Breadcrumb
              items={breadcrumbItems}
              style={{ marginBottom: '16px' }}
            />
            <List
              bordered
              dataSource={files}
              renderItem={(item: FileItem) => (
                <List.Item
                  actions={item.type === 'directory' ? [
                    <Tooltip title="Pin to Quick Access" key="pin">
                      <Button
                        type="text"
                        icon={<PushpinOutlined />}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handlePinClick(item);
                        }}
                      />
                    </Tooltip>
                  ] : []}
                  onClick={() => handleItemClick(item)}
                  style={{ cursor: item.type === 'directory' ? 'pointer' : 'default' }}
                >
                  <List.Item.Meta
                    avatar={item.type === 'directory' ? <FolderOutlined /> : <FileOutlined />}
                    title={
                      <span>
                        {item.name}
                        {item.session && (
                          <Tooltip title={`Session Project (${item.session_info?.file_count} files)`}>
                            <InfoCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                          </Tooltip>
                        )}
                      </span>
                    }
                    description={
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {item.type === 'file' && (
                          <span>{formatFileSize(item.size)}</span>
                        )}
                        <span>Modified: {formatDate(item.modified)}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default FileBrowser; 