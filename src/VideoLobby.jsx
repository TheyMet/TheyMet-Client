// Verified lobby working for interest input

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';

function VideoLobby() {
  const [interest, setInterest] = useState('');
  const navigate = useNavigate();

  const handleStart = () => {
    if (interest.trim() !== '') {
      localStorage.setItem('interest', interest);
      navigate('/videochat');
    }
  };

  return (
    <div className="lobby-container">
      <h2>Enter your interest to start chatting</h2>
      <input
        className="lobby-input"
        type="text"
        value={interest}
        onChange={(e) => setInterest(e.target.value)}
        placeholder="e.g. music, travel, movies..."
      />
      <button className="chat-button video" onClick={handleStart}>
        Start Video Chat
      </button>
    </div>
  );
}

export default VideoLobby;
