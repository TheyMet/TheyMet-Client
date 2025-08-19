import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import "./InterestForm.css";
import "./ChatStyles.css";

// ✅ Use env var on Vercel, fallback to local
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
const socket = io(SOCKET_URL, { autoConnect: false });

function VideoChat() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]); // {text, sender:'me'|'them'}
  const [newMessage, setNewMessage] = useState("");
  const [interest, setInterest] = useState("");
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  useEffect(() => {
    if (!started) return;

    socket.connect();
    socket.emit("join-video-room", { interest });

    socket.on("user-joined", (userId) => {
      const newPeer = createPeer(userId, socket.id, stream);
      setPeer(newPeer);
    });

    socket.on("receive-signal", ({ signal, from }) => {
      const newPeer = addPeer(signal, from, stream);
      setPeer(newPeer);
    });

    socket.on("receiving-returned-signal", ({ signal }) => {
      if (peer) peer.signal(signal);
      setConnecting(false);
    });

    socket.on("receive-message", ({ message }) => {
      setMessages((prev) => [...prev, { text: message, sender: "them" }]);
    });

    socket.on("partner-typing", ({ typing }) => setPartnerTyping(typing));

    return () => {
      socket.off("user-joined");
      socket.off("receive-signal");
      socket.off("receiving-returned-signal");
      socket.off("receive-message");
      socket.off("partner-typing");
    };
  }, [started, interest, stream, peer]);

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

  function createPeer(userToSignal, callerID, stream) {
    const newPeer = new Peer({ initiator: true, trickle: false, stream });
    newPeer.on("signal", (signal) => {
      socket.emit("send-signal", { userToSignal, callerID, signal });
    });
    newPeer.on("stream", (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });
    return newPeer;
  }

  function addPeer(incomingSignal, from, stream) {
    const newPeer = new Peer({ initiator: false, trickle: false, stream });
    newPeer.on("signal", (signal) => {
      socket.emit("return-signal", { signal, to: from });
    });
    newPeer.on("stream", (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });
    newPeer.signal(incomingSignal);
    return newPeer;
  }

  async function handleStart() {
    if (!interest.trim()) return;
    const currentStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setStream(currentStream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = currentStream;
    }
    setStarted(true);
    setConnecting(true);
    socket.emit("join-video-room", { interest });
  }

  const sendMessage = () => {
    const text = newMessage.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { text, sender: "me" }]);
    setNewMessage("");
    socket.emit("send-message", { message: text });
  };

  const handleESC = () => {
    try {
      peer?.destroy();
    } catch {}
    try {
      socket.disconnect();
    } catch {}
    setMessages([]);
    setPeer(null);
    setConnecting(false);
    setStarted(false);
    setNewMessage("");
    setPartnerTyping(false);
    setIsTyping(false);
  };

  return (
    <div className="videochat-container">
      {!started ? (
        <div className="interest-form">
          <h2>Enter your interest</h2>
          <input
            type="text"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            placeholder="e.g. Music, Sports"
          />
          <button onClick={handleStart}>Start Video Chat</button>
        </div>
      ) : (
        <>
          {connecting && (
            <div className="loading-screen">
              <p>
                Connecting you to someone with interest: <strong>{interest}</strong>...
              </p>
            </div>
          )}

          <div className="split-layout">
            <div className="video-column">
              <video ref={remoteVideoRef} autoPlay className="video" />
              <video ref={localVideoRef} autoPlay muted className="video" />
            </div>

            <div className="chat-column">
              <div className="messages">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`message-bubble ${
                      msg.sender === "me" ? "sent" : "received"
                    }`}
                  >
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

              <div className="input-area">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setIsTyping(true);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </div>
          </div>

          <button className="esc-button" onClick={handleESC}>
            ⎋ Press ESC to Skip
          </button>
        </>
      )}
    </div>
  );
}

export default VideoChat;
