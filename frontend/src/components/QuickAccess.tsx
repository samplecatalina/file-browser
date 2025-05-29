import React, { useEffect, useState } from 'react';
import { List, Typography, Button, Tooltip } from 'antd';
import { FolderOutlined, PushpinOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface QuickAccessItem {
  path: string;
  name: string;
  pinned_at: string;
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
      }
    } catch (error) {
      console.error('Error fetching pinned folders:', error);
    }
  };

  useEffect(() => {
    fetchPinnedFolders();

    // Add event listener for folder pinning
    const handleFolderPinned = () => {
      fetchPinnedFolders();
    };

    window.addEventListener(FOLDER_PINNED_EVENT, handleFolderPinned);

    // Cleanup
    return () => {
      window.removeEventListener(FOLDER_PINNED_EVENT, handleFolderPinned);
    };
  }, []);

  const handlePinClick = async (path: string) => {
    try {
      const response = await fetch('/api/quick-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });

      if (response.ok) {
        fetchPinnedFolders();
      }
    } catch (error) {
      console.error('Error pinning folder:', error);
    }
  };

  const handleUnpinClick = async (path: string) => {
    try {
      const response = await fetch(`/api/quick-access/${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPinnedFolders();
      }
    } catch (error) {
      console.error('Error unpinning folder:', error);
    }
  };

  const handleFolderClick = (path: string) => {
    navigate(`/browse/${path}`);
  };

  return (
    <div style={{ width: '250px', padding: '16px' }}>
      <Typography.Title level={4} style={{ marginBottom: '16px' }}>
        Quick Access
      </Typography.Title>
      <List
        dataSource={pinnedFolders}
        renderItem={(folder: QuickAccessItem) => (
          <List.Item
            actions={[
              <Tooltip title="Unpin folder" key="unpin">
                <Button
                  type="text"
                  icon={<PushpinOutlined />}
                  onClick={() => handleUnpinClick(folder.path)}
                />
              </Tooltip>
            ]}
          >
            <List.Item.Meta
              avatar={<FolderOutlined />}
              title={
                <Button
                  type="link"
                  onClick={() => handleFolderClick(folder.path)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {folder.name}
                </Button>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default QuickAccess; 