import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="homepage">
      <div className="welcome-box">
        <h1>TheyMet</h1>
        <p>
          Meet someone new in a click — chat via <strong>Text</strong> or{" "}
          <strong>Video</strong>, matched by your interests.
        </p>
      </div>

      {/* 🔒 Privacy & Safety Banner */}
      <div className="privacy-banner">
        <h3>🔒 Your Privacy Matters</h3>
        <ul>
          <li>
            Chats are <strong>anonymous</strong> — no signup, no personal info.
          </li>
          <li>
            Messages and video are <strong>not stored</strong> or logged.
          </li>
          <li>
            Once the chat ends, <strong>everything is gone forever</strong>.
          </li>
          <li>
            Be respectful & follow <strong>safe chatting guidelines</strong>.
          </li>
        </ul>
      </div>

      {/* Buttons for Chat */}
      <div className="chat-options">
        <button onClick={() => navigate("/text")}>💬 Text Chat</button>
        <button onClick={() => navigate("/video")}>🎥 Video Chat</button>
      </div>

      <footer className="footer">
        <p>⚡ Built with ❤️ for safe and fun conversations</p>
      </footer>
    </div>
  );
}

export default HomePage;
