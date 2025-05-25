import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';
import io from 'socket.io-client';
import './Videochat.css';

const socket = io('http://localhost:5000'); // change if deployed

function Videochat() {
  const [stream, setStream] = useState(null);
  const [interest, setInterest] = useState('');
  const [step, setStep] = useState('form'); // form | loading | connected
  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerRef = useRef();
  const isInitiator = useRef(false);
  const matchedPartnerId = useRef(null);

  useEffect(() => {
    if (step !== 'loading') return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(localStream => {
      setStream(localStream);
      if (userVideo.current) {
        userVideo.current.srcObject = localStream;
      }

      // Ask to join room
      socket.emit('join-room', { interest, peerId: socket.id });

      // Wait for match to be found
      socket.on('match-found', ({ partner }) => {
        matchedPartnerId.current = partner;

        // Decide initiator by socket ID comparison
        isInitiator.current = socket.id < partner;

        if (isInitiator.current) {
          const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: localStream
          });

          peer.on('signal', data => {
            socket.emit('call-user', { signalData: data, userToCall: partner });
          });

          peer.on('stream', remoteStream => {
            if (partnerVideo.current) {
              partnerVideo.current.srcObject = remoteStream;
              setStep('connected');
            }
          });

          peerRef.current = peer;
        }

        // If not initiator, just wait for call-user
      });

      socket.on('call-user', ({ signalData, userToCall }) => {
        if (!isInitiator.current) {
          const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: localStream
          });

          peer.on('signal', signal => {
            socket.emit('accept-call', { signal, to: userToCall });
          });

          peer.on('stream', remoteStream => {
            if (partnerVideo.current) {
              partnerVideo.current.srcObject = remoteStream;
              setStep('connected');
            }
          });

          peer.signal(signalData);
          peerRef.current = peer;
        }
      });

      socket.on('accept-call', ({ signal }) => {
        if (peerRef.current) {
          peerRef.current.signal(signal);
        }
      });

      socket.on('partner-disconnected', () => {
        alert('Your partner disconnected.');
        window.location.reload();
      });
    }).catch(err => {
      console.error('Media access error:', err);
      alert('Please allow access to camera and microphone.');
    });
  }, [step]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (interest.trim()) {
      setStep('loading');
    }
  };

  return (
    <div className="videochat-container">
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="interest-form">
          <h2>Enter Your Interest</h2>
          <input
            type="text"
            placeholder="e.g. music, books, anime"
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
          <video playsInline muted ref={userVideo} autoPlay className="video loading-preview" />
        </div>
      )}

      {step === 'connected' && (
        <>
          <video playsInline muted ref={userVideo} autoPlay className="video" />
          <video playsInline ref={partnerVideo} autoPlay className="video" />
        </>
      )}
    </div>
  );
}

export default Videochat;
