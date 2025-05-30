import React, { useEffect, useState, DragEvent } from 'react';
import { List, Typography, Button, Tooltip, Menu, Dropdown, message } from 'antd';
import { FolderOutlined, PushpinOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface QuickAccessItem {
  path: string;
  name: string;
  pinned_at: string;
}

// For data transfer
interface DraggableFileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

// Create a custom event for folder pinning
export const FOLDER_PINNED_EVENT = 'folder-pinned';

const QuickAccess: React.FC = () => {
  const [pinnedFolders, setPinnedFolders] = useState<QuickAccessItem[]>([]);
  const navigate = useNavigate();

  const fetchPinnedFolders = async () => {
    try {
      const response = await fetch('/api/quick-access');
      if (response.ok) {
        const data = await response.json();
        setPinnedFolders(data);
      } else {
        console.error('Failed to fetch pinned folders:', response.statusText);
        message.error('Failed to load quick access items.');
      }
    } catch (error) {
      console.error('Error fetching pinned folders:', error);
      message.error('Error loading quick access items.');
    }
  };

  useEffect(() => {
    fetchPinnedFolders();

    const handleFolderPinnedEvent = () => {
      fetchPinnedFolders();
    };

    window.addEventListener(FOLDER_PINNED_EVENT, handleFolderPinnedEvent);

    return () => {
      window.removeEventListener(FOLDER_PINNED_EVENT, handleFolderPinnedEvent);
    };
  }, []);

  const pinFolder = async (path: string, name: string) => {
    try {
      const response = await fetch('/api/quick-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });
      const data = await response.json();
      if (response.ok) {
        message.success(`Folder '${name}' pinned to Quick Access`);
        fetchPinnedFolders(); // Refresh the list
      } else {
        message.error(data.detail || `Failed to pin '${name}'`);
      }
    } catch (error) {
      console.error('Error pinning folder:', error);
      message.error(`Error pinning folder '${name}'`);
    }
  };

  const handleUnpinClick = async (path: string, name: string) => {
    try {
      const response = await fetch(`/api/quick-access/${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        message.success(`'${name}' unpinned from Quick Access`);
        fetchPinnedFolders();
      } else {
        const data = await response.json();
        message.error(data.detail || `Failed to unpin '${name}'`);
      }
    } catch (error) {
      console.error('Error unpinning folder:', error);
      message.error(`Error unpinning folder '${name}'`);
    }
  };

  const handleFolderClick = (path: string) => {
    navigate(`/browse/${path}`);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      const itemString = event.dataTransfer.getData('application/json');
      if (itemString) {
        const item: DraggableFileItem = JSON.parse(itemString);
        if (item.type === 'directory') {
          // Check if already pinned to avoid duplicate API calls if backend doesn't handle it
          if (pinnedFolders.some(pf => pf.path === item.path)) {
            message.info(`Folder '${item.name}' is already in Quick Access.`);
            return;
          }
          await pinFolder(item.path, item.name);
        } else {
          message.warning('Only folders can be pinned to Quick Access.');
        }
      }
    } catch (error) {
      console.error('Error processing dropped item:', error);
      message.error('Failed to process dropped item.');
    }
  };
  
  const quickAccessContextMenu = (item: QuickAccessItem) => (
    <Menu onClick={({ key }) => {
      if (key === 'unpin') handleUnpinClick(item.path, item.name);
    }}>
      <Menu.Item key="unpin" icon={<DeleteOutlined />} danger>
        Remove from Quick Access
      </Menu.Item>
    </Menu>
  );

  return (
    <div 
      style={{ width: '100%', padding: '16px', minHeight: '100px' /* Ensure it has some height for dropping */ }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Typography.Title level={4} style={{ marginBottom: '16px' }}>
        Quick Access
      </Typography.Title>
      <List
        dataSource={pinnedFolders}
        renderItem={(folder: QuickAccessItem) => {
          const listItemContent = (
            <List.Item>
              <List.Item.Meta
                avatar={<FolderOutlined />}
                title={
                  <Button
                    type="link"
                    onClick={() => handleFolderClick(folder.path)}
                    style={{ padding: 0, height: 'auto', textAlign: 'left' }}
                  >
                    {folder.name}
                  </Button>
                }
              />
            </List.Item>
          );
          return (
            <Dropdown menu={{items: [
                { key: 'unpin', label: 'Remove from Quick Access', icon: <DeleteOutlined />, danger: true, onClick: () => handleUnpinClick(folder.path, folder.name) }
            ]}} trigger={['contextMenu']}>
              <div>{listItemContent}</div>
            </Dropdown>
          );
        }}
        locale={{ emptyText: 'Drag folders here to pin' }}
      />
    </div>
  );
};

export default QuickAccess; 