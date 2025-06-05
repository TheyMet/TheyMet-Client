import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import './Videochat.css';

const socket = io('http://localhost:5000'); // Replace with deployed backend when live

function Videochat() {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [interest, setInterest] = useState('');
  const [step, setStep] = useState('form');
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  const userVideo = useRef(null);
  const partnerVideo = useRef(null);
  const peerRef = useRef(null);
  const isInitiator = useRef(false);
  const matchedPartnerId = useRef(null);

  // Get camera/mic
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(localStream => {
        console.log("🎥 Got local media stream");
        setStream(localStream);
        if (userVideo.current) {
          userVideo.current.srcObject = localStream;
        }
      })
      .catch(err => {
        console.error("❌ Media access error:", err);
        alert('Please allow camera and microphone access.');
      });
  }, []);

  // Set local stream again once DOM is fully ready
  useEffect(() => {
    if (step === 'connected' && userVideo.current && stream) {
      console.log("✅ DOM ready. Assigning local stream to userVideo");
      userVideo.current.srcObject = stream;
    }
  }, [step, stream]);

  // Set remote stream once video tag is ready
  useEffect(() => {
    if (step === 'connected' && partnerVideo.current && remoteStream) {
      console.log("✅ DOM ready. Assigning remote stream to partnerVideo");
      partnerVideo.current.srcObject = null;
      partnerVideo.current.srcObject = remoteStream;
    }
  }, [step, remoteStream]);

  useEffect(() => {
    if (!stream) return;

    socket.off('match-found');
    socket.off('call-user');
    socket.off('accept-call');
    socket.off('partner-disconnected');
    socket.off('video-message');

    socket.on('match-found', ({ partner }) => {
      matchedPartnerId.current = partner;
      isInitiator.current = socket.id < partner;
      console.log("✅ Matched with:", partner);
      console.log("🧭 I am initiator:", isInitiator.current);

      const peer = new Peer({
        initiator: isInitiator.current,
        trickle: false,
        stream: stream
      });

      peer.on('signal', data => {
        if (isInitiator.current) {
          console.log("📤 Initiator sending signal to:", partner);
          socket.emit('call-user', { signalData: data, userToCall: partner });
        }
      });

      peer.on('stream', remote => {
        console.log("🎥 Initiator received remote stream:", remote.getTracks());
        setRemoteStream(remote);
        setStep('connected');
      });

      peerRef.current = peer;
    });

    socket.on('call-user', ({ signalData, userToCall }) => {
      console.log("📞 Received call-user from:", userToCall);

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream
      });

      peer.on('signal', signal => {
        console.log("📤 Receiver sending accept-call to:", userToCall);
        socket.emit('accept-call', { signal, to: userToCall });
      });

      peer.on('stream', remote => {
        console.log("🎥 Receiver received remote stream:", remote.getTracks());
        setRemoteStream(remote);
        setStep('connected');
      });

      peer.signal(signalData);
      peerRef.current = peer;
    });

    socket.on('accept-call', ({ signal }) => {
      console.log("✅ Received accept-call");
      if (peerRef.current) {
        peerRef.current.signal(signal);
      } else {
        setTimeout(() => {
          if (peerRef.current) {
            peerRef.current.signal(signal);
            console.log("✅ Retried signal after delay");
          }
        }, 500);
      }
    });

    socket.on('partner-disconnected', () => {
      console.log("⚠️ Partner disconnected");
      setChatMessages(prev => [...prev, { type: 'system', text: 'Your partner disconnected.' }]);
      alert('Your partner disconnected.');
      window.location.reload();
    });

    socket.on('video-message', (text) => {
      console.log("📨 Received message:", text);
      setChatMessages(prev => [...prev, { type: 'received', text }]);
    });
  }, [stream]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (interest.trim()) {
      if (!stream) {
        alert("Camera not ready. Please wait.");
        return;
      }
      setStep('loading');
      socket.emit('join-room', { interest, peerId: socket.id });
      console.log("📡 Sent join-room with interest:", interest);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      setChatMessages(prev => [...prev, { type: 'sent', text: message }]);
      socket.emit('video-message', message);
      setMessage('');
    }
  };

  return (
    <div className="videochat-container">
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="interest-form">
          <h2>Enter Your Interest</h2>
          <input
            type="text"
            placeholder="e.g. music, books"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            required
          />
          <button type="submit">Start Video Chat</button>
        </form>
      )}

      {step === 'loading' && (
        <div className="loading-screen">
          <p>🔄 Connecting you to a match based on interest: <strong>{interest}</strong></p>
          <video ref={userVideo} autoPlay playsInline muted className="video loading-preview" />
        </div>
      )}

      {step === 'connected' && (
        <div className="connected-wrapper">
          <div className="video-grid">
            <video ref={userVideo} autoPlay playsInline muted className="video" />
            <video ref={partnerVideo} autoPlay playsInline className="video" />
          </div>
          <div className="chat-box">
            <div className="messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`message ${msg.type}`}>{msg.text}</div>
              ))}
            </div>
            <div className="input-area">
              <input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Videochat;
