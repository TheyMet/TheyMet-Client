import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./InterestForm.css";
import "./ChatStyles.css";

// ✅ Use env var on Vercel, fallback to local
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
const socket = io(SOCKET_URL, { autoConnect: false });

const TextChat = () => {
  const [interest, setInterest] = useState("");
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]); // {type:'sent'|'received'|'system', text}
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);

  // Smooth auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, partnerTyping]);

  // Socket listeners
  useEffect(() => {
    if (!started) return;

    socket.connect();
    socket.emit("join-room", { interest });

    socket.on("match-found", () => {
      setChatMessages([{ type: "system", text: "You are now connected!" }]);
    });

    socket.on("message", (text) => {
      setChatMessages((prev) => [...prev, { type: "received", text }]);
    });

    socket.on("partner-typing", ({ typing }) => setPartnerTyping(typing));

    socket.on("partner-disconnected", () => {
      setChatMessages((prev) => [
        ...prev,
        { type: "system", text: "Your partner disconnected." },
      ]);
    });

    return () => {
      socket.off("match-found");
      socket.off("message");
      socket.off("partner-typing");
      socket.off("partner-disconnected");
    };
  }, [started, interest]);

  // Typing indicator
  useEffect(() => {
    if (!started) return;
    if (isTyping) {
      socket.emit("typing", { typing: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit("typing", { typing: false });
      }, 1200);
    }
    return () => clearTimeout(typingTimeoutRef.current);
  }, [isTyping, started]);

  const handleStart = () => {
    if (!interest.trim()) return;
    setStarted(true);
  };

  const sendMessage = () => {
    const text = message.trim();
    if (!text) return;

    setChatMessages((prev) => [...prev, { type: "sent", text }]);
    setMessage("");
    socket.emit("message", text);
  };

  const handleESC = () => {
    try {
      socket.disconnect();
    } catch {}
    setChatMessages([]);
    setStarted(false);
    setMessage("");
    setPartnerTyping(false);
    setIsTyping(false);
  };

  return (
    <div className="textchat-container">
      {!started ? (
        <div className="interest-form">
          <h2>Enter your interest</h2>
          <input
            type="text"
            placeholder="e.g. Music, Sports, Movies"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
          />
          <button onClick={handleStart}>Start Chat</button>
        </div>
      ) : (
        <div className="chat-area">
          <div className="chat-window">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`message-bubble ${msg.type}`}>
                {msg.text}
              </div>
            ))}

            {partnerTyping && (
              <div className="typing-row">
                Partner is typing <span className="typing-dots"></span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="message-box">
            <input
              type="text"
              value={message}
              placeholder="Type a message..."
              onChange={(e) => {
                setMessage(e.target.value);
                setIsTyping(true);
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}

      {started && (
        <button className="esc-button" onClick={handleESC}>
          ⎋ Press ESC to Skip
        </button>
      )}
    </div>
  );
};

export default TextChat;
