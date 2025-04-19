// auth-app/src/App.jsx
//
// This module only exposes authentication components along with a wrapper
// that provides Apollo Client (and optionally authentication context).
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './LoginComponent';
import Register from './RegisterComponent';
import AuthenticationWrapper from './AuthenticationWrapper';

export { Login, Register, AuthenticationWrapper };

// Optionally, if the shell app wants to render a default component for debugging,
// you might still export a default App like below:
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;
