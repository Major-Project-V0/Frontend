import { useState, useEffect } from 'react'
import './App.css'
import Login from './login.jsx'
import Interview from './interview.jsx';
import Navbar from './nav-bar.jsx';
import { Link, useNavigate } from 'react-router-dom';


function App() {
  const [count, setCount] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate();

  // Check authentication status on mount and when it changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token && token.trim() !== '' && token !== 'null' && token !== 'undefined');
    };

    // Check on mount
    checkAuth();
    
    // Listen for auth changes (login/logout events)
    window.addEventListener('authChange', checkAuth);
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('authChange', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleStartClick = () => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const hasValidToken = token && token.trim() !== '' && token !== 'null' && token !== 'undefined';
    
    if (hasValidToken) {
      // User is logged in, go directly to form
      navigate('/choice');
    } else {
      // User is not logged in, redirect to login
      navigate('/login');
    }
  };

  return (
    <>

      {/* Nav-bar */}
        <Navbar /> {/*Navbar component call garna lai*/}

    

      {/* Content */}

      <div className="content-top">
        <span className='small'><i class="fa fa-certificate" aria-hidden="true"></i>AI powered interview practice</span>

        <span className='large'>Master your next <span className='interview'>interview</span></span>

        <span className='text'><b>Practice with our AI interviewer, get real-time feedback on your answers, body language, and voice tone. Build confidence and land your dream job.</b></span>

        <div className="button">
          <button onClick={handleStartClick}>
            {isAuthenticated ? (
              <>
                Start Practice Interview <i class="fa fa-long-arrow-right" aria-hidden="true"></i>
              </>
            ) : (
              <>
                Login to Start Interview <i class="fa fa-sign-in" aria-hidden="true"></i>
              </>
            )}
          </button>
          {isAuthenticated && (
            <div style={{ 
              marginTop: '10px', 
              fontSize: '14px', 
              color: '#2ecc71',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <i class="fa fa-check-circle" aria-hidden="true"></i>
              <span>You're logged in</span>
            </div>
          )}
        </div>
      </div>

      {/* Cards-- */}

      <div className='question'><span>Why choose MockiT?</span></div>

      <div className="card-container">
        <div className="card">

          <div className='icon'><i class="fa fa-comment" aria-hidden="true"></i></div>

          <span className='title'>Smart question generation</span>
          <span className='cont'>AI-powered questions tailored to your industry and role</span>
        </div>

        <div className="card">
          <div className='icon'><i class="fa fa-camera" aria-hidden="true"></i></div>

          <span className='title'>Body Language Analysis</span>
          <span className='cont'>Real-time feedback on posture, eye contact, and gestures</span>
        </div>

        <div className="card">
          <div className='icon'><i class="fa fa-pencil" aria-hidden="true"></i></div>

          <span className='title'>Answer Evaluation</span>
          <span className='cont'>Compare your responses with ideal answers and get scoring</span>
        </div>

        <div className="card">
          <div className='icon'><i class="fa fa-microphone" aria-hidden="true"></i></div>

          <span className='title'>Voice Emotion Detection</span>
          <span className='cont'>Analyze tone, pace, and confidence in your responses</span>
        </div>
      </div>


      {/* Footer */}

      <footer>
        <div className="f-left">
          <span className="logo">MockiT</span>
          <span>Kathmandu, Nepal</span>
          <span className='slogan'><i>Master your next interview effortlessly</i></span>

        </div>

        <div className="f-right">
          <span className="title">Developed by:</span>
          <ul>
            <li>Prayash Niraula</li>
            <li>Ranjit Adhikari</li>
            <li>Sarishma Neupane</li>
            <li>Sujit Adhikari</li>
          </ul>
        </div>
      </footer>
    </>
  )
}

export default App