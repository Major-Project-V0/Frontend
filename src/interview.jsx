import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './interview.css'
import Navbar from './nav-bar.jsx';
import { saveUserResponse, processUserResponse } from './services/geminiService';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  
  // Speaker detection state
  const [speakerStatus, setSpeakerStatus] = useState(null); // 'single', 'multiple', or null
  const [speakerConfidence, setSpeakerConfidence] = useState(null);
  const [hasSpeech, setHasSpeech] = useState(false);
  
  // Emotion detection state
  const [dominantEmotion, setDominantEmotion] = useState(null);
  const [emotionProbabilities, setEmotionProbabilities] = useState(null);
  const [emotionConfidence, setEmotionConfidence] = useState(null);
  
  // Interview questions state
  const [questions, setQuestions] = useState([]);
  const [idealAnswers, setIdealAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionSubtitle, setQuestionSubtitle] = useState('');
  const [userAnswerSubtitle, setUserAnswerSubtitle] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState(null);
  
  // Speech recognition and synthesis refs
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const currentAnswerRef = useRef('');
  
  // Refs for video elements
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const detectionIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Audio processing refs
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const emotionCounterRef = useRef(0);

  // Check authentication on mount - redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      console.log('No token found, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Validate token format
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          // Check if token is expired
          if (payload.exp && payload.exp < Date.now() / 1000) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            navigate('/login');
            return;
          }
          // Token is valid
          return;
        } catch (e) {
          // Invalid payload
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
    } catch (e) {
      // Invalid format
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    
    // Token is invalid
    navigate('/login');
  }, [navigate]);

  // Generate session ID on mount
  useEffect(() => {
    const generateSessionId = () => {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };
    const storedSessionId = localStorage.getItem('questionSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      localStorage.setItem('questionSessionId', newSessionId);
    }
  }, []);

  // Load questions from localStorage on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const storedQuestions = localStorage.getItem('generatedQuestions');
        const storedCandidateInfo = localStorage.getItem('candidateInfo');
        const questionSessionId = localStorage.getItem('questionSessionId');
        
        if (storedQuestions) {
          const questionsData = JSON.parse(storedQuestions);
          
          // Load ideal answers from localStorage first
          const storedIdealAnswers = localStorage.getItem('idealAnswers');
          if (storedIdealAnswers) {
            try {
              const idealAnswersData = JSON.parse(storedIdealAnswers);
              setIdealAnswers(idealAnswersData);
            } catch (error) {
              console.error('Error parsing ideal answers:', error);
            }
          }
          
          // Check if questions are in new format (with question_id) or old format
          if (questionsData.length > 0 && questionsData[0].question_id) {
            setQuestions(questionsData);
          } else {
            // Old format - convert to new format
            const convertedQuestions = questionsData.map((q, idx) => ({
              question_id: `q_${idx}_${Date.now()}`,
              question: typeof q === 'string' ? q : q.question || ''
            }));
            setQuestions(convertedQuestions);
          }
          
          // Set first question
          if (questionsData.length > 0) {
            const firstQ = questionsData[0];
            setCurrentQuestion({
              question_id: firstQ.question_id || `q_0_${Date.now()}`,
              question: typeof firstQ === 'string' ? firstQ : firstQ.question || ''
            });
            setQuestionSubtitle(typeof firstQ === 'string' ? firstQ : firstQ.question || '');
          }
        }
        
        if (storedCandidateInfo) {
          const info = JSON.parse(storedCandidateInfo);
          setCandidateInfo(info);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
      }
    };
    
    loadQuestions();
  }, []);

  // Initialize Speech Recognition and Synthesis
  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript || interimTranscript;
        currentAnswerRef.current = fullTranscript;
        setUserAnswerSubtitle(fullTranscript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Don't stop on no-speech, just continue listening
          return;
        }
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        // Auto-restart if we're supposed to be listening
        if (isListening) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Could not restart recognition:', e);
            setIsListening(false);
          }
        }
      };
    }
    
    // Initialize Speech Synthesis and load voices
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
      
      // Load voices (some browsers need this)
      const loadVoices = () => {
        const voices = synthesisRef.current.getVoices();
        console.log('Available voices:', voices.map(v => v.name));
      };
      
      loadVoices();
      if (synthesisRef.current.onvoiceschanged !== undefined) {
        synthesisRef.current.onvoiceschanged = loadVoices;
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [isListening]);

  // Function to speak question using TTS with female voice
  const speakQuestion = useCallback((questionText) => {
    if (!synthesisRef.current || !questionText) return;
    
    // Cancel any ongoing speech
    synthesisRef.current.cancel();
    
    // Get available voices and select a female voice
    const voices = synthesisRef.current.getVoices();
    let selectedVoice = null;
    
    // Try to find a female voice (prefer English female voices)
    const femaleVoices = voices.filter(voice => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      return lang.includes('en') && (
        name.includes('female') || 
        name.includes('samantha') || 
        name.includes('karen') || 
        name.includes('susan') ||
        name.includes('zira') ||
        name.includes('hazel') ||
        name.includes('google uk english female') ||
        name.includes('google us english female') ||
        voice.gender === 'female'
      );
    });
    
    if (femaleVoices.length > 0) {
      // Prefer high-quality voices
      selectedVoice = femaleVoices.find(v => v.name.includes('premium')) || 
                      femaleVoices.find(v => v.name.includes('enhanced')) ||
                      femaleVoices[0];
    } else {
      // Fallback: try any English voice that sounds female
      selectedVoice = voices.find(v => 
        v.lang.toLowerCase().includes('en') && 
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha'))
      ) || voices.find(v => v.lang.toLowerCase().includes('en'));
    }
    
    const utterance = new SpeechSynthesisUtterance(questionText);
    utterance.rate = 0.85; // Slightly slower for sweet, clear speech
    utterance.pitch = 1.2; // Higher pitch for female voice
    utterance.volume = 1;
    utterance.lang = 'en-US';
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Using voice:', selectedVoice.name);
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      // Start listening after question is spoken
      setTimeout(() => {
        startListening();
      }, 500);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
    };
    
    synthesisRef.current.speak(utterance);
  }, []);

  // Function to start listening for user answer
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      currentAnswerRef.current = '';
      setUserAnswerSubtitle('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }, [isListening]);

  // Function to stop listening and save answer
  const stopListeningAndSave = useCallback(async () => {
    if (!recognitionRef.current || !isListening) return;
    
    recognitionRef.current.stop();
    setIsListening(false);
    
    const userAnswer = currentAnswerRef.current.trim();
    if (!userAnswer || !currentQuestion) return;
    
    // Find ideal answer for current question
    const idealAnswerData = idealAnswers.find(
      ans => ans.question_id === currentQuestion.question_id
    );
    
    // Save response to backend
    try {
      const result = await saveUserResponse({
        sessionId: sessionId,
        questionId: currentQuestion.question_id,
        questionText: currentQuestion.question,
        userAnswer: userAnswer,
        idealAnswer: idealAnswerData?.ideal_answer || null,
        alternativeAnswers: idealAnswerData?.alternative_answers || []
      });
      
      if (result.success) {
        console.log('Response saved successfully');
        
        // Move to next question
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < questions.length) {
          setCurrentQuestionIndex(nextIndex);
          setCurrentQuestion(questions[nextIndex]);
          setQuestionSubtitle(questions[nextIndex].question || '');
          setUserAnswerSubtitle('');
          
          // Speak next question after a short delay
          setTimeout(() => {
            speakQuestion(questions[nextIndex].question);
          }, 1000);
        } else {
          console.log('All questions completed');
          // Handle interview completion
        }
      }
    } catch (error) {
      console.error('Error saving response:', error);
    }
  }, [isListening, currentQuestion, currentQuestionIndex, questions, idealAnswers, sessionId, speakQuestion]);

  // Auto-speak question when it changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.question) {
      // Small delay before speaking
      const timer = setTimeout(() => {
        speakQuestion(currentQuestion.question);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, speakQuestion]);

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

  // Function to capture audio chunk using MediaRecorder (for speaker detection - shorter)
  const captureAudioChunk = useCallback(async () => {
    if (!streamRef.current || !micEnabled) {
      return null;
    }

    try {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks[0].enabled) {
        return null;
      }

      // Create a new MediaRecorder for this chunk
      const audioStream = new MediaStream([audioTracks[0]]);
      const recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      return new Promise((resolve) => {
        const chunks = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          
          reader.readAsDataURL(blob);
        };

        // Record for 0.5 seconds (for speaker detection)
        recorder.start();
        setTimeout(() => {
          recorder.stop();
        }, 500);
      });
    } catch (err) {
      console.error('Error capturing audio:', err);
      return null;
    }
  }, [micEnabled]);

  // Function to capture longer audio chunk for emotion detection (1.5 seconds)
  const captureAudioChunkForEmotion = useCallback(async () => {
    if (!streamRef.current || !micEnabled) {
      return null;
    }

    try {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks[0].enabled) {
        return null;
      }

      // Create a new MediaRecorder for this chunk
      const audioStream = new MediaStream([audioTracks[0]]);
      const recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      return new Promise((resolve) => {
        const chunks = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          
          reader.readAsDataURL(blob);
        };

        // Record for 1.5 seconds (for emotion detection - model needs 1.3s)
        recorder.start();
        setTimeout(() => {
          recorder.stop();
        }, 1500);
      });
    } catch (err) {
      console.error('Error capturing audio for emotion:', err);
      return null;
    }
  }, [micEnabled]);

  // Function to send audio chunk to backend for speaker detection
  const sendAudioForDetection = useCallback(async (audioBase64) => {
    if (!audioBase64 || !micEnabled) {
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/detections/speakers/`, {
        audio: audioBase64,
        session_id: sessionId,
        sampling_rate: 16000
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.success) {
        const result = response.data;
        console.log('Speaker detection result:', result);
        setHasSpeech(result.has_speech);
        
        if (result.has_speech) {
          setSpeakerStatus(result.is_multiple_speakers ? 'multiple' : 'single');
          setSpeakerConfidence(result.confidence);
        } else {
          setSpeakerStatus(null);
          setSpeakerConfidence(null);
        }
      }
    } catch (err) {
      console.error('Speaker detection error:', err);
      console.error('Error details:', err.response?.data || err.message);
      // Don't show error to user for every failed detection
    }
  }, [micEnabled, sessionId]);

  // Function to send audio chunk to backend for emotion detection
  const sendAudioForEmotionDetection = useCallback(async (audioBase64) => {
    if (!audioBase64 || !micEnabled) {
      return;
    }

    try {
      console.log('Sending audio for emotion detection...');
      const response = await axios.post(`${API_BASE_URL}/api/detections/emotion/`, {
        audio: audioBase64,
        session_id: sessionId,
        sampling_rate: 16000
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.success) {
        const result = response.data;
        console.log('Emotion detection result:', result);
        // Always update emotion state if we got a valid result from backend
        // Backend already filters low confidence results, so trust its output
        if (result.dominant_emotion) {
          console.log('✅ Setting emotion state:', result.dominant_emotion, 'confidence:', result.confidence);
          setDominantEmotion(result.dominant_emotion);
          setEmotionProbabilities(result.emotion_probabilities || {});
          setEmotionConfidence(result.confidence || 0);
        } else {
          console.log('No dominant emotion in result');
        }
      } else {
        console.log('Emotion detection API returned success: false');
      }
    } catch (err) {
      console.error('Emotion detection error:', err);
      console.error('Error details:', err.response?.data || err.message);
      // Don't show error to user for every failed detection
    }
  }, [micEnabled, sessionId]);

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
      const response = await axios.post(`${API_BASE_URL}/api/detections/both/`, {
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
      
      // Request microphone access first (for interviewee)
      let audioStream = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          }
        });
        console.log('Microphone access granted');
      } catch (audioErr) {
        console.error('Microphone access error:', audioErr);
        setError(`Microphone access error: ${audioErr.message}. Please allow microphone access to continue the interview.`);
        return;
      }
      
      // Request camera access
      let videoStream = null;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
        console.log('Camera access granted');
      } catch (videoErr) {
        console.warn('Camera access error:', videoErr);
        // Continue without camera if user denies
      }
      
      // Combine streams
      const tracks = [];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }
      if (videoStream) {
        tracks.push(...videoStream.getVideoTracks());
      }
      
      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;
      
      // Set states based on available tracks
      const hasAudio = audioStream !== null && audioStream.getAudioTracks().length > 0;
      const hasVideo = videoStream !== null && videoStream.getVideoTracks().length > 0;
      
      setMicEnabled(hasAudio);
      setCameraEnabled(hasVideo);
      setMediaInitialized(true);
      setError(null);
      
      // Log track states
      console.log('Video tracks:', combinedStream.getVideoTracks());
      console.log('Audio tracks:', combinedStream.getAudioTracks());
      console.log('Microphone enabled:', hasAudio);
      console.log('Camera enabled:', hasVideo);
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError(`Media access error: ${err.message}. Please allow camera and microphone access.`);
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
      // Clear detection intervals
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
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
      console.log('Starting continuous face and posture detection...');
      
      // Clear any existing interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      // Start detection interval (every 1 second)
      detectionIntervalRef.current = setInterval(() => {
        if (cameraEnabled && !isDetecting) {
          sendFrameForDetection();
        }
      }, 1000);
      
      // Also run detection immediately
      setTimeout(() => {
        if (cameraEnabled && !isDetecting) {
          sendFrameForDetection();
        }
      }, 500);
      
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
        console.log('Stopping detection - camera disabled or stream not ready');
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }
  }, [cameraEnabled, streamReady, mediaInitialized, isDetecting, sendFrameForDetection]);

  // Effect to start/stop continuous audio detection based on mic status
  useEffect(() => {
    // Start audio detection when mic is enabled and stream is ready
    if (micEnabled && streamReady && mediaInitialized) {
      console.log('Starting continuous audio detection...');
      
      // Clear any existing interval
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      
      // Reset emotion counter
      emotionCounterRef.current = 0;
      
      // Start audio detection interval (every 0.5 seconds for speaker, 1.5 seconds for emotion)
      audioIntervalRef.current = setInterval(async () => {
        if (!micEnabled) {
          return;
        }
        
        try {
          // Always capture short chunk for speaker detection
          const audioBase64 = await captureAudioChunk();
          if (audioBase64) {
            sendAudioForDetection(audioBase64);
          }
          
          // Capture longer chunk for emotion detection every 3rd iteration (every 1.5 seconds)
          emotionCounterRef.current++;
          if (emotionCounterRef.current >= 3) {
            emotionCounterRef.current = 0;
            const emotionAudioBase64 = await captureAudioChunkForEmotion();
            if (emotionAudioBase64) {
              sendAudioForEmotionDetection(emotionAudioBase64);
            }
          }
        } catch (error) {
          console.error('Error in audio detection interval:', error);
        }
      }, 500);
      
      // Cleanup function
      return () => {
        if (audioIntervalRef.current) {
          console.log('Stopping continuous audio detection...');
          clearInterval(audioIntervalRef.current);
          audioIntervalRef.current = null;
        }
      };
    } else {
      // Stop audio detection if mic is disabled
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      // Reset speaker and emotion status when mic is disabled
      setSpeakerStatus(null);
      setSpeakerConfidence(null);
      setHasSpeech(false);
      setDominantEmotion(null);
      setEmotionProbabilities(null);
      setEmotionConfidence(null);
    }
  }, [micEnabled, streamReady, mediaInitialized, captureAudioChunk, captureAudioChunkForEmotion, sendAudioForDetection, sendAudioForEmotionDetection]);

  console.log('Current state:', {
    mediaInitialized,
    cameraEnabled,
    micEnabled,
    streamReady,
    hasStream: !!streamRef.current,
    dominantEmotion,
    emotionConfidence
  });

  // Debug effect to log emotion state changes
  useEffect(() => {
    if (dominantEmotion) {
      console.log('✅ Emotion state updated - Displaying:', dominantEmotion, 'Confidence:', emotionConfidence);
    } else {
      console.log('❌ No emotion detected or cleared');
    }
  }, [dominantEmotion, emotionConfidence]);

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
            Question {currentQuestionIndex + 1} of {questions.length || 1}
          </div>
        </div>
        <div className="progress-bottom">
          <div className="bar"></div>
        </div>
        {/* Detection Summary */}
        {(postureLabel || (mediaInitialized && cameraEnabled) || (mediaInitialized && micEnabled && (speakerStatus !== null || dominantEmotion))) && (
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
            {mediaInitialized && micEnabled && speakerStatus !== null && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '500' }}>Speaker Detection:</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: 'white',
                  background: speakerStatus === 'multiple' ? '#ff4757' : 
                             speakerStatus === 'single' ? '#2ecc71' : 
                             '#95a5a6'
                }}>
                  {speakerStatus === 'multiple' ? '🚨 MULTIPLE SPEAKERS' : 
                   speakerStatus === 'single' ? '🟢 SINGLE SPEAKER' : 
                   '🔇 NO SPEECH'}
                </span>
              </div>
            )}
            {mediaInitialized && micEnabled && dominantEmotion && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '500' }}>Emotion:</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: 'white',
                  background: dominantEmotion === 'happy' ? '#2ecc71' :
                             dominantEmotion === 'angry' ? '#ff4757' :
                             dominantEmotion === 'sad' ? '#3498db' :
                             dominantEmotion === 'fear' ? '#9b59b6' :
                             dominantEmotion === 'surprise' ? '#f39c12' :
                             dominantEmotion === 'disgust' ? '#e67e22' :
                             dominantEmotion === 'neutral' ? '#7f8c8d' :
                             '#95a5a6'
                }}>
                  {dominantEmotion.toUpperCase()}
                  {emotionConfidence && ` (${(emotionConfidence * 100).toFixed(0)}%)`}
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
              {isSpeaking && <span className='speaking'>Speaking</span>}
            </div>
          </div>

          <div className="avatar-display">
            <div className="askquestion">
              <div>
                <i className={`fa fa-circle ${isSpeaking ? 'pulsing' : ''}`} aria-hidden="true"></i>
              </div>
              <div className="question-subtitle-container">
                {questionSubtitle && (
                  <div className="question-subtitle">
                    <p>{questionSubtitle}</p>
                  </div>
                )}
                {isSpeaking && (
                  <div className="speaking-indicator">
                    <span>AI Interviewer is speaking...</span>
                  </div>
                )}
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
            {/* User Answer Subtitle - Always show when listening or has answer */}
            {(isListening || userAnswerSubtitle) && (
              <div className="user-answer-subtitle-container">
                <div className="user-answer-subtitle">
                  <p>{userAnswerSubtitle || 'Listening for your answer...'}</p>
                </div>
                {isListening && (
                  <div className="listening-indicator">
                    <span>🎤 Listening... Speak now</span>
                  </div>
                )}
                {!isListening && userAnswerSubtitle && (
                  <button 
                    onClick={stopListeningAndSave}
                    className="save-answer-btn"
                    style={{
                      marginTop: '10px',
                      padding: '10px 20px',
                      background: '#2ecc71',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#27ae60'}
                    onMouseLeave={(e) => e.target.style.background = '#2ecc71'}
                  >
                    ✓ Save Answer & Next Question
                  </button>
                )}
              </div>
            )}
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

            {/* Detection results overlay - Emotion Detection */}
            {mediaInitialized && micEnabled && dominantEmotion && (
              <div className="detection-results-emotion" style={{
                position: 'absolute',
                bottom: speakerStatus !== null ? '180px' : '100px',
                right: '20px',
                background: dominantEmotion === 'happy' ? 'rgba(46, 213, 115, 0.9)' :
                           dominantEmotion === 'angry' ? 'rgba(255, 71, 87, 0.9)' :
                           dominantEmotion === 'sad' ? 'rgba(52, 152, 219, 0.9)' :
                           dominantEmotion === 'fear' ? 'rgba(155, 89, 182, 0.9)' :
                           dominantEmotion === 'surprise' ? 'rgba(243, 156, 18, 0.9)' :
                           dominantEmotion === 'disgust' ? 'rgba(230, 126, 34, 0.9)' :
                           dominantEmotion === 'neutral' ? 'rgba(127, 140, 141, 0.9)' :
                           'rgba(149, 165, 166, 0.9)',
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
                minWidth: '200px'
              }}>
                <i className={`fa ${
                  dominantEmotion === 'happy' ? 'fa-smile' :
                  dominantEmotion === 'angry' ? 'fa-angry' :
                  dominantEmotion === 'sad' ? 'fa-sad-tear' :
                  dominantEmotion === 'fear' ? 'fa-surprise' :
                  dominantEmotion === 'surprise' ? 'fa-surprise' :
                  dominantEmotion === 'disgust' ? 'fa-grimace' :
                  dominantEmotion === 'neutral' ? 'fa-meh' :
                  'fa-meh'
                }`} style={{ fontSize: '20px' }}></i>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '2px' }}>EMOTION DETECTED</div>
                  <div style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {dominantEmotion}
                  </div>
                  {emotionConfidence && (
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                      Confidence: {(emotionConfidence * 100).toFixed(1)}%
                    </div>
                  )}
                  {emotionProbabilities && (
                    <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '6px', maxHeight: '60px', overflowY: 'auto' }}>
                      {Object.entries(emotionProbabilities)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([emotion, prob]) => (
                          <div key={emotion} style={{ marginTop: '2px' }}>
                            {emotion}: {(prob * 100).toFixed(1)}%
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detection results overlay - Speaker Detection */}
            {mediaInitialized && micEnabled && speakerStatus !== null && (
              <div className="detection-results-speakers" style={{
                position: 'absolute',
                bottom: '100px',
                right: '20px',
                background: speakerStatus === 'multiple' ? 'rgba(255, 71, 87, 0.9)' :
                           speakerStatus === 'single' ? 'rgba(46, 213, 115, 0.9)' : 
                           'rgba(149, 165, 166, 0.9)',
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
                animation: speakerStatus === 'multiple' ? 'pulse 2s infinite' : 'none'
              }}>
                <i className={`fa ${speakerStatus === 'multiple' ? 'fa-exclamation-triangle' :
                               speakerStatus === 'single' ? 'fa-microphone' : 
                               'fa-microphone-slash'}`} 
                   style={{ fontSize: '20px' }}></i>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '2px' }}>SPEAKER DETECTION</div>
                  <div style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {speakerStatus === 'multiple' ? '🚨 Multiple Speakers!' : 
                     speakerStatus === 'single' ? '🟢 Single Speaker ✓' : 
                     '🔇 No Speech'}
                  </div>
                  {speakerStatus === 'multiple' && (
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', fontWeight: 'normal' }}>
                      Multiple voices detected - Possible cheating!
                      {speakerConfidence && (
                        <span> (Confidence: {(speakerConfidence * 100).toFixed(1)}%)</span>
                      )}
                    </div>
                  )}
                  {speakerStatus === 'single' && speakerConfidence && (
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', fontWeight: 'normal' }}>
                      Confidence: {(speakerConfidence * 100).toFixed(1)}%
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