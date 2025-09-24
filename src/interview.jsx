import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './interview.css'
import Navbar from './nav-bar.jsx';

function Interview() {
  const [count, setCount] = useState(0)
  const [interview, setInterview] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [error, setError] = useState(null);
  const [mediaInitialized, setMediaInitialized] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  
  // Refs for video elements
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    const fetchData = async () => {
      const username = 'aWJkZWlvZnZ4Z2Foa29sd3B1QHhmYXZhai5jb20';
      const password = '-LQno4iP98zcC_2_d2b_P:vk8pXF6N8Nop1Zxy7v-5B'; 
      const url = 'https://api.d-id.com/agents/v2_agt_DAKUHOVa'
      try {
        const response = await axios.get(url, {
          auth: {
            username: username,
            password: password,
          },
        });
        setInterview(response.data);
      } catch (err) {
        console.error('API Error:', err);
        setError('Failed to fetch interview data');
      }
    };

    // Only fetch if we have valid credentials
    // For now, let's comment this out to prevent blocking the UI
    // fetchData();
  }, []);

  // Initialize camera and microphone
  const initializeMedia = async () => {
    try {
      console.log('Requesting media access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      console.log('Media access granted:', stream);
      streamRef.current = stream;
      
      setCameraEnabled(true);
      setMicEnabled(true);
      setMediaInitialized(true);
      setError(null);
      
      // Log track states
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError(`Camera/Microphone access error: ${err.message}`);
      setMediaInitialized(false);
    }
  };

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) {
      console.log('No stream available, initializing media...');
      initializeMedia();
      return;
    }

    try {
      recordedChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        console.log('Recording stopped, blob created:', blob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped');
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
        console.log('Camera toggled:', videoTrack.enabled);
      }
    }
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
        console.log('Microphone toggled:', audioTrack.enabled);
      }
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log('Cleaning up media streams');
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-initialize media when component mounts
  useEffect(() => {
    console.log('Component mounted, initializing media...');
    initializeMedia();
  }, []);

  // Effect to attach stream to video element when both are available
  useEffect(() => {
    if (videoRef.current && streamRef.current && mediaInitialized) {
      console.log('Attaching stream to video element...');
      videoRef.current.srcObject = streamRef.current;
      
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        setStreamReady(true);
      };
      
      videoRef.current.oncanplay = () => {
        console.log('Video can play');
        videoRef.current.play().catch(console.error);
      };
      
      // Trigger play immediately if possible
      videoRef.current.play().catch(console.error);
    }
  }, [mediaInitialized, streamRef.current]);

  console.log('Current state:', {
    mediaInitialized,
    cameraEnabled,
    micEnabled,
    streamReady,
    hasStream: !!streamRef.current
  });

  return (
    <>
      {/* Nav-bar */}
      <Navbar />

      {/* Content */}
      <div className="progress">
        <div className="progress-top">
          <div>
            <i className="fa fa-circle redd" aria-hidden="true"></i> 
            <span className='live-text'>Live Interview Session</span>
            <span className='decorative-text'>Behavioral Interview</span>
          </div>
          <div>
            Question 1 of 3
          </div>
        </div>
        <div className="progress-bottom">
          <div className="bar"></div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={initializeMedia} className="retry-btn">Retry</button>
        </div>
      )}

      <div className="call">
        {/* Avatar side */}
        <div className="avatar">
          <div className="credentials">
            <div className="name">
              <span>AI Interviewer</span>
            </div>
            <div className="status">
              <i className="fa fa-circle" aria-hidden="true"></i> Online
              <span className='speaking'>Speaking</span>
            </div>
          </div>

          <div className="avatar-display">
            <div className="askquestion">
              <div>
                <i className="fa fa-circle" aria-hidden="true"></i>
              </div>
              <div>
                Python bhanne sarpa kun jungle ma paincha?
              </div>
            </div>
          </div>
        </div>

        {/* User side */}
        <div className="user">
          <div className="username">
            <i className="fa fa-user-circle" aria-hidden="true"></i>
            <span>You</span>
            <span className="user-status">Your Response</span>
          </div>

          <div className="user-display">
            {/* Always render video element when media is initialized */}
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className="video-feed"
              style={{ 
                display: (mediaInitialized && cameraEnabled) ? 'block' : 'none',
                zIndex: 1
              }}
            />
            
            {/* Show placeholder when no camera or camera disabled */}
            {(!mediaInitialized || !cameraEnabled) && (
              <div className="screen">
                <i className="fa fa-video-camera" aria-hidden="true"></i>
                <p>
                  {!mediaInitialized ? 'Initializing camera...' : 
                   !cameraEnabled ? 'Camera is disabled' : 
                   'Camera feed would appear here'}
                </p>
                {!mediaInitialized && (
                  <button onClick={initializeMedia} className="start-camera-btn">
                    Start Camera
                  </button>
                )}
              </div>
            )}
            
            {/* Camera controls - only show when media is initialized */}
            {mediaInitialized && (
              <div className="camera-controls">
                <button 
                  onClick={toggleCamera} 
                  className={`control-btn ${cameraEnabled ? 'active' : 'inactive'}`}
                  title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  <i className={`fa ${cameraEnabled ? 'fa-video-camera' : 'fa-video-camera'}`}></i>
                </button>
                
                <button 
                  onClick={toggleMicrophone} 
                  className={`control-btn ${micEnabled ? 'active' : 'inactive'}`}
                  title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  <i className={`fa ${micEnabled ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
                </button>
              </div>
            )}

            <div className='buttons'>
              <button 
                className={`recording-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!mediaInitialized}
              >
                <i className={`fa ${isRecording ? 'fa-stop' : 'fa-circle'}`}></i>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>

            {/* Audio levels indicator */}
            {micEnabled && mediaInitialized && (
              <div className="audio-levels">
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
              </div>
            )}
          </div>  
        </div>
      </div>
      
      <div className="stop">
        <button><i className="fa fa-stop" aria-hidden="true"></i> Stop Interview</button>
      </div>
    </>
  )
}

export default Interview