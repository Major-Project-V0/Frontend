import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Interview from './interview.jsx';
import Login from './login.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
