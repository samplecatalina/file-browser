import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FileBrowser from './components/FileBrowser';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/browse/*" element={<FileBrowser />} />
        <Route path="/" element={<FileBrowser />} />
      </Routes>
    </Router>
  );
};

export default App; 