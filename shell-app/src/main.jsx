import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AuthenticationWrapper from 'auth/AuthenticationWrapper';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    
        <BrowserRouter>
        <AuthenticationWrapper>
          <App />
        </AuthenticationWrapper>
        </BrowserRouter>
      
  </React.StrictMode>
);
