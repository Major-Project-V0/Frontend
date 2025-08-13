import { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import './login.css'
import backgrnd from "./assets/images/login-bg.jpg"


function Login() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate(); // <-- Navigation hook

  const handleStartClick = () => {
  navigate('/interview'); // Redirect to interview route
  };

  return (
    <>

        <div className="form-container">
            <span className='title'>MockiT</span>
            <span className='sub-title'>Login to begin interview session</span>

            <div className="formbox">
                <form action="#">
                    E-mail: <br />
                    <input type="email" name="" id="" placeholder='Enter your fullname' className='writable'/> <br />
                    Password: <br />
                    <input type="password" name="" id="" placeholder='Enter your password' className='writable'/>
                    <br />
                    <input type="submit" value="Login" className='submit'/>
                </form>
            </div>
        </div>

    </>
  )
}

export default Login 
