import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';

function HomePage() {
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="home-container">
      <div className={`logo-wrapper ${showContent ? 'logo-fly' : ''}`}>
        <img src="/logo.png" alt="TheyMet Logo" className="logo" />
      </div>

      {showContent && (
        <div className="content-wrapper fade-in">
          <p className="welcome-text">
            👋 Welcome to <strong>TheyMet</strong> — the place where you can meet someone new in a click!<br />
            Choose <strong>Text Chat</strong> or <strong>Video Chat</strong> and get instantly matched with people who share your interests.<br />
            Please chat respectfully and follow our safety guidelines 💙
          </p>

          <div className="button-block">
            <button className="chat-button text" onClick={() => navigate('/text')}>
              Text Chat
            </button>
            <button className="chat-button video" onClick={() => navigate('/video')}>
              Video Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
