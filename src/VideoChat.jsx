import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import './Homepage.css';

const socket = io('http://localhost:5000'); // Replace with your backend if deployed

function VideoChat() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [interest, setInterest] = useState(localStorage.getItem('interest') || '');
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(currentStream => {
      setStream(currentStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = currentStream;
      }

      connectToRoom(currentStream);

      const handleESC = (e) => {
        if (e.key === 'Escape') {
          handleESCPress(currentStream);
        }
      };

      window.addEventListener('keydown', handleESC);
      return () => window.removeEventListener('keydown', handleESC);
    });

    socket.on('receive-message', ({ message }) => {
      setMessages(prev => [...prev, { text: message, sender: 'them' }]);
    });

    return () => {
      stream?.getTracks().forEach(track => track.stop());
      peer?.destroy();
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function connectToRoom(currentStream) {
    setConnecting(true);
    socket.connect();
    socket.emit('join-video-room', { interest });

    socket.on('user-joined', userId => {
      const newPeer = createPeer(userId, socket.id, currentStream);
      setPeer(newPeer);
    });

    socket.on('receive-signal', ({ signal, from }) => {
      const newPeer = addPeer(signal, from, currentStream);
      setPeer(newPeer);
    });

    socket.on('receiving-returned-signal', ({ signal }) => {
      peer && peer.signal(signal);
      setConnecting(false);
    });
  }

  function handleESCPress(currentStream) {
    peer?.destroy();
    socket.disconnect();
    setMessages([]);
    setPeer(null);
    setConnecting(true);
    setTimeout(() => {
      connectToRoom(currentStream);
    }, 500);
  }

  function createPeer(userToSignal, callerID, stream) {
    const newPeer = new Peer({ initiator: true, trickle: false, stream });

    newPeer.on('signal', signal => {
      socket.emit('send-signal', { userToSignal, callerID, signal });
    });

    newPeer.on('stream', remoteStream => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    return newPeer;
  }

  function addPeer(incomingSignal, from, stream) {
    const newPeer = new Peer({ initiator: false, trickle: false, stream });

    newPeer.on('signal', signal => {
      socket.emit('return-signal', { signal, to: from });
    });

    newPeer.on('stream', remoteStream => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    newPeer.signal(incomingSignal);
    return newPeer;
  }

  const sendMessage = () => {
    if (newMessage.trim() !== '') {
      socket.emit('send-message', { message: newMessage });
      setMessages(prev => [...prev, { text: newMessage, sender: 'me' }]);
      setNewMessage('');
    }
  };

  return (
    <>
      {connecting && (
        <div className="connecting-overlay">
          <div className="loader-heart"></div>
          <p>Connecting you to someone...</p>
        </div>
      )}

      <div className="chat-video-container">
        <div className="video-wrapper">
          <video ref={localVideoRef} autoPlay muted className="video-element" />
          <video ref={remoteVideoRef} autoPlay className="video-element" />
        </div>

        <div className="chat-box">
          <div className="messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message-bubble ${msg.sender === 'me' ? 'sent' : 'received'}`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>

      <button className="esc-button" onClick={() => handleESCPress(stream)}>⎋ Press ESC to Skip</button>
    </>
  );
}

export default VideoChat;
