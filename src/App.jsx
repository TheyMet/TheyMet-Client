import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import TextChat from './Textchat';
import VideoLobby from './VideoLobby';
import VideoChat from './VideoChat';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/text" element={<TextChat />} />
        <Route path="/video" element={<VideoLobby />} />
        <Route path="/videochat" element={<VideoChat />} />
      </Routes>
    </Router>
  );
}

export default App;
