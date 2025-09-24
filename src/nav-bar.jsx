import React from 'react';
import './nav-bar.css'; 
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav>
      <div className="logo">
        <span>MockiT</span>
      </div>

      <div className="nav-links">
        <ul>
          <li>Home</li>
          <li>Prepare</li>
          <li><Link to='/login' className='login'>Login</Link></li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
