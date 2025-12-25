import { useNavigate } from 'react-router-dom';
import Navbar from './nav-bar.jsx';
import './choice.css';

function Choice() {
  const navigate = useNavigate();

  const interviewOptions = [
    {
      id: 1,
      title: 'Python',
      description: 'Master Python programming concepts, data structures, algorithms, and best practices for technical interviews.',
      icon: 'fa-code'
    },
    {
      id: 2,
      title: 'Data Science',
      description: 'Practice data science interviews covering statistics, machine learning, data analysis, and problem-solving.',
      icon: 'fa-bar-chart'
    },
    {
      id: 3,
      title: 'DBMS',
      description: 'Prepare for database management system interviews with SQL queries, normalization, and database design questions.',
      icon: 'fa-database'
    },
    {
      id: 4,
      title: 'JavaScript',
      description: 'Excel in JavaScript interviews with questions on ES6+, closures, async programming, and modern frameworks.',
      icon: 'fa-file-code'
    },
    {
      id: 5,
      title: 'Machine Learning',
      description: 'Master ML concepts including algorithms, model evaluation, feature engineering, and deep learning fundamentals.',
      icon: 'fa-brain'
    },
    {
      id: 6,
      title: 'System Design',
      description: 'Practice designing scalable systems, distributed architectures, and handling high-traffic applications.',
      icon: 'fa-sitemap'
    }
  ];

  const handleCardClick = (option) => {
    // Check if user is logged in - verify token exists and is not empty
    const token = localStorage.getItem('token');
    
    // More robust check: token must exist, not be null, not be undefined, and not be empty string
    const isAuthenticated = token !== null && token !== undefined && token.trim() !== '';
    
    console.log('Authentication check:', { 
      token, 
      isAuthenticated, 
      tokenType: typeof token,
      tokenLength: token?.length 
    });
    
    if (isAuthenticated) {
      console.log('User is logged in, navigating to interview');
      // User is logged in, navigate to interview
      navigate('/interview');
    } else {
      console.log('User is NOT logged in, navigating to login');
      // User is not logged in, navigate to login
      navigate('/login');
    }
  };

  return (
    <>
      {/* Nav-bar */}
      <Navbar />

      {/* Content */}
      <div className="choice-container">
        <div className="choice-header">
          <h1 className="choice-title">Choose Your Interview Topic</h1>
          <p className="choice-subtitle">Select a domain to practice and improve your interview skills</p>
        </div>

        <div className="choice-cards">
          {interviewOptions.map((option) => (
            <div 
              key={option.id} 
              className="choice-card"
              onClick={() => handleCardClick(option)}
            >
              <div className="card-icon">
                <i className={`fa ${option.icon}`} aria-hidden="true"></i>
              </div>
              <h2 className="card-title">{option.title}</h2>
              <p className="card-description">{option.description}</p>
              <div className="card-arrow">
                <i className="fa fa-arrow-right" aria-hidden="true"></i>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Choice;