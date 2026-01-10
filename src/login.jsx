// import { useState } from 'react'
// import { useNavigate } from 'react-router-dom';
// import './login.css'
// import backgrnd from "./assets/images/login-bg.jpg"


// function Login() {
//   const [count, setCount] = useState(0)
//   const navigate = useNavigate(); // <-- Navigation hook

//   const handleStartClick = () => {
//   navigate('/interview'); // Redirect to interview route
//   };

//   return (
//     <>

//         <div className="form-container">
//             <span className='title'>MockiT</span>
//             <span className='sub-title'>Login to begin interview session</span>

//             <div className="formbox">
//                 <form action="#">
//                     E-mail: <br />
//                     <input type="email" name="" id="" placeholder='Enter your fullname' className='writable'/> <br />
//                     Password: <br />
//                     <input type="password" name="" id="" placeholder='Enter your password' className='writable'/>
//                     <br />
//                     <input type="submit" value="Login" className='submit'/>
//                 </form>
//             </div>
//         </div>

//     </>
//   )
// }

// export default Login 


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './login.css';
import backgrnd from './assets/images/login-bg.jpg';

function Login() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (token && token.trim() !== '') {
        try {
          // Optional: Add token verification endpoint if available
          setIsAuthenticated(true);
        } catch (err) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };
    verifyToken();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/api/accounts/register/', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // After successful registration, automatically log in the user
      // by calling the login endpoint
      try {
        const loginResponse = await axios.post('http://localhost:8000/api/accounts/login/', {
          username: formData.username,
          password: formData.password
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const accessToken = loginResponse.data.access;
        const refreshToken = loginResponse.data.refresh;
        if (accessToken) {
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        setIsAuthenticated(true);
        // Notify navbar of auth change
        window.dispatchEvent(new Event('authChange'));
        navigate('/choice', { replace: true }); // Redirect to choice form first
      } catch (loginErr) {
        // Registration succeeded but auto-login failed
        setError('Registration successful. Please log in.');
        setIsLogin(true); // Switch to login form
      }
      
      setFormData({ username: '', email: '', password: '', password2: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/accounts/login/', {
        username: formData.username,
        password: formData.password
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // TokenObtainPairView returns 'access' and 'refresh' tokens
      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      }
      setFormData({ username: '', email: '', password: '', password2: '' });
      setIsAuthenticated(true);
      // Notify navbar of auth change
      window.dispatchEvent(new Event('authChange'));
      navigate('/choice', { replace: true }); // Redirect to choice form first
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/');
  };

  if (isLoading) {
    return <div className="form-container">Loading...</div>;
  }

  return (
    <div className="form-container" style={{ backgroundImage: `url(${backgrnd})` }}>
      {!isAuthenticated && (
        <>
          <span className="title">MockiT</span>
          <span className="sub-title">
            {isLogin ? 'Login to begin interview session' : 'Register to start your journey'}
          </span>
          <div className="formbox">
            {error && (
              <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
            )}
            <form action="#">
              {isLogin ? (
                <>
                  Username: <br />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username"
                    className="writable"
                    required
                  /> <br />
                  Password: <br />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="writable"
                    required
                  />
                </>
              ) : (
                <>
                  Username: <br />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username"
                    className="writable"
                    required
                  /> <br />
                  E-mail: <br />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="writable"
                    required
                  /> <br />
                  Password: <br />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="writable"
                    required
                  /> <br />
                  Confirm Password: <br />
                  <input
                    type="password"
                    name="password2"
                    value={formData.password2}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className="writable"
                    required
                  />
                </>
              )}
              <br />
              <input
                type="submit"
                value={loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
                className="submit"
                onClick={isLogin ? handleLogin : handleRegister}
                disabled={loading}
              />
            </form>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="submit"
            >
              {isLogin ? 'Do not have an account?' : 'Already have an account?'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Login;
