import React from 'react';
import { Layout, Typography } from 'antd';
import { FileBrowser } from './components/FileBrowser';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => (
  <Layout className="min-h-screen">
    <Header className="bg-white border-b border-gray-200 px-6 flex items-center">
      <Title level={3} className="m-0 text-gray-800">
        File Browser
      </Title>
    </Header>
    <Content className="bg-gray-50">
      <FileBrowser />
    </Content>
  </Layout>
);

export default App; 