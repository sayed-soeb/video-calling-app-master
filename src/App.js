import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import { FiMicOff, FiVideoOff, FiCamera } from 'react-icons/fi';

const socket = io.connect('https://video-calling-backend-1.onrender.com'); // Replace with your backend URL

function App() {
  const userVideo = useRef(null);
  const peerVideo = useRef(null);
  const peerRef = useRef(null);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [userStream, setUserStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  useEffect(() => {
    socket.on('signal', async (data) => {
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
        } else if (data.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error('Error in signaling process:', error);
      }
    });

    return () => socket.off('signal');
  }, []);

  const startCall = () => {
    setLoading(true); // Show loading while setting up the stream and connection

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        // Check if userVideo ref is ready
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
          console.log('Local video stream set successfully.');
        } else {
          console.error('User video element not found.');
          setTimeout(() => {
            if (userVideo.current) {
              userVideo.current.srcObject = stream;
              console.log('Local video stream set after retry.');
            }
          }, 500); // Delay retry by 500ms if video element is not ready
        }

        setUserStream(stream);

        const peer = new RTCPeerConnection(configuration);
        peerRef.current = peer;

        // On receiving the remote video track, attach it to peerVideo element
        peer.ontrack = (event) => {
          if (peerVideo.current) {
            peerVideo.current.srcObject = event.streams[0];
            console.log('Remote video stream set successfully.');
            setLoading(false); // Stop loading once the remote video is displayed
          } else {
            console.error('Peer video element not found.');
          }
        };

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('signal', { candidate: event.candidate });
          }
        };

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.createOffer().then(offer => {
          peer.setLocalDescription(offer);
          socket.emit('signal', offer);
        });

        setLoading(false); // Stop loading once the local video stream is displayed
      })
      .catch(error => {
        console.error('Error accessing media devices:', error);
        setLoading(false); // Stop loading if there's an error
      });
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (userStream) {
      userStream.getTracks().forEach(track => track.stop());
      setUserStream(null);
    }
    setIsCallStarted(false);
    if (userVideo.current) userVideo.current.srcObject = null;
    if (peerVideo.current) peerVideo.current.srcObject = null;
  };

  const toggleMic = () => {
    const enabled = !micEnabled;
    setMicEnabled(enabled);
    if (userStream) userStream.getAudioTracks()[0].enabled = enabled;
  };

  const toggleCamera = () => {
    const enabled = !cameraEnabled;
    setCameraEnabled(enabled);
    if (userStream) userStream.getVideoTracks()[0].enabled = enabled;
  };

  return (
    <div className="app">
      <div className="logo">
        <h2>Hello-Friend</h2>
        <span>by Sayed Soeb</span>
      </div>
      <div className="container">
        {loading && <div className="loader">Searching user...</div>}
        {!loading && (
          <div className="video-container">
            <video ref={userVideo} autoPlay muted playsInline className="user-video"></video>
            <video ref={peerVideo} autoPlay playsInline className="peer-video"></video>
          </div>
        )}
        <div className="button-container">
          {!isCallStarted ? (
            <button onClick={() => { setIsCallStarted(true); startCall(); }}>Start</button>
          ) : (
            <>
              <button onClick={endCall}>End</button>
              <button onClick={toggleMic}>
                <FiMicOff color={micEnabled ? '#fff' : '#d32f2f'} />
              </button>
              <button onClick={toggleCamera}>
                <FiVideoOff color={cameraEnabled ? '#fff' : '#d32f2f'} />
              </button>
              <button onClick={startCall}>Next</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
