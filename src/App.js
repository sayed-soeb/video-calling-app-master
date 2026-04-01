import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css';
import {
  FiCamera,
  FiMic,
  FiMicOff,
  FiPhoneCall,
  FiPhoneOff,
  FiRefreshCw,
  FiShield,
  FiVideo,
  FiVideoOff,
  FiZap
} from 'react-icons/fi';

function App() {
  const userVideo = useRef(null);
  const peerVideo = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const userStreamRef = useRef(null);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [userStream, setUserStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to meet someone new');

  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  const clearMediaState = () => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((track) => track.stop());
      userStreamRef.current = null;
      setUserStream(null);
    }

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    if (peerVideo.current) {
      peerVideo.current.srcObject = null;
    }

    setRemoteConnected(false);
    setLoading(false);
  };

  useEffect(() => {
    const socket = io('https://video-calling-backend-1.onrender.com');

    if (!socket?.on) {
      socketRef.current = null;
      return undefined;
    }

    socketRef.current = socket;

    const handleSignal = async (data) => {
      const peer = peerRef.current;
      if (!peer) return;

      try {
        if (data.type === 'offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('signal', peer.localDescription);
        } else if (data.type === 'answer') {
          await peer.setRemoteDescription(new RTCSessionDescription(data));
          setStatusMessage('Connection secured. Say hello.');
        } else if (data.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error('Error in signaling process:', error);
      }
    };

    socket.on('signal', handleSignal);

    return () => {
      socket.off('signal', handleSignal);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => () => clearMediaState(), []);

  const startCall = async () => {
    clearMediaState();
    setIsCallStarted(true);
    setLoading(true);
    setMicEnabled(true);
    setCameraEnabled(true);
    setStatusMessage('Finding someone online right now...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      userStreamRef.current = stream;
      setUserStream(stream);

      const peer = new RTCPeerConnection(configuration);
      peerRef.current = peer;

      peer.ontrack = (event) => {
        if (peerVideo.current) {
          peerVideo.current.srcObject = event.streams[0];
        }

        setRemoteConnected(true);
        setLoading(false);
        setStatusMessage('You are now connected with a random stranger');
      };

      peer.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('signal', { candidate: event.candidate });
        }
      };

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;

        if (state === 'connected') {
          setLoading(false);
          setRemoteConnected(true);
          setStatusMessage('Connection is live and stable');
        }

        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setRemoteConnected(false);
          setLoading(false);
          setStatusMessage('Connection ended. Tap next to rematch.');
        }
      };

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('signal', offer);
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setLoading(false);
      setIsCallStarted(false);
      setStatusMessage('Camera or microphone permission is required');
    }
  };

  const endCall = () => {
    clearMediaState();
    setIsCallStarted(false);
    setStatusMessage('Call ended. Start again when you are ready.');
  };

  const toggleMic = () => {
    const enabled = !micEnabled;
    setMicEnabled(enabled);
    const audioTrack = userStream?.getAudioTracks()?.[0];

    if (audioTrack) {
      audioTrack.enabled = enabled;
    }
  };

  const toggleCamera = () => {
    const enabled = !cameraEnabled;
    setCameraEnabled(enabled);
    const videoTrack = userStream?.getVideoTracks()?.[0];

    if (videoTrack) {
      videoTrack.enabled = enabled;
    }
  };

  const handlePrimaryAction = () => {
    if (isCallStarted) {
      startCall();
      return;
    }

    startCall();
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-one"></div>
      <div className="ambient ambient-two"></div>

      <main className="app-frame">
        <section className="intro-panel">
          <div className="brand-row">
            <div className="brand-mark">HF</div>
            <div>
              <p className="eyebrow">Random video calling</p>
              <h1>Hello-Friend</h1>
            </div>
          </div>

          <div className="headline-block">
            <span className="status-badge">Live rematch experience</span>
            <h2>Random video chats, redesigned for a sharper first impression.</h2>
            <p>
              Meet new people in a cleaner, richer interface with a full-screen stage,
              bold controls, and clear session feedback while you connect.
            </p>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <strong>Instant</strong>
              <span>One tap to start or rematch</span>
            </article>
            <article className="stat-card">
              <strong>Secure</strong>
              <span>Peer-to-peer session flow</span>
            </article>
            <article className="stat-card">
              <strong>Responsive</strong>
              <span>Optimized for phone and desktop</span>
            </article>
          </div>

          <div className="feature-list">
            <div className="feature-chip">
              <FiShield />
              <span>Private session routing</span>
            </div>
            <div className="feature-chip">
              <FiZap />
              <span>Fast stranger matching</span>
            </div>
            <div className="feature-chip">
              <FiCamera />
              <span>Camera and mic controls</span>
            </div>
          </div>
        </section>

        <section className="stage-panel">
          <div className="stage-header">
            <div>
              <p className="panel-label">Session status</p>
              <h3>{statusMessage}</h3>
            </div>
            <span className={`connection-pill ${remoteConnected ? 'online' : 'offline'}`}>
              {remoteConnected ? 'Connected' : loading ? 'Matching' : 'Idle'}
            </span>
          </div>

          <div className="video-stage">
            {loading && (
              <div className="loader-overlay">
                <div className="loader-ring"></div>
                <p>Searching for someone amazing...</p>
              </div>
            )}

            {!isCallStarted && !loading && (
              <div className="empty-state">
                <FiPhoneCall />
                <h4>Start your first random call</h4>
                <p>Camera preview and stranger video will appear here as soon as you connect.</p>
              </div>
            )}

            {isCallStarted && !remoteConnected && !loading && (
              <div className="empty-state compact">
                <FiRefreshCw />
                <h4>Waiting for the other side</h4>
                <p>Stay here while the app finishes pairing your next conversation.</p>
              </div>
            )}

            <video ref={peerVideo} autoPlay playsInline className={`peer-video ${remoteConnected ? 'visible' : ''}`}></video>

            <div className="self-preview-wrap">
              <div className="self-preview-label">You</div>
              <video ref={userVideo} autoPlay muted playsInline className={`user-video ${isCallStarted ? 'visible' : ''}`}></video>
            </div>
          </div>

          <div className="controls-bar">
            <button className="action-button primary" onClick={handlePrimaryAction}>
              {isCallStarted ? <FiRefreshCw /> : <FiPhoneCall />}
              <span>{isCallStarted ? 'Next match' : 'Start call'}</span>
            </button>

            <button className={`icon-button ${!micEnabled ? 'muted' : ''}`} onClick={toggleMic} disabled={!isCallStarted} aria-label="Toggle microphone">
              {micEnabled ? <FiMic /> : <FiMicOff />}
            </button>

            <button className={`icon-button ${!cameraEnabled ? 'muted' : ''}`} onClick={toggleCamera} disabled={!isCallStarted} aria-label="Toggle camera">
              {cameraEnabled ? <FiVideo /> : <FiVideoOff />}
            </button>

            <button className="action-button danger" onClick={endCall} disabled={!isCallStarted}>
              <FiPhoneOff />
              <span>End</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
