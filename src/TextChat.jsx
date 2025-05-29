import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import Loader from "./Loader";
import "./TextChat.css";

const socket = io("http://localhost:5000");

const TextChat = () => {
  const [interest, setInterest] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const partnerRef = useRef(null);

  // Join with interest
  const handleStart = () => {
    if (interest.trim()) {
      setLoading(true);
      socket.emit("join-room", { interest });
    }
  };

  // Send message to partner
  const handleSend = () => {
    if (message.trim()) {
      setChatMessages((prev) => [...prev, { type: "sent", text: message }]);
      socket.emit("message", message);
      setMessage("");
    }
  };

  // Handle received messages
  useEffect(() => {
    socket.on("match-found", ({ partner }) => {
      setLoading(false);
      setConnected(true);
      partnerRef.current = partner;
      setChatMessages([{ type: "system", text: "You are now connected!" }]);
    });

    socket.on("message", (text) => {
      setChatMessages((prev) => [...prev, { type: "received", text }]);
    });

    socket.on("partner-disconnected", () => {
      setChatMessages((prev) => [
        ...prev,
        { type: "system", text: "Your partner disconnected." }
      ]);
    });

    return () => {
      socket.off("match-found");
      socket.off("message");
      socket.off("partner-disconnected");
    };
  }, []);

  return (
    <motion.div
      className="textchat-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {loading && <Loader />}

      {!connected && !loading ? (
        <div className="interest-box">
          <h2>Start a Text Chat</h2>
          <input
            type="text"
            placeholder="What would you like to talk about?"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
          />
          <button onClick={handleStart}>Start Chat</button>
        </div>
      ) : null}

      {connected && !loading && (
        <div className="chat-area">
          <div className="chat-window">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`message ${
                  msg.type === "sent"
                    ? "sent"
                    : msg.type === "system"
                    ? "system"
                    : "received"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="message-box">
            <input
              type="text"
              value={message}
              placeholder="Type a message..."
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TextChat;
