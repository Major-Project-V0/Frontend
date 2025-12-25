import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './interview.css'
import Navbar from './nav-bar.jsx';

function Interview() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0)
  const [interview, setInterview] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [error, setError] = useState(null);
  const [mediaInitialized, setMediaInitialized] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  
  // Detection state
  const [postureLabel, setPostureLabel] = useState(null);
  const [postureConfidence, setPostureConfidence] = useState(null);
  const [faceCount, setFaceCount] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Refs for video elements
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const detectionIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  // Check authentication on mount - redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || token.trim() === '') {
      console.log('No token found, redirecting to login');
      navigate('/login');
    }
  }, [navigate]);

  // Generate session ID on mount
  useEffect(() => {
    const generateSessionId = () => {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };
    setSessionId(generateSessionId());
  }, []);

  // Function to capture frame from video and convert to base64
  const captureFrame = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      return null;
    }

    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Function to send frame to backend for detection
  const sendFrameForDetection = useCallback(async () => {
    // Run detection when camera is enabled and not already detecting
    if (!cameraEnabled || isDetecting) {
      return;
    }

    try {
      setIsDetecting(true);
      console.log('Sending frame for detection...');
      const imageBase64 = captureFrame();
      
      if (!imageBase64) {
        setIsDetecting(false);
        return;
      }

      // Send to backend API
      const response = await axios.post('http://localhost:8000/api/detections/both/', {
        image: imageBase64,
        session_id: sessionId
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Update state with results
      if (response.data.success) {
        console.log('Detection results:', response.data);
        if (response.data.posture && response.data.posture.posture_label) {
          setPostureLabel(response.data.posture.posture_label);
          setPostureConfidence(response.data.posture.confidence);
          console.log('Posture detected:', response.data.posture.posture_label);
        } else {
          // Clear posture if not detected
          setPostureLabel(null);
          setPostureConfidence(null);
        }
        if (response.data.faces !== undefined) {
          const faceCountValue = response.data.faces.face_count || 0;
          setFaceCount(faceCountValue);
          console.log('Face count:', faceCountValue);
        }
      }
    } catch (err) {
      console.error('Detection error:', err);
      console.error('Error details:', err.response?.data || err.message);
      // Don't show error to user for every failed detection, just log it
    } finally {
      setIsDetecting(false);
    }
  }, [cameraEnabled, isDetecting, sessionId]);

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
      
      // Note: Detection is already running continuously when camera is enabled
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
      
      // Note: Detection continues running when camera is enabled
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
      // Clear detection interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
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

  // Effect to start/stop continuous detection based on camera status
  useEffect(() => {
    // Start detection when camera is enabled and stream is ready
    if (cameraEnabled && streamReady && mediaInitialized) {
      console.log('Starting continuous detection...');
      
      // Clear any existing interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      // Start detection interval (every 1 second)
      detectionIntervalRef.current = setInterval(() => {
        sendFrameForDetection();
      }, 1000);
      
      // Also run detection immediately
      sendFrameForDetection();
      
      // Cleanup function
      return () => {
        if (detectionIntervalRef.current) {
          console.log('Stopping continuous detection...');
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
      };
    } else {
      // Stop detection if camera is disabled
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }
  }, [cameraEnabled, streamReady, mediaInitialized, sendFrameForDetection]);

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
        {/* Detection Summary */}
        {(postureLabel || (mediaInitialized && cameraEnabled)) && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '8px',
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {postureLabel && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '500' }}>Posture:</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: 'white',
                  background: postureLabel === 'appropriate' ? '#2ecc71' : 
                             postureLabel === 'cheating' ? '#ff4757' : 
                             '#ffa502'
                }}>
                  {postureLabel.toUpperCase()}
                </span>
              </div>
            )}
            {mediaInitialized && cameraEnabled && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '500' }}>Face Detection:</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: 'white',
                  background: faceCount === 0 ? '#95a5a6' :
                             faceCount > 1 ? '#ff4757' : 
                             '#2ecc71'
                }}>
                  {faceCount === 0 ? 'NO FACE' : 
                   faceCount === 1 ? 'SINGLE FACE ✓' : 
                   `${faceCount} FACES - WARNING!`}
                </span>
              </div>
            )}
          </div>
        )}
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
            {/* Detection results overlay - Posture */}
            {postureLabel && (
              <div className="detection-results-posture" style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: postureLabel === 'appropriate' ? 'rgba(46, 213, 115, 0.9)' : 
                           postureLabel === 'cheating' ? 'rgba(255, 71, 87, 0.9)' : 
                           'rgba(255, 165, 0, 0.9)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                zIndex: 10,
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className={`fa ${postureLabel === 'appropriate' ? 'fa-check-circle' : 
                               postureLabel === 'cheating' ? 'fa-exclamation-triangle' : 
                               'fa-shield-alt'}`} style={{ fontSize: '20px' }}></i>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '2px' }}>POSTURE DETECTED</div>
                  <div style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {postureLabel}
                  </div>
                  {postureConfidence && (
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                      Confidence: {(postureConfidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detection results overlay - Face Detection */}
            {mediaInitialized && cameraEnabled && (
              <div className="detection-results-faces" style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: faceCount === 0 ? 'rgba(149, 165, 166, 0.9)' :
                           faceCount > 1 ? 'rgba(255, 71, 87, 0.9)' : 
                           'rgba(46, 213, 115, 0.9)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                zIndex: 10,
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: faceCount > 1 ? 'pulse 2s infinite' : 'none'
              }}>
                <i className={`fa ${faceCount === 0 ? 'fa-user-slash' :
                               faceCount > 1 ? 'fa-exclamation-triangle' : 
                               'fa-user-check'}`} 
                   style={{ fontSize: '20px' }}></i>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '2px' }}>FACE DETECTION</div>
                  <div style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {faceCount === 0 ? 'No Face Detected' : 
                     faceCount === 1 ? 'Single Face ✓' : 
                     `${faceCount} Faces - Warning!`}
                  </div>
                  {faceCount > 1 && (
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', fontWeight: 'normal' }}>
                      Multiple faces detected - Possible cheating!
                    </div>
                  )}
                  {faceCount === 0 && (
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', fontWeight: 'normal' }}>
                      Please position yourself in front of camera
                    </div>
                  )}
                </div>
              </div>
            )}
            
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