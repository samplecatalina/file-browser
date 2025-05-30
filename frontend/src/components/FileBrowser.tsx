import React, { useState, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { Layout, List, Button, Breadcrumb, Spin, message, Tooltip, Input, Modal } from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  PushpinOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  SendOutlined,
  FolderAddOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import QuickAccess, { FOLDER_PINNED_EVENT } from './QuickAccess';
import { 
  createFolder as createFolderAPI, 
  CreateFolderResponse, 
  fetchFiles as apiFetchFiles, 
  FileListOptions,
  FileItem as ApiFileItem,
  deleteItem as deleteItemAPI,
  DeleteItemResponse
} from '../api';

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
  const [pathInputValue, setPathInputValue] = useState<string>(path);
  const [isCreateFolderModalVisible, setIsCreateFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setPathInputValue(path);
    setSelectedItem(null);
  }, [path]);

  const localFetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching files for path (localFetchFiles):', path);
      const options: FileListOptions = { path };
      const data = await apiFetchFiles(options);
      console.log('Received files (localFetchFiles):', data);
      setFiles(data as FileItem[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching files.';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Path changed to:', path);
    localFetchFiles();
  }, [path]);

  const handleItemClick = (item: FileItem) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      if (item.type === 'directory') {
        setSelectedItem(item);
        const newPath = path ? `${path}/${item.name}` : item.name;
        console.log('Double-click: Navigating to path:', newPath);
        navigate(`/browse/${newPath}`);
      } else {
        setSelectedItem(item);
      }
    } else {
      const timeout = setTimeout(() => {
        setSelectedItem(item);
        console.log('Single-click: Selected item:', item.name);
        setClickTimeout(null);
      }, 250);
      setClickTimeout(timeout);
    }
  };

  const handlePinClick = async (itemToPin: FileItem) => {
    if (!itemToPin) return;
    if (itemToPin.type !== 'directory') {
        message.warning('Only directories can be pinned.');
        return;
    }
    try {
      const response = await fetch('/api/quick-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: itemToPin.path }),
      });

      const data = await response.json();
      
      if (response.ok) {
        message.success(`Folder '${itemToPin.name}' pinned to Quick Access`);
        window.dispatchEvent(new Event(FOLDER_PINNED_EVENT));
      } else {
        message.error(data.detail || 'Failed to pin folder');
      }
    } catch (error) {
      console.error('Error pinning folder:', error);
      message.error('Error pinning folder');
    }
  };

  const handleDeleteItem = (itemToDelete: FileItem) => {
    Modal.confirm({
      title: `Delete '${itemToDelete.name}'?`,
      content: itemToDelete.type === 'directory' 
        ? 'This will delete the folder and all its contents. This action cannot be undone.'
        : 'This will permanently delete the file. This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          await deleteItemAPI(itemToDelete.path);
          message.success(`'${itemToDelete.name}' deleted successfully.`);
          if (selectedItem && selectedItem.path === itemToDelete.path && selectedItem.name === itemToDelete.name) {
            setSelectedItem(null);
          }
          localFetchFiles();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';
          message.error(errorMessage);
          console.error('Error deleting item:', error);
          setLoading(false);
        }
      },
    });
  };

  const handlePathInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPathInputValue(e.target.value);
  };

  const handlePathInputSubmit = () => {
    console.log('Navigating to input path:', pathInputValue);
    navigate(`/browse/${pathInputValue.split('/').filter(Boolean).join('/')}`);
  };

  const handlePathInputKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePathInputSubmit();
    }
  };

  const handleNavigateParent = () => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      navigate(`/browse/${parts.join('/')}`);
    } else {
      navigate('/browse');
    }
  };

  const showCreateFolderModal = () => {
    setNewFolderName('');
    setIsCreateFolderModalVisible(true);
  };

  const handleCreateFolderOk = async () => {
    if (!newFolderName.trim()) {
      message.error('Folder name cannot be empty.');
      return;
    }
    setCreatingFolder(true);
    try {
      await createFolderAPI(path, newFolderName.trim());
      message.success(`Folder '${newFolderName.trim()}' created successfully.`);
      setIsCreateFolderModalVisible(false);
      localFetchFiles();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
      message.error(errorMessage);
      console.error('Error creating folder:', error);
    }
    setCreatingFolder(false);
  };

  const handleCreateFolderCancel = () => {
    setIsCreateFolderModalVisible(false);
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

  if (loading && !creatingFolder) {
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
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Button
                icon={<ArrowUpOutlined />}
                onClick={handleNavigateParent}
                disabled={!path}
                style={{ marginRight: '8px' }}
                aria-label="Navigate to parent folder"
              />
              <Input
                value={pathInputValue}
                onChange={handlePathInputChange}
                onKeyPress={handlePathInputKeyPress}
                placeholder="Enter path"
                style={{ flexGrow: 1, marginRight: '8px' }}
              />
              <Button 
                icon={<FolderAddOutlined />} 
                onClick={showCreateFolderModal}
                style={{ marginRight: '8px' }}
                aria-label="Create new folder"
              />
              <Button 
                icon={<SendOutlined />} 
                onClick={handlePathInputSubmit}
                style={{ marginRight: '8px' }}
                aria-label="Go to path"
              />
              <Button
                icon={<PushpinOutlined />}
                onClick={() => selectedItem && handlePinClick(selectedItem)}
                disabled={!selectedItem || selectedItem.type !== 'directory'}
                style={{ marginRight: '8px' }}
                aria-label="Pin selected folder to Quick Access"
              />
              <Tooltip title={selectedItem ? `Delete '${selectedItem.name}'` : "Delete selected item"}>
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => selectedItem && handleDeleteItem(selectedItem)}
                  disabled={!selectedItem}
                  danger
                  aria-label="Delete selected item"
                />
              </Tooltip>
            </div>
            <Breadcrumb
              items={breadcrumbItems}
              style={{ marginBottom: '16px' }}
            />
            <Modal
              title="Create New Folder"
              visible={isCreateFolderModalVisible}
              onOk={handleCreateFolderOk}
              onCancel={handleCreateFolderCancel}
              confirmLoading={creatingFolder}
              okText="Create"
            >
              <Input 
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolderOk()}
              />
            </Modal>
            {(loading && !creatingFolder) ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
              </div>
            ) : (
              <List
                bordered
                dataSource={files}
                renderItem={(item: FileItem) => {
                  const isSelected = selectedItem?.path === item.path && selectedItem?.name === item.name;
                  return (
                    <List.Item
                      actions={[
                        ...(item.type === 'directory' ? [
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
                        ] : []),
                        <Tooltip title={`Delete '${item.name}'`} key="delete">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleDeleteItem(item);
                            }}
                          />
                        </Tooltip>
                      ]}
                      onClick={() => handleItemClick(item)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                      }}
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
                  );
                }}
              />
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default FileBrowser; 