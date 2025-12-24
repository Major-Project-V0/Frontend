import { useState } from 'react'
import './App.css'
import Login from './login.jsx'
import Interview from './interview.jsx';
import Navbar from './nav-bar.jsx';
import { Link, useNavigate } from 'react-router-dom';


function App() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate();

  const handleStartClick = () => {
    navigate('/choice'); // Redirect to choice  
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
          <button onClick={handleStartClick}>Start Practice Interview   <i class="fa fa-long-arrow-right" aria-hidden="true"></i></button>
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