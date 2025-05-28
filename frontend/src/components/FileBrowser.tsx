import React, { useState, useEffect } from 'react';
import { List, Button, Breadcrumb, Spin, message, Dropdown, Space, Tooltip } from 'antd';
import { 
  FolderOutlined, 
  FileOutlined, 
  UpOutlined, 
  SortAscendingOutlined,
  SortDescendingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { fetchFiles, getFileDetails, FileItem, formatFileSize } from '../api';

export const FileBrowser: React.FC = () => {
  const [path, setPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);

  const load = async (newPath: string) => {
    setLoading(true);
    try {
      const data = await fetchFiles({ path: newPath, sortBy, order });
      setItems(data);
      setPath(newPath);
      setSelectedItem(null);
    } catch (e) {
      message.error('Could not fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (newSortBy: 'name' | 'modified' | 'size') => {
    if (sortBy === newSortBy) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setOrder('asc');
    }
  };

  const handleItemClick = async (item: FileItem) => {
    setSelectedItem(item);
    if (item.type === 'directory' && !item.session) {
      await load(item.path);
    }
  };

  const handleSessionOpen = (item: FileItem) => {
    message.info(`Opening session project: ${item.name}`);
    // TODO: Implement session opening logic
  };

  const handleGoUp = () => {
    const parentPath = path.split('/').slice(0, -1).join('/');
    load(parentPath);
  };

  useEffect(() => {
    load(path);
  }, [sortBy, order]);

  const sortItems = [
    {
      key: 'name',
      label: 'Sort by Name',
      onClick: () => handleSort('name')
    },
    {
      key: 'modified',
      label: 'Sort by Modified Date',
      onClick: () => handleSort('modified')
    },
    {
      key: 'size',
      label: 'Sort by Size',
      onClick: () => handleSort('size')
    }
  ];

  const breadcrumbItems = [
    {
      title: 'root',
      onClick: () => load('')
    },
    ...path.split('/').map((seg, idx) => ({
      title: seg,
      onClick: () => load(path.split('/').slice(0, idx + 1).join('/'))
    }))
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Breadcrumb items={breadcrumbItems} />
        <Space>
          <Button 
            icon={<UpOutlined />} 
            onClick={handleGoUp}
            disabled={!path}
          >
            Up
          </Button>
          <Dropdown menu={{ items: sortItems }} trigger={['click']}>
            <Button>
              Sort {order === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            </Button>
          </Dropdown>
        </Space>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : (
        <List
          bordered
          dataSource={items}
          renderItem={item => (
            <List.Item
              className={`cursor-pointer hover:bg-gray-50 ${
                selectedItem?.path === item.path ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleItemClick(item)}
              actions={item.type === 'directory' ? [
                item.session ? (
                  <Button 
                    type="primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSessionOpen(item);
                    }}
                  >
                    Open Session
                  </Button>
                ) : (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      load(item.path);
                    }}
                  >
                    Open
                  </Button>
                )
              ] : []}
            >
              <List.Item.Meta
                avatar={item.type === 'directory' ? <FolderOutlined /> : <FileOutlined />}
                title={
                  <Space>
                    {item.name}
                    {item.session && (
                      <Tooltip title={`Session Project (${item.session_info?.file_count} files)`}>
                        <InfoCircleOutlined className="text-blue-500" />
                      </Tooltip>
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <span>{item.type === 'file' ? formatFileSize(item.size) : ''}</span>
                    <span className="text-gray-500 text-xs">
                      Modified: {new Date(item.modified).toLocaleString()}
                    </span>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}; 